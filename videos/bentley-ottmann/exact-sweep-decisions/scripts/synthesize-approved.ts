import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { plannedDocuments, voice } from "./planned-documents.ts";
import {
  verifyPcmSource,
  decodeAudio,
  measureAudio,
  audioSha256,
} from "../../../shared/speech/audio.ts";

const approvedPlanSha256 =
  "6eb84c2bf3a69ff4c4bab2f07da12d95ce182e9fca6015dc29ad63bf46560712";
const planBytes = readFileSync(
  new URL("../out/narration-plan.json", import.meta.url),
);
if (createHash("sha256").update(planBytes).digest("hex") !== approvedPlanSha256)
  throw Error("Approved request plan changed");
const approved = JSON.parse(planBytes.toString());
const documents = plannedDocuments();
if (JSON.stringify(documents) !== JSON.stringify(approved.documents))
  throw Error("Current requests differ from approved plan");
if (!process.argv.includes(`--execute-approved-plan=${approvedPlanSha256}`)) {
  console.log(
    JSON.stringify({
      mode: "dry-run",
      requests: documents.length,
      voice,
      outputFormat: approved.outputFormat,
      planSha256: approvedPlanSha256,
      serviceCalls: 0,
    }),
  );
} else {
  // Read credentials only inside the explicitly approved execution path.
  const key = process.env.SPEECH_KEY;
  const endpoint = process.env.SPEECH_ENDPOINT;
  if (!key || !endpoint)
    throw Error("Configured Speech credential or endpoint unavailable");
  const url = new URL(endpoint);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "eastasia.api.cognitive.microsoft.com" ||
    url.username ||
    url.password ||
    url.search
  )
    throw Error("Speech endpoint differs from reviewed route");
  url.protocol = "wss:";
  url.hostname = "eastasia.tts.speech.microsoft.com";
  url.pathname = "/cognitiveservices/websocket/v1";
  const root = resolve(
    new URL("../out/synthesis-6eb84c2bf3a6/", import.meta.url).pathname,
  );
  mkdirSync(root, { recursive: true });
  const manifestPath = join(root, "manifest.json");
  type Entry = {
    id: string;
    fingerprint: string;
    state: "planned" | "started" | "complete" | "failed" | "uncertain";
    audioSha256?: string;
    duration?: number;
    wordEvents?: number;
    error?: string;
  };
  type Manifest = {
    planSha256: string;
    voice: string;
    outputFormat: string;
    entries: Entry[];
  };
  const manifest: Manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : {
        planSha256: approvedPlanSha256,
        voice,
        outputFormat: approved.outputFormat,
        entries: documents.map((d) => ({
          id: d.id,
          fingerprint: d.fingerprint,
          state: "planned",
        })),
      };
  if (
    manifest.planSha256 !== approvedPlanSha256 ||
    manifest.voice !== voice ||
    manifest.entries.length !== 50 ||
    manifest.entries.some(
      (e, i) =>
        e.id !== documents[i].id || e.fingerprint !== documents[i].fingerprint,
    )
  )
    throw Error("Existing staging does not match approved requests");
  const save = () =>
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  save();
  let lastStart = 0;
  for (const [index, document] of documents.entries()) {
    const entry = manifest.entries[index];
    const destination = join(root, document.audioFile);
    if (entry.state === "complete") {
      if (
        !existsSync(destination) ||
        entry.audioSha256 !== audioSha256(destination)
      )
        throw Error(
          `${entry.id}: completed source missing or changed; do not resynthesize`,
        );
      console.log(`${entry.id}: reuse completed source; no request`);
      continue;
    }
    if (entry.state !== "planned" || existsSync(destination))
      throw Error(
        `${entry.id}: attempted or uncertain request; no automatic retry`,
      );
    const wait = Math.max(0, lastStart + 3200 - Date.now());
    if (wait) await new Promise((done) => setTimeout(done, wait));
    const config = sdk.SpeechConfig.fromEndpoint(url, key);
    const proxy = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
    if (proxy) {
      const p = new URL(proxy);
      config.setProxy(
        p.hostname,
        Number(p.port || 80),
        decodeURIComponent(p.username),
        decodeURIComponent(p.password),
      );
    }
    config.speechSynthesisVoiceName = voice;
    config.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Riff48Khz16BitMonoPcm;
    config.setProperty(
      sdk.PropertyId.SpeechServiceResponse_RequestWordBoundary,
      "true",
    );
    const synthesizer = new sdk.SpeechSynthesizer(config, null);
    const events: {
      text: string;
      audioOffset: number;
      duration: number;
      textOffset: number;
      wordLength: number;
    }[] = [];
    synthesizer.wordBoundary = (_, event) =>
      events.push({
        text: event.text,
        audioOffset: event.audioOffset,
        duration: event.duration,
        textOffset: event.textOffset,
        wordLength: event.wordLength,
      });
    entry.state = "started";
    save();
    lastStart = Date.now();
    console.log(`${entry.id}: request ${index + 1}/50 started`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await new Promise<sdk.SpeechSynthesisResult>(
        (success, failure) => {
          timer = setTimeout(
            () => failure(Error("SYNTHESIS_TIMEOUT_UNCERTAIN")),
            240000,
          );
          synthesizer.speakSsmlAsync(document.ssml, success, () =>
            failure(Error("SDK_TRANSPORT_FAILURE_UNCERTAIN")),
          );
        },
      );
      if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
        const cancellation = sdk.CancellationDetails.fromResult(result);
        // Retain only numeric codes, never raw error details or request headers.
        entry.state = "failed";
        entry.error = `SERVICE_REJECTED_REASON_${result.reason}_CODE_${cancellation.ErrorCode}`;
        save();
        throw Error(entry.error);
      }
      // The shared synthesizer rejects before writing when no word events arrive.
      // This adapter preserves each successful raw WAV first; absent word events
      // require a later authorized alignment, never another synthesis request.
      writeFileSync(destination, Buffer.from(result.audioData), { flag: "wx" });
      writeFileSync(
        join(root, `${entry.id}.response.json`),
        JSON.stringify(
          {
            id: entry.id,
            resultId: result.resultId,
            reason: result.reason,
            audioDurationTicks: result.audioDuration,
            fingerprint: document.fingerprint,
            rawWordEvents: events,
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
      verifyPcmSource(destination);
      decodeAudio(destination);
      entry.audioSha256 = audioSha256(destination);
      entry.duration = measureAudio(destination);
      entry.wordEvents = events.length;
      entry.state = "complete";
      save();
      console.log(
        `${entry.id}: saved original WAV; ${entry.duration}s; ${events.length} word events`,
      );
    } catch (error) {
      if (entry.state === "started") {
        entry.state = "uncertain";
        entry.error =
          error instanceof Error &&
          /^(SYNTHESIS_TIMEOUT_UNCERTAIN|SDK_TRANSPORT_FAILURE_UNCERTAIN)$/.test(
            error.message,
          )
            ? error.message
            : "LOCAL_CHECK_OR_SAVE_FAILED_AFTER_REQUEST";
        save();
      }
      throw Error(
        `${entry.id}: stopped (${entry.error ?? "source verification failed"}); no retry; staging retained`,
      );
    } finally {
      clearTimeout(timer);
      synthesizer.close();
    }
  }
  console.log(
    `Saved 50 original WAVs in ${root}; no recognition/assessment requests or publication`,
  );
}
