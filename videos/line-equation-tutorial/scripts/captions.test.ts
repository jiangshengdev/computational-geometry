import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildSpeechDocument, type WordBoundary } from "./azure-speech.ts";
import { captionPhrases, createCaptions } from "./captions.ts";
import { captionAt } from "../src/caption-timeline.ts";

test("caption switches at measured onset, holds through pauses, resets per chapter", () => {
  const cues = [
    {
      text: "第一句。",
      startMs: 70,
      endMs: 700,
      timestampMs: null,
      confidence: null,
    },
    {
      text: "第二句。",
      startMs: 1500,
      endMs: 2200,
      timestampMs: null,
      confidence: null,
    },
  ];
  assert.equal(captionAt(cues, 69), "");
  assert.equal(captionAt(cues, 70), "第一句。");
  assert.equal(captionAt(cues, 1499), "第一句。");
  assert.equal(captionAt(cues, 1500), "第二句。");
  assert.equal(captionAt(cues, 9000), "第二句。");
  assert.equal(captionAt([], 9000), "");
  assert.equal(captionAt(cues, 0), "");
});

test("all generated captions preserve original narration and use corresponding speech boundaries", () => {
  const read = (name: string): unknown =>
    JSON.parse(
      readFileSync(new URL(`../src/${name}.json`, import.meta.url), "utf8"),
    );
  const narration = read("narration") as {
    rows: { id: string; narration: string }[];
  }[];
  const speech = read("speech-text") as Record<string, unknown>;
  const words = read("word-timing") as Record<string, WordBoundary[]>;
  const captions = read("captions") as Record<
    string,
    ReturnType<typeof createCaptions>
  >;
  const timing = read("audio-timing") as Record<
    string,
    { duration: number; silenceAfter: number; frames: number }
  >;
  for (const row of narration.flatMap((chapter) => chapter.rows)) {
    const text = buildSpeechDocument(speech[row.id]).text;
    for (const word of words[row.id]) {
      assert.equal(
        text.slice(word.textOffset, word.textOffset + word.wordLength),
        word.text,
        row.id,
      );
      assert.ok(
        word.startMs >= 0 &&
          word.startMs + word.durationMs <= timing[row.id].duration * 1000,
        row.id,
      );
    }
    const expected = createCaptions(row.narration, text, words[row.id]);
    assert.deepEqual(captions[row.id], expected, row.id);
    assert.equal(expected.map((c) => c.text).join(""), row.narration, row.id);
    for (let i = 1; i < expected.length; i++)
      assert.ok(expected[i].startMs > expected[i - 1].startMs, row.id);
  }
});

test("spoken sentence breaks inside a formula do not split the displayed expression", () => {
  const display = "方程就写成 aX+bY=c。";
  const phrases = captionPhrases(
    display,
    "方程就写成、A、乘、X。加、B、乘、Y。等于、C。",
  );
  assert.equal(phrases.length, 1);
  assert.equal(phrases[0].text, display);
  assert.throws(() => captionPhrases("一句。", "一句，另句。"), /mismatch/);
  assert.throws(
    () => createCaptions("一句。", "一句。", []),
    /Missing word timing/,
  );
});
