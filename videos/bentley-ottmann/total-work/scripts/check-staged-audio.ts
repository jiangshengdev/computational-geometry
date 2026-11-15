import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  audioSha256,
  decodeAudio,
  verifyPcmSource,
  measureAudio,
} from "../../../shared/speech/audio.ts";
import { currentNarrationPlan } from "./narration-plan.ts";
const args = process.argv.slice(2);
assert(args.every((a) => a.startsWith("--staging=") || a === "--decode"));
assert.equal(args.filter((a) => a.startsWith("--staging=")).length, 1);
const root = resolve(args.find((a) => a.startsWith("--staging="))!.slice(10));
const read = (name: string) =>
  JSON.parse(readFileSync(join(root, name), "utf8"));
const plan = currentNarrationPlan();
assert.deepEqual(read("request-plan.json"), plan);
const manifest = read("manifest.json");
const assessment = read("assessment-manifest.json");
assert.equal(
  manifest.planSha256,
  createHash("sha256")
    .update(readFileSync(join(root, "request-plan.json")))
    .digest("hex"),
);
assert.equal(assessment.planSha256, manifest.planSha256);
assert.equal(manifest.published, false);
assert.equal(assessment.published, false);
assert.equal(manifest.requests.length, plan.requests);
assert.equal(assessment.requests.length, plan.requests);
const totals = { Omission: 0, Insertion: 0, Mispronunciation: 0 };
const clips = plan.documents.map((doc) => {
  const file = join(root, doc.audioFile);
  const audio = read(`${doc.id}.json`);
  const request = manifest.requests.find(
    (r: { id: string }) => r.id === doc.id,
  );
  const assessed = assessment.requests.find(
    (r: { id: string }) => r.id === doc.id,
  );
  assert.equal(request.status, "synthesized-and-decoded");
  assert.equal(request.fingerprint, doc.fingerprint);
  assert.match(assessed.status, /^assessed-timing-(available|needs-review)$/);
  assert.equal(audio.fingerprint, doc.fingerprint);
  assert.equal(audio.speech, doc.text);
  assert.equal(audio.voice, plan.voice);
  assert.equal(audio.outputFormat, plan.outputFormat);
  assert.equal(audio.audioFile, doc.audioFile);
  const sha256 = audioSha256(file);
  assert.equal(audio.audioSha256, sha256);
  assert.equal(assessed.audioSha256, sha256);
  assert.equal(assessed.fingerprint, doc.fingerprint);
  verifyPcmSource(file);
  assert.equal(audio.duration, measureAudio(file));
  if (args.includes("--decode")) decodeAudio(file);
  const response = read(`${doc.id}.wav.assessment.json`);
  assert.equal(response.RecognitionStatus, "Success");
  const words = response.NBest[0].Words as {
    Word: string;
    Offset: number | null;
    Duration: number | null;
    PronunciationAssessment: { ErrorType: string; AccuracyScore?: number };
  }[];
  assert(words.length > 0);
  const counts = { Omission: 0, Insertion: 0, Mispronunciation: 0 };
  const flags = words
    .filter((word) => word.PronunciationAssessment.ErrorType !== "None")
    .map((word) => {
      const type = word.PronunciationAssessment.ErrorType;
      assert(type in counts);
      counts[type as keyof typeof counts]++;
      totals[type as keyof typeof totals]++;
      return {
        word: word.Word,
        type,
        offsetMs: word.Offset === null ? null : word.Offset / 10000,
        durationMs: word.Duration === null ? null : word.Duration / 10000,
        accuracyScore: word.PronunciationAssessment.AccuracyScore,
      };
    });
  assert.deepEqual(counts, assessed.flags);
  return {
    id: doc.id,
    audioFile: doc.audioFile,
    sha256,
    duration: audio.duration as number,
    fingerprint: doc.fingerprint,
    counts,
    flags,
    timingStatus: assessed.status,
  };
});
console.log(
  JSON.stringify(
    {
      stage: "synthesis-and-machine-assessment-only",
      clips: clips.length,
      totalAudioSeconds: clips.reduce((s, c) => s + c.duration, 0),
      format: plan.outputFormat,
      voice: plan.voice,
      counts: totals,
      actualListeningPerformed: false,
      adopted: false,
      synchronized: false,
      clipResults: clips,
    },
    null,
    2,
  ),
);
