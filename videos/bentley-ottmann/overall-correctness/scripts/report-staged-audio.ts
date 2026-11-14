import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import { currentNarrationPlan } from "./measured-audio.ts";

// Offline evidence only: preserve raw flags; never authorize adoption or replay.
const args = process.argv.slice(2);
assert(args.length && args.every((arg) => arg.startsWith("--staging=")));
const directories = args.map((arg) => resolve(arg.slice(10)));
assert.equal(new Set(directories).size, directories.length);
const current = currentNarrationPlan();
const counts: Record<string, number> = {
  Mispronunciation: 0,
  Omission: 0,
  Insertion: 0,
};
type AssessmentWord = {
  Word: string;
  Offset?: number;
  Duration?: number;
  PronunciationAssessment: { ErrorType: string };
};
const results: {
  id: string;
  file: string;
  audioSha256: string;
  fingerprint: string;
  durationSeconds: number;
  speech: string;
  assessment: string;
  flags: Record<string, number>;
  flaggedWords: AssessmentWord[];
}[] = [];
const requests = [];
for (const directory of directories) {
  const read = (name: string) =>
    JSON.parse(readFileSync(join(directory, name), "utf8"));
  const batch = read("manifest.json");
  const planBytes = readFileSync(join(directory, "request-plan.json"));
  assert.equal(
    createHash("sha256").update(planBytes).digest("hex"),
    batch.planSha256,
  );
  const assessments = readdirSync(directory)
    .filter((name) => /^assessment-manifest(?:-[a-f0-9]+)?\.json$/.test(name))
    .flatMap((name) => read(name).requests);
  for (const request of batch.requests) {
    requests.push({ batch: relative(process.cwd(), directory), ...request });
    if (request.status !== "synthesized-and-decoded") continue;
    const { id } = request;
    assert(
      !results.some((result) => result.id === id),
      `${id}: multiple sources`,
    );
    const expected = current.documents.find((doc) => doc.id === id);
    assert(expected, `${id}: unknown source`);
    const audio = read(`${id}.json`);
    assert.equal(audio.fingerprint, expected.fingerprint);
    assert.equal(request.fingerprint, expected.fingerprint);
    assert.equal(audio.speech, expected.text);
    assert.equal(audio.outputFormat, current.outputFormat);
    assert.equal(audio.audioSha256, audioSha256(join(directory, `${id}.wav`)));
    const records = assessments.filter((record) => record.id === id);
    assert.equal(records.length, 1, `${id}: missing or duplicated assessment`);
    const record = records[0];
    assert.equal(record.audioSha256, audio.audioSha256);
    assert.equal(record.fingerprint, audio.fingerprint);
    assert(
      record.status.startsWith("assessed-timing-"),
      `${id}: incomplete assessment`,
    );
    const response = read(`${id}.wav.assessment.json`);
    assert.equal(response.RecognitionStatus, "Success");
    const words = response.NBest[0].Words as AssessmentWord[];
    assert(words.length);
    const flags = { Mispronunciation: 0, Omission: 0, Insertion: 0 };
    const flaggedWords = words.filter(
      (word) => word.PronunciationAssessment.ErrorType !== "None",
    );
    for (const word of flaggedWords) {
      const type = word.PronunciationAssessment.ErrorType;
      assert(type in flags, `${id}: unknown flag ${type}`);
      flags[type as keyof typeof flags]++;
      counts[type]++;
    }
    assert.deepEqual(flags, record.flags);
    results.push({
      id,
      file: relative(process.cwd(), join(directory, `${id}.wav`)),
      audioSha256: audio.audioSha256,
      fingerprint: audio.fingerprint,
      durationSeconds: audio.duration,
      speech: audio.speech,
      assessment: record.status,
      flags,
      flaggedWords,
    });
  }
}
assert.deepEqual(
  results.map((r) => r.id).sort(),
  current.documents.map((d) => d.id).sort(),
);
console.log(
  JSON.stringify(
    {
      expected: current.requests,
      generated: results.length,
      assessed: results.length,
      sourceDurationSeconds: Number(
        results.reduce((sum, r) => sum + r.durationSeconds, 0).toFixed(3),
      ),
      counts,
      actualListeningPerformed: false,
      adopted: false,
      exportGatePassed: false,
      requests,
      results: results.sort((a, b) => a.id.localeCompare(b.id)),
    },
    null,
    2,
  ),
);
