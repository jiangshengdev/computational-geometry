import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createCaptions,
  phraseTime,
  validateWords,
  wordsInTextRange,
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

test("semantic phrase anchors ignore zero-duration service punctuation", () => {
  const measured: AudioTiming = {
    ...audio,
    words: [
      ...audio.words,
      {
        text: "。",
        textOffset: 3,
        wordLength: 1,
        startMs: 0,
        durationMs: 0,
      },
    ],
  };
  assert.equal(phraseTime(measured, "a x。", "start"), 100);
  assert.equal(phraseTime(measured, "a x。", "end"), 600);
  assert.throws(() => phraseTime(measured, "。", "end"), /Missing timing/);
});

test("text intervals include crossing words, exclude touching edges and retain measured data", () => {
  const words = [
    { text: "ab", textOffset: 0, wordLength: 2, startMs: 100, durationMs: 80 },
    { text: "cd", textOffset: 2, wordLength: 2, startMs: 200, durationMs: 0 },
    { text: "ef", textOffset: 4, wordLength: 2, startMs: 300, durationMs: 90 },
  ];
  assert.deepEqual(wordsInTextRange({ words }, 1, 3), words.slice(0, 2));
  assert.deepEqual(wordsInTextRange({ words }, 2, 4), [words[1]]);
  assert.deepEqual(wordsInTextRange({ words }, 6, 8), []);
  assert.strictEqual(wordsInTextRange({ words }, 1, 3)[1], words[1]);
});

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

test("an explicit caption plan spans several spoken clauses without changing display punctuation", () => {
  const expanded = {
    ...audio,
    speech: "a。x。",
    words: audio.words.map((word) => ({ ...word })),
  };
  assert.throws(() => createCaptions("一个完整公式。", expanded));
  assert.deepEqual(
    createCaptions("一个完整公式。", expanded, [
      { caption: "一个完整公式。", speech: "a。x。" },
    ]),
    [
      {
        text: "一个完整公式。",
        startMs: 100,
        endMs: 600,
        timestampMs: null,
        confidence: null,
      },
    ],
  );
  for (const plan of [
    [{ caption: "缺失。", speech: "a。x。" }],
    [{ caption: "一个完整公式。", speech: "a。" }],
    [{ caption: "一个完整公式。", speech: "x。a。" }],
    [
      { caption: "", speech: "a。" },
      { caption: "一个完整公式。", speech: "x。" },
    ],
  ])
    assert.throws(() => createCaptions("一个完整公式。", expanded, plan));
});
