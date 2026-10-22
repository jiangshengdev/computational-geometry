import test from "node:test";
import assert from "node:assert/strict";
import { buildSpeechDocument } from "./azure-speech.ts";
import {
  createCaptions,
  captionAt,
  phraseTime,
  type AudioTiming,
} from "../src/speech-timing.ts";

const audio: AudioTiming = {
  duration: 3,
  speech: "平行。向左。",
  voice: "fixture",
  fingerprint: "fixture",
  words: [
    {
      text: "平行",
      textOffset: 0,
      wordLength: 2,
      startMs: 100,
      durationMs: 500,
    },
    { text: "。", textOffset: 2, wordLength: 1, startMs: 600, durationMs: 0 },
    {
      text: "向左",
      textOffset: 3,
      wordLength: 2,
      startMs: 1300,
      durationMs: 700,
    },
    { text: "。", textOffset: 5, wordLength: 1, startMs: 2000, durationMs: 0 },
  ],
};

test("pronunciation-only edits invalidate the synthesis identity", () => {
  const first = buildSpeechDocument([{ text: "行", pinyin: "xing2" }]);
  const second = buildSpeechDocument([{ text: "行", pinyin: "hang2" }]);
  assert.equal(first.text, second.text);
  assert.notEqual(first.fingerprint, second.fingerprint);
  assert.match(first.ssml, /ph="xing 2"/);
  assert.throws(() => buildSpeechDocument([{ text: "平行", pinyin: "xing2" }]));
});
test("captions follow words and persist through silence", () => {
  const cues = createCaptions("平行。向左。", audio);
  assert.deepEqual(
    cues.map(({ text, startMs, endMs }) => ({ text, startMs, endMs })),
    [
      { text: "平行。", startMs: 100, endMs: 600 },
      { text: "向左。", startMs: 1300, endMs: 2000 },
    ],
  );
  assert.equal(captionAt(cues, 50), "");
  assert.equal(captionAt(cues, 50, "上句。"), "上句。");
  assert.equal(captionAt(cues, 1299), "平行。");
  assert.equal(captionAt(cues, 6000), "向左。");
  assert.equal(phraseTime(audio, "向左", "start"), 1300);
  assert.equal(phraseTime(audio, "向左", "end"), 2000);
});
test("reject stale words, missing anchors, and unmatched subtitle clauses", () => {
  assert.throws(() => createCaptions("平行。", audio));
  assert.throws(() =>
    createCaptions("平行。向左。", { ...audio, speech: "平行。向右。" }),
  );
  assert.throws(() => phraseTime(audio, "向右", "start"));
});
test("spoken zero-duration words and missing spoken text cannot pass validation", () => {
  for (const words of [
    audio.words.map((word) =>
      word.text === "向左" ? { ...word, durationMs: 0 } : word,
    ),
    audio.words.filter((word) => word.text !== "向左"),
  ]) {
    assert.throws(() => createCaptions("平行。向左。", { ...audio, words }));
    assert.throws(() => phraseTime({ ...audio, words }, "平行", "end"));
  }
});
test("zero-duration punctuation may follow the next word in audio time", () => {
  const words = audio.words.map((w) =>
    w.text === "。" && w.textOffset === 2 ? { ...w, startMs: 1315 } : w,
  );
  const cues = createCaptions("平行。向左。", { ...audio, words });
  assert.equal(cues[0].endMs, 600);
  assert.equal(cues[1].startMs, 1300);
  assert.throws(() =>
    createCaptions("平行。向左。", {
      ...audio,
      words: words.map((w) => (w.text === "向左" ? { ...w, startMs: 50 } : w)),
    }),
  );
});
test("short introductory clauses stay with the measured phrase", () => {
  const merged = {
    ...audio,
    speech: "平行，向左。",
    words: audio.words.map((w) =>
      w.textOffset === 2 ? { ...w, text: "，" } : w,
    ),
  };
  const captions = createCaptions("平行，向左。", merged);
  assert.deepEqual(
    captions.map(({ text, startMs, endMs }) => ({ text, startMs, endMs })),
    [{ text: "平行，向左。", startMs: 100, endMs: 2000 }],
  );
});
