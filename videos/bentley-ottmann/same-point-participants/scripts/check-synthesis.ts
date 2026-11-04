import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import {
  validateWords,
  type WordBoundary,
} from "../../../shared/speech/timing.ts";

// Local evidence only: no service requests, synthesis retries or timing repair.
const root = new URL("../out/synthesis-39f9c1e2fc2d/", import.meta.url);
const read = (name: string) =>
  JSON.parse(readFileSync(new URL(name, root), "utf8"));
type Entry = {
  id: string;
  audioFile: string;
  state: string;
  fingerprint: string;
  audioSha256: string;
  duration: number;
  wordEvents: number;
};
const manifest: {
  planSha256: string;
  narrationSha256: string;
  voice: string;
  outputFormat: string;
  entries: Entry[];
} = read("manifest.json");
const plan: {
  narrationSha256: string;
  documents: {
    id: string;
    audioFile: string;
    fingerprint: string;
    text: string;
  }[];
} = read("approved-plan.json");
assert.equal(
  audioSha256(fileURLToPath(new URL("approved-plan.json", root))),
  manifest.planSha256,
);
assert.equal(manifest.narrationSha256, plan.narrationSha256);
assert.equal(manifest.entries.length, 57);
assert.equal(plan.documents.length, 57);
const files = readdirSync(root);
assert.equal(files.filter((file) => file.endsWith(".wav")).length, 57);
assert.equal(
  files.filter((file) => file.endsWith(".response.json")).length,
  57,
);
const entries = manifest.entries.map((entry, index) => {
  const document = plan.documents[index];
  const response: {
    fingerprint: string;
    audioSha256: string;
    words: WordBoundary[];
  } = read(`${entry.id}.response.json`);
  assert.equal(entry.state, "complete");
  assert.equal(entry.id, document.id);
  assert.equal(entry.audioFile, document.audioFile);
  assert.equal(entry.fingerprint, document.fingerprint);
  assert.equal(
    entry.audioSha256,
    audioSha256(fileURLToPath(new URL(entry.audioFile, root))),
  );
  assert.equal(response.audioSha256, entry.audioSha256);
  assert.equal(response.fingerprint, entry.fingerprint);
  assert.equal(response.words.length, entry.wordEvents);
  let timingError: string | null = null;
  try {
    validateWords({
      duration: entry.duration,
      words: response.words,
      speech: document.text,
      voice: manifest.voice,
      fingerprint: entry.fingerprint,
    });
  } catch (error) {
    timingError = error instanceof Error ? error.message : String(error);
  }
  return { ...entry, timingError };
});
const summary = {
  planSha256: manifest.planSha256,
  narrationSha256: manifest.narrationSha256,
  audioSources: entries.length,
  currentAudioHashesVerified: true,
  formatDecodeAndDurationChecks: "verified during synthesis; hashes unchanged",
  originalAudioSeconds: Number(
    entries.reduce((sum, entry) => sum + entry.duration, 0).toFixed(2),
  ),
  wordEvents: entries.reduce((sum, entry) => sum + entry.wordEvents, 0),
  validWordTimings: entries.filter((entry) => entry.timingError === null)
    .length,
  invalidWordTimings: entries.filter((entry) => entry.timingError !== null)
    .length,
  recognitionAssessmentAndListening: "not performed",
  timingReadyForAdoption: entries.every((entry) => entry.timingError === null),
};
if (process.argv.includes("--write-report"))
  writeFileSync(
    new URL("source-check.json", root),
    JSON.stringify({ ...summary, entries }, null, 2) + "\n",
    { flag: "wx" },
  );
console.log(JSON.stringify(summary, null, 2));
if (!summary.timingReadyForAdoption) process.exitCode = 1;
