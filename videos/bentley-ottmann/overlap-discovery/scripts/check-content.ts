import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { checkSentencePlan } from "./sentence-plan.ts";
import { pageList, shots } from "../src/storyboard.ts";
import { inputs, type Name } from "../src/example.ts";
import {
  rows,
  visualAt,
  fps,
  audioLeadFrames,
  timingKind,
} from "../src/timeline.ts";

// Independent arithmetic checks for the two article cases, not a sweep engine.
const covers = (name: Name, x: number) =>
  inputs[name].start[0] <= x && x <= inputs[name].end[0];
const interval = (a: Name, b: Name) => [
  Math.max(inputs[a].start[0], inputs[b].start[0]),
  Math.min(inputs[a].end[0], inputs[b].end[0]),
];
assert.deepEqual(interval("F", "G"), [1, 2]);
assert.equal(covers("F", 4), false);
assert.equal(covers("G", 4) && covers("H", 4), true);
for (const p of [inputs.H.start, inputs.H.end]) assert.equal(p[1], 4 - p[0]);
for (const p of [inputs.K.start, inputs.K.end]) assert.equal(p[1], 2 - p[0]);
assert.deepEqual(interval("I", "J"), [3, 1]);
assert.equal(covers("I", 2) || covers("J", 2), false);
assert.equal(covers("K", 2), true);
const active = (names: Name[], t: number) =>
  names.filter((n) => inputs[n].start[0] <= t && t < inputs[n].end[0]);
assert.deepEqual(
  [0, 1, 2, 4, 7].map((t) => active(["F", "G"], t)),
  [["F"], ["F", "G"], ["G"], ["G"], []],
);
assert.deepEqual(
  [0, 1, 2, 3].map((t) => active(["I", "J"], t)),
  [["I"], [], [], ["J"]],
);
const narration = JSON.parse(
  readFileSync(new URL("../src/narration-text.json", import.meta.url), "utf8"),
) as Record<string, string>;
assert.deepEqual(
  Object.keys(narration),
  shots.map((s) => s.id),
);
assert.equal(new Set(shots.map((s) => s.id)).size, shots.length);
assert.equal(timingKind, "silent-inspection-only");
for (const [i, row] of rows.entries()) {
  assert.equal(
    row.from,
    i ? rows[i - 1].from + rows[i - 1].durationInFrames : 0,
  );
  assert.equal(
    row.captions.map((c) => c.text).join(""),
    shots[i].captions.join(""),
    `${row.id}: preserve complete subtitle punctuation`,
  );
  assert(row.captions.every((c) => c.end > c.start));
  const last = visualAt(row, row.durationInFrames - 1);
  assert.equal(last.visibleStep, row.visibleStep);
  assert.equal(last.caption, row.captions[row.captions.length - 1].text);
  assert(last.thinking);
  if (shots[i + 1]?.page !== row.page) assert(row.pauseAfter >= 3);
  if (shots[i - 1]?.page === row.page)
    assert.equal(
      visualAt(row, 0).caption,
      visualAt(rows[i - 1], rows[i - 1].durationInFrames - 1).caption,
    );
  assert.equal(
    row.durationInFrames,
    audioLeadFrames + row.readingFrames + row.pauseAfter * fps,
  );
  assert(!/[\u3400-\u9fff]\s+[\u3400-\u9fff]/u.test(narration[row.id]));
  for (const sentence of narration[row.id].split(/[。！？]/).filter(Boolean))
    assert(
      !/^[A-Za-z]|[A-Za-z]$/.test(sentence.trim()),
      `${row.id}: exposed sentence-edge letter`,
    );
}
const speechFile = new URL("../src/speech-text.json", import.meta.url);
const { buildSpeechDocument } = createSpeechTools(sdk, {
  voice: "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural",
  commas: "document",
  fingerprint: true,
});
if (existsSync(speechFile)) {
  const speech = JSON.parse(readFileSync(speechFile, "utf8")) as Record<
    string,
    (string | { text: string; pinyin: string })[]
  >;
  assert.deepEqual(Object.keys(speech), Object.keys(narration));
  for (const id of Object.keys(narration)) {
    assert.equal(buildSpeechDocument(speech[id]).text, narration[id]);
    checkSentencePlan(speech[id], narration[id], id);
    assert.equal(
      speech[id]
        .map((part) => (typeof part === "string" ? part : part.text))
        .join(""),
      narration[id],
      `${id}: pronunciation annotations changed frozen text`,
    );
  }
} else throw Error("Missing reviewed pronunciation source");
console.log(
  `PASS: ${pageList.length} pages, ${shots.length} shots; both independent article cases, subtitle continuity, page holds, frozen speech binding. Silent inspection only.`,
);
