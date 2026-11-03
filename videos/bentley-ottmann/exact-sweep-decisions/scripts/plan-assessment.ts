import { readFileSync } from "node:fs";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import { plannedDocuments } from "./planned-documents.ts";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Preparation only. No credential access, SpeechConfig, recognizer or requests.
const root = fileURLToPath(
  new URL("../out/synthesis-6eb84c2bf3a6/", import.meta.url),
);
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const documents = plannedDocuments();
const requests = documents.map((document) => {
  const entry = manifest.entries.find(
    (candidate: { id: string }) => candidate.id === document.id,
  );
  if (
    entry?.state !== "complete" ||
    entry.fingerprint !== document.fingerprint ||
    entry.audioSha256 !== audioSha256(join(root, document.audioFile))
  )
    throw Error(`${document.id}: source changed or unavailable`);
  if (entry.duration > 30)
    throw Error(`${document.id}: requires a separately reviewed chunk plan`);
  return {
    id: document.id,
    audioFile: document.audioFile,
    audioSha256: entry.audioSha256,
    audioSeconds: entry.duration,
    referenceText: document.text,
    synthesisFingerprint: document.fingerprint,
  };
});
console.log(
  JSON.stringify(
    {
      mode: "plan-only",
      assessmentAuthorized: false,
      target:
        "wss://eastasia.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1",
      operation: "recognizeOnceAsync with word-level pronunciation assessment",
      language: "zh-CN",
      gradingSystem: "HundredMark",
      granularity: "Word",
      enableMiscue: true,
      concurrency: 1,
      automaticRetries: 0,
      requestCount: requests.length,
      combinedRecognitionAndAssessment: true,
      separateSynthesisRequests: 0,
      totalAudioSeconds: Number(
        requests.reduce((n, r) => n + r.audioSeconds, 0).toFixed(2),
      ),
      longestAudioSeconds: Math.max(...requests.map((r) => r.audioSeconds)),
      media:
        "complete original 48 kHz/16 bit/mono WAV; no cuts or rate changes",
      note: "Local plan only; recognition/assessment requires separate explicit approval. No service invoice or listening acceptance is inferred.",
      requests,
    },
    null,
    2,
  ),
);
