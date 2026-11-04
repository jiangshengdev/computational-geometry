import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import type { AudioTiming } from "../../../shared/speech/timing.ts";

const source = new URL("../out/synthesis-39f9c1e2fc2d/", import.meta.url);
const root = new URL("../out/assessment-39f9c1e2fc2d/", import.meta.url);
const parse = (url: URL) => JSON.parse(readFileSync(url, "utf8"));
const approvedBytes = readFileSync(new URL("approved-plan.json", source));
const synthesisPlanSha256 =
  "39f9c1e2fc2ddfbdf890b3c4f5f189c62694eabe590a8c505a0b65aa56641a45";
const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
assert.equal(hash(approvedBytes), synthesisPlanSha256);
assert(
  execFileSync(process.execPath, [
    fileURLToPath(new URL("./plan-narration.ts", import.meta.url)),
  ]).equals(approvedBytes),
  "Current speech differs from reviewed synthesis plan",
);
const synthesis = JSON.parse(approvedBytes.toString()) as {
  voice: string;
  outputFormat: string;
  narrationSha256: string;
  documents: {
    id: string;
    text: string;
    fingerprint: string;
    audioFile: string;
  }[];
};
const sourceManifest = parse(new URL("manifest.json", source));
const requests = synthesis.documents.map((document, index) => {
  const entry = sourceManifest.entries[index];
  assert.equal(entry.id, document.id);
  assert.equal(entry.state, "complete");
  assert.equal(entry.fingerprint, document.fingerprint);
  assert.equal(
    audioSha256(fileURLToPath(new URL(document.audioFile, source))),
    entry.audioSha256,
  );
  assert(entry.duration > 0 && entry.duration < 30);
  return {
    id: document.id,
    audioFile: document.audioFile,
    audioSha256: entry.audioSha256 as string,
    audioSeconds: entry.duration as number,
    referenceText: document.text,
    synthesisFingerprint: document.fingerprint,
  };
});
assert.equal(requests.length, 57);
const plan = {
  synthesisPlanSha256,
  narrationSha256: synthesis.narrationSha256,
  operation: "combined recognition and word-level pronunciation assessment",
  language: "zh-CN",
  gradingSystem: "HundredMark",
  granularity: "Word",
  enableMiscue: true,
  requestCount: requests.length,
  concurrency: 1,
  automaticRetries: 0,
  synthesisRequests: 0,
  totalAudioSeconds: Number(
    requests.reduce((sum, request) => sum + request.audioSeconds, 0).toFixed(2),
  ),
  media:
    "complete recognition copies; original source WAV unchanged; no rate changes",
  requests,
};
const planBytes = JSON.stringify(plan, null, 2) + "\n";
const planSha256 = hash(planBytes);
if (process.argv.includes("--write-plan")) {
  mkdirSync(root);
  writeFileSync(new URL("plan.json", root), planBytes, { flag: "wx" });
}
if (!process.argv.includes(`--execute-plan=${planSha256}`)) {
  console.log(
    JSON.stringify(
      { ...plan, requests: undefined, planSha256, serviceCalls: 0 },
      null,
      2,
    ),
  );
} else {
  assert.equal(readFileSync(new URL("plan.json", root), "utf8"), planBytes);
  const key = process.env.AZURE_SPEECH_KEY ?? process.env.SPEECH_KEY;
  const endpoint =
    process.env.AZURE_SPEECH_ENDPOINT ?? process.env.SPEECH_ENDPOINT;
  if (!key || !endpoint)
    throw Error("Configured Speech credential unavailable");
  const url = new URL(endpoint);
  assert(
    url.protocol === "https:" && !url.username && !url.password && !url.search,
  );
  process.env.AZURE_SPEECH_KEY = key;
  process.env.AZURE_SPEECH_ENDPOINT = endpoint;
  const run = new URL("run/", root);
  mkdirSync(run);
  const { alignAudio } = createAlignmentTools(sdk, {
    allowReviewedPronunciation: false,
    deferPronunciationReview: true,
  });
  type Entry = {
    id: string;
    audioSha256: string;
    fingerprint: string;
    state: "planned" | "started" | "complete" | "uncertain";
    responseSha256?: string;
    alignmentError?: string;
  };
  const entries: Entry[] = requests.map((request) => ({
    id: request.id,
    audioSha256: request.audioSha256,
    fingerprint: request.synthesisFingerprint,
    state: "planned",
  }));
  const save = () =>
    writeFileSync(
      new URL("manifest.json", run),
      JSON.stringify({ planSha256, entries }, null, 2) + "\n",
    );
  save();
  let lastStart = 0;
  for (const [index, request] of requests.entries()) {
    const entry = entries[index];
    const local = new URL(request.audioFile, run);
    copyFileSync(
      new URL(request.audioFile, source),
      local,
      constants.COPYFILE_EXCL,
    );
    const response = parse(new URL(`${request.id}.response.json`, source));
    assert.equal(response.audioSha256, request.audioSha256);
    const audio: AudioTiming = {
      audioFile: request.audioFile,
      outputFormat: synthesis.outputFormat,
      audioSha256: request.audioSha256,
      duration: request.audioSeconds,
      words: response.words,
      speech: request.referenceText,
      voice: synthesis.voice,
      fingerprint: request.synthesisFingerprint,
    };
    const wait = Math.max(0, lastStart + 3200 - Date.now());
    if (wait) await new Promise((done) => setTimeout(done, wait));
    entry.state = "started";
    save();
    lastStart = Date.now();
    console.log(
      `${request.id}: assessment ${index + 1}/${requests.length} started`,
    );
    try {
      const aligned = await alignAudio(audio, fileURLToPath(local));
      writeFileSync(
        new URL(`${request.id}.timing.json`, run),
        JSON.stringify(aligned, null, 2) + "\n",
        { flag: "wx" },
      );
    } catch (error) {
      entry.alignmentError =
        error instanceof Error ? error.message : "Alignment failed";
    }
    const responseFile = new URL(`${request.audioFile}.assessment.json`, run);
    const analysis = existsSync(responseFile) ? parse(responseFile) : null;
    if (
      analysis?.RecognitionStatus !== "Success" ||
      !analysis.NBest?.[0]?.Words?.length
    ) {
      entry.state = "uncertain";
      // Keep transport diagnostics out of the manifest and terminal.
      entry.alignmentError = "ASSESSMENT_FAILED_NO_RETRY";
      save();
      throw Error(
        `${request.id}: stopped; no retry; existing responses retained`,
      );
    }
    assert.equal(audioSha256(fileURLToPath(local)), request.audioSha256);
    entry.responseSha256 = audioSha256(fileURLToPath(responseFile));
    entry.state = "complete";
    save();
    const flags = analysis.NBest[0].Words.filter(
      (word: { PronunciationAssessment: { ErrorType: string } }) =>
        word.PronunciationAssessment.ErrorType !== "None",
    );
    console.log(
      `${request.id}: response saved; ${flags.length} automatic flags; timing ${entry.alignmentError ? "requires review" : "validated"}`,
    );
  }
  console.log(
    "57 combined recognition/assessment responses saved; no synthesis or retries",
  );
}
