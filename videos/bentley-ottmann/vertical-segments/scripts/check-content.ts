import assert from "node:assert/strict";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import {createSpeechTools} from "../../../shared/speech/azure-speech.ts";
import { readFileSync } from "node:fs";
import { pageList, shots } from "../src/storyboard.ts";
import { rows, visualAt, fps, timingKind } from "../src/timeline.ts";
import {
  N,
  inputs,
  transform,
  restore,
  actualEvents,
  coveredBy,
} from "../src/example.ts";
assert.equal(N, 256n * 4n ** 5n);
for (const pair of Object.values(inputs))
  for (const [x, y] of pair) {
    assert.deepEqual(restore(transform([x, y])), [N * x, y]);
  }
for (let i = 1; i < actualEvents.length; i++)
  assert(actualEvents[i - 1].point[0] < actualEvents[i].point[0]);
for (const [other, k, current] of [
  ["A", 1n, 0n],
  ["B", 2n, 1n],
] as const) {
  assert(coveredBy("V", k));
  assert(coveredBy(other, k));
  assert(k > current);
  for (const name of ["V", other] as const) {
    const [a, b] = inputs[name].map(transform);
    // A cross-product of zero establishes that the candidate is on the actual transformed line.
    assert.equal((k - a[0]) * (b[1] - a[1]) - (k - a[1]) * (b[0] - a[0]), 0n);
  }
}
assert.deepEqual(restore([1n, 1n]), [0n, 1n]);
assert.deepEqual(restore([2n, 2n]), [0n, 2n]);
assert.deepEqual(inputs.W.map(transform).map(restore), [
  [0n, 1n],
  [0n, 2n],
]);
assert.deepEqual(transform(inputs.Z1[0]), transform(inputs.Z2[0]));
const narration = JSON.parse(
  readFileSync(new URL("../src/narration-text.json", import.meta.url), "utf8"),
) as Record<string, string>;
assert.equal(new Set(shots.map((s) => s.id)).size, shots.length);
assert.deepEqual(
  Object.keys(narration),
  shots.map((s) => s.id),
);
const marked = JSON.parse(readFileSync(new URL('../src/speech-text.json', import.meta.url),'utf8')) as Record<string,unknown>;
const {buildSpeechDocument}=createSpeechTools(sdk,{voice:'zh-CN-Xiaoxiao:DragonHDFlashLatestNeural',commas:'document',fingerprint:true});
assert.deepEqual(Object.keys(marked),Object.keys(narration));
for(const id of Object.keys(narration)) assert.equal(buildSpeechDocument(marked[id],id).text,narration[id],id+': pronunciation changed text');
const normalize = (s: string) =>
  s
    .replace(/([PQ])′/g, "$1 撇")
    .replaceAll("Z₁", "Z 一")
    .replaceAll("Z₂", "Z 二")
    .replace(/[，。；：？！\s]/g, "");
for (const row of rows) {
  assert.equal(
    normalize(row.captions.map((c) => c.text).join("")),
    normalize(narration[row.id]),
    row.id + " subtitle/narration mismatch",
  );
  assert(!/[,，]/.test(narration[row.id]), row.id + " speech comma");
  assert(
    !/横坐标|纵坐标/.test(
      narration[row.id].replace("《同横坐标、退化输入与原坐标》", ""),
    ),
    row.id + " old coordinate terms",
  );
  for (const sentence of narration[row.id].split(/[。？！]/).filter(Boolean)) {
    assert(!/^\s*[A-Za-z](?:\s|$)/.test(sentence), row.id + " leading letter");
    assert(!/[A-Za-z]\s*$/.test(sentence), row.id + " trailing letter");
  }
  const last = visualAt(row, row.durationInFrames - 1);
  assert.equal(last.visibleStep, row.visibleStep);
  assert.equal(last.caption, row.captions.at(-1)!.text);
  if (row.pauseAfter)
    assert(row.durationInFrames - row.captions.at(-1)!.end >= 3 * fps);
  assert.equal(
    row.captions.map((c) => c.text).join(""),
    shots.find((s) => s.id === row.id)!.captions.join(""),
  );
}
assert.equal(
  pageList.filter((p) => /^第[一二三四五]节/.test(p.title)).length,
  5,
);
assert.equal(timingKind, "provisional-visual-inspection");
console.log(
  `PASS: exact main-case coordinates and 8 events, two covered future candidates, point/interval restoration, ${shots.length} subtitle/narration pairs and ${pageList.length} page holds. No audio or visual acceptance implied.`,
);
