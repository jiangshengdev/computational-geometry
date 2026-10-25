import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createCaptions,
  phraseTime,
  validateWords,
  type AudioTiming,
} from "./timing.ts";

const audio: AudioTiming = {
  speech: "a x。",
  duration: 1,
  voice: "test",
  fingerprint: "test",
  words: [
    { text: "A", textOffset: 0, wordLength: 1, startMs: 100, durationMs: 200 },
    { text: "X", textOffset: 2, wordLength: 1, startMs: 400, durationMs: 200 },
  ],
};

test("uppercase service letters retain measured caption and anchor times for lowercase speech", () => {
  const original = structuredClone(audio);
  assert.deepEqual(createCaptions("横坐标。", audio), [
    {
      text: "横坐标。",
      startMs: 100,
      endMs: 600,
      timestampMs: null,
      confidence: null,
    },
  ]);
  assert.equal(phraseTime(audio, "x", "start"), 400);
  assert.deepEqual(audio, original);
});

test("case-insensitive speech matching still rejects missing, wrong, reordered and mistimed letters", () => {
  const [a, x] = audio.words;
  for (const words of [
    [a],
    [a, { ...x, text: "Y" }],
    [
      { ...a, text: "X" },
      { ...x, text: "A" },
    ],
    [a, { ...x, textOffset: 1 }],
    [a, { ...x, durationMs: 0 }],
    [a, { ...x, durationMs: 700 }],
    [a, { ...x, startMs: 50 }],
  ])
    assert.throws(() => validateWords({ ...audio, words }));
});
