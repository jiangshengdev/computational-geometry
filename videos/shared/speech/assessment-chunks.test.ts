import { test } from "node:test";
import assert from "node:assert/strict";
import { assessmentChunks, combineAssessments } from "./assessment-chunks.ts";

test("long assessment partitions all samples and text only at measured quiet sentence pauses", () => {
  const pcm = Buffer.alloc(40 * 48000 * 2);
  const audio = {
    duration: 40,
    speech: "第一句。第二句。",
    voice: "test",
    fingerprint: "test",
    words: [
      {
        text: "第一句",
        textOffset: 0,
        wordLength: 3,
        startMs: 0,
        durationMs: 19000,
      },
      {
        text: "。",
        textOffset: 3,
        wordLength: 1,
        startMs: 19000,
        durationMs: 0,
      },
      {
        text: "第二句",
        textOffset: 4,
        wordLength: 3,
        startMs: 20100,
        durationMs: 19000,
      },
      {
        text: "。",
        textOffset: 7,
        wordLength: 1,
        startMs: 39100,
        durationMs: 0,
      },
    ],
  };
  assert.deepEqual(assessmentChunks(audio, pcm), [
    { startSample: 0, endSample: 20 * 48000, speech: "第一句。" },
    { startSample: 20 * 48000, endSample: 40 * 48000, speech: "第二句。" },
  ]);
  pcm.writeInt16LE(3000, 20 * 48000 * 2);
  assert.throws(() => assessmentChunks(audio, pcm), /No measured quiet/);
  assert.throws(
    () => assessmentChunks(audio, pcm.subarray(0, 100)),
    /duration/,
  );
});

test("assessment merge translates real offsets without losing errors or raw responses", () => {
  const response = {
    RecognitionStatus: "Success",
    NBest: [
      {
        Words: [
          {
            Word: "字",
            Offset: 1000000,
            Duration: 2000000,
            PronunciationAssessment: { ErrorType: "Omission" },
          },
        ],
      },
    ],
  };
  const parts = [
    { startSample: 0, endSample: 48000, speech: "字。", response },
    { startSample: 48000, endSample: 96000, speech: "字。", response },
  ];
  const result = combineAssessments(parts);
  assert.equal(result.NBest[0].Words[1].Offset, 11000000);
  assert.equal(result.NBest[0].Words[1].Duration, 2000000);
  assert.equal(
    result.NBest[0].Words[1].PronunciationAssessment.ErrorType,
    "Omission",
  );
  assert.deepEqual(result.chunks, parts);
  assert.equal(response.NBest[0].Words[0].Offset, 1000000);
  assert.throws(
    () => combineAssessments([{ ...parts[0], startSample: 1 }]),
    /Incomplete/,
  );
  assert.throws(
    () =>
      combineAssessments([
        {
          ...parts[0],
          response: { ...response, RecognitionStatus: "NoMatch" },
        },
      ]),
    /Incomplete/,
  );
});
