import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import {
  audioSha256,
  decodeAudio,
  measureAudio,
  verifyPcmSource,
} from "../../../shared/speech/audio.ts";
import { applySentencePauses } from "../../../shared/speech/sentence-pauses.ts";
import { shots } from "../src/storyboard.ts";
import speech from "../src/speech-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };

// This one-shot entry consumes only the plan explicitly approved in chat.
const approvedPlanSha256 =
  "39f9c1e2fc2ddfbdf890b3c4f5f189c62694eabe590a8c505a0b65aa56641a45";
const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const approvedBytes = readFileSync(
  new URL("../out/narration-plan.json", import.meta.url),
);
if (sha256(approvedBytes) !== approvedPlanSha256)
  throw Error("Approved request plan changed");
// The existing planner owns the complete source, pause and spelling checks.
const currentBytes = execFileSync(process.execPath, [
  fileURLToPath(new URL("./plan-narration.ts", import.meta.url)),
]);
if (!currentBytes.equals(approvedBytes))
  throw Error("Current requests differ from approved plan");
type Document = {
  id: keyof typeof speech;
  text: string;
  ssml: string;
  fingerprint: string;
  audioFile: string;
};
const plan: {
  voice: string;
  outputFormat: string;
  narrationSha256: string;
  documents: Document[];
} = JSON.parse(approvedBytes.toString());
const { buildSpeechDocument, synthesize } = createSpeechTools(sdk, {
  voice: plan.voice,
  commas: "document",
  fingerprint: true,
});
const inputs = shots.map((shot, index) => {
  const document = plan.documents[index];
  if (document.id !== shot.id || document.audioFile !== `${shot.id}.wav`)
    throw Error("Approved request order or destination changed");
  const parts = applySentencePauses(
    shot.captions.join(""),
    speech[document.id],
    document.text,
    sentences[document.id],
  );
  const actual = buildSpeechDocument(parts, shot.id);
  if (
    actual.text !== document.text ||
    actual.ssml !== document.ssml ||
    actual.fingerprint !== document.fingerprint
  )
    throw Error(`${shot.id}: synthesis input differs from approval`);
  return parts;
});
if (inputs.length !== 57 || plan.documents.length !== 57)
  throw Error("Expected exactly 57 approved requests");

if (!process.argv.includes(`--execute-approved-plan=${approvedPlanSha256}`)) {
  console.log(
    JSON.stringify({
      mode: "dry-run",
      planSha256: approvedPlanSha256,
      requests: inputs.length,
      voice: plan.voice,
      outputFormat: plan.outputFormat,
      concurrency: 1,
      automaticRetries: 0,
      serviceCalls: 0,
    }),
  );
} else {
  // Support the configured credential names without logging their values.
  const key = process.env.AZURE_SPEECH_KEY ?? process.env.SPEECH_KEY;
  const endpoint =
    process.env.AZURE_SPEECH_ENDPOINT ?? process.env.SPEECH_ENDPOINT;
  if (!key || !endpoint)
    throw Error("Configured Speech credential or endpoint unavailable");
  process.env.AZURE_SPEECH_KEY = key;
  process.env.AZURE_SPEECH_ENDPOINT = endpoint;
  for (const command of ["ffmpeg", "ffprobe"])
    execFileSync(command, ["-version"], { stdio: "ignore" });
  const root = new URL("../out/synthesis-39f9c1e2fc2d/", import.meta.url);
  // An existing run must never be retried or overwritten automatically.
  mkdirSync(root);
  writeFileSync(new URL("approved-plan.json", root), approvedBytes, {
    flag: "wx",
  });
  type Entry = {
    id: string;
    audioFile: string;
    fingerprint: string;
    state: "planned" | "started" | "complete" | "uncertain";
    audioSha256?: string;
    duration?: number;
    wordEvents?: number;
    error?: string;
  };
  const entries: Entry[] = plan.documents.map((document) => ({
    id: document.id,
    audioFile: document.audioFile,
    fingerprint: document.fingerprint,
    state: "planned",
  }));
  const save = () =>
    writeFileSync(
      new URL("manifest.json", root),
      JSON.stringify(
        {
          planSha256: approvedPlanSha256,
          narrationSha256: plan.narrationSha256,
          voice: plan.voice,
          outputFormat: plan.outputFormat,
          concurrency: 1,
          automaticRetries: 0,
          entries,
        },
        null,
        2,
      ) + "\n",
    );
  save();
  let lastStart = 0;
  for (const [index, entry] of entries.entries()) {
    const wait = Math.max(0, lastStart + 3200 - Date.now());
    if (wait) await new Promise((done) => setTimeout(done, wait));
    const destination = fileURLToPath(new URL(entry.audioFile, root));
    entry.state = "started";
    save();
    lastStart = Date.now();
    console.log(`${entry.id}: request ${index + 1}/57 started`);
    try {
      const words = await synthesize(inputs[index], destination, {
        requireWordBoundaries: false,
        exclusive: true,
      });
      entry.audioSha256 = audioSha256(destination);
      entry.wordEvents = words.length;
      writeFileSync(
        new URL(`${entry.id}.response.json`, root),
        JSON.stringify(
          {
            id: entry.id,
            fingerprint: entry.fingerprint,
            audioSha256: entry.audioSha256,
            words,
            timingSource: "azure-synthesis-word-boundary",
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
      verifyPcmSource(destination);
      decodeAudio(destination);
      entry.duration = measureAudio(destination);
      if (!Number.isFinite(entry.duration) || entry.duration <= 0)
        throw Error("Invalid measured audio duration");
      entry.state = "complete";
      save();
      console.log(
        `${entry.id}: saved original WAV; ${entry.duration}s; ${words.length} word events`,
      );
    } catch {
      entry.state = "uncertain";
      entry.error = "SYNTHESIS_OR_LOCAL_CHECK_FAILED_NO_RETRY";
      save();
      throw Error(`${entry.id}: stopped; no retry; staging retained`);
    }
  }
  console.log(
    "Saved 57 original WAVs; no recognition/assessment or publication",
  );
}
