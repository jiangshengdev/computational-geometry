import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import {
  decodeAudio,
  measureAudio,
  verifyPcmSource,
} from "../../../shared/speech/audio.ts";
import { audio, rows, fps, audioLeadFrames } from "../src/timeline.ts";
import selection from "../narration/selection.json" with { type: "json" };
import requests from "../narration/requests.json" with { type: "json" };
const hash = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const tools = createAlignmentTools(sdk, {
  allowReviewedPronunciation: false,
  deferPronunciationReview: true,
});
const counts: Record<string, number> = {
  Mispronunciation: 0,
  Omission: 0,
  Insertion: 0,
};
assert.equal(selection.records.length, 57);
assert.equal(
  hash("narration/unresolved/omission-v2/synthesis/manifest.json"),
  "6758e28a7a989204305ef80fc5ade058cd32cc6a6b8fafce40a9d167a4c131fd",
);
assert.deepEqual(
  selection.records
    .filter((r) => r.reviewedRecognition.length)
    .map((r) => r.id),
  ["SP06"],
);
for (const record of selection.records) {
  const timing = audio[record.id];
  assert.equal(hash(record.audioFile), record.audioSha256);
  assert.equal(
    hash(`narration/records/${record.id}.assessment.json`),
    record.responseSha256,
  );
  assert.equal(
    hash(`narration/records/${record.id}.synthesis.json`),
    record.synthesisResponseSha256,
  );
  const response = JSON.parse(
    readFileSync(`narration/records/${record.id}.assessment.json`, "utf8"),
  );
  assert.deepEqual(timing.alignment?.response, response);
  const source = JSON.parse(
    readFileSync(`narration/records/${record.id}.synthesis.json`, "utf8"),
  );
  assert.deepEqual(timing.alignment?.synthesisWords, source.words);
  assert.deepEqual(tools.assessmentWords(timing, response), timing.words);
  tools.verifyAlignment(timing, record.audioFile);
  verifyPcmSource(record.audioFile);
  decodeAudio(record.audioFile);
  assert.equal(measureAudio(record.audioFile), timing.duration);
  const request = requests[record.id as keyof typeof requests].document;
  assert.equal(timing.speech, request.text);
  assert.equal(timing.fingerprint, request.fingerprint);
  for (const word of response.NBest[0].Words) {
    const flag = word.PronunciationAssessment.ErrorType;
    if (flag !== "None") counts[flag]++;
  }
  const row = rows.find((r) => r.id === record.id)!;
  assert(
    row.durationInFrames >= audioLeadFrames + Math.ceil(timing.duration * fps),
  );
  for (let i = 0; i < row.captions.length; i++) {
    const c = row.captions[i];
    assert(c.end > c.start && c.end <= row.audioEndFrame);
    if (i)
      assert(
        row.captions[i - 1].end <= c.start,
        `${record.id}: overlapping captions`,
      );
  }
}
assert.deepEqual(counts, selection.counts);
assert.equal(selection.unresolvedMiscues, 0);
assert.equal(selection.actualListeningPerformed, false);
console.log(
  JSON.stringify({
    clips: 57,
    counts,
    acceptedMiscues: selection.userAcceptedMiscues,
    unresolvedMiscues: 0,
    measuredTimelineSeconds:
      rows.reduce((sum, row) => sum + row.durationInFrames, 0) / fps,
    actualListeningPerformed: false,
  }),
);
