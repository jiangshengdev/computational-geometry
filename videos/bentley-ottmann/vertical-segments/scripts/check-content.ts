import { checkAudio } from "./check-audio.ts";
import { updateSentencePauses } from "./sentence-plan.ts";
import assert from "node:assert/strict";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { readFileSync } from "node:fs";
import { pageList, shots } from "../src/storyboard.ts";
import {
  rows,
  visualAt,
  motionCue,
  fps,
  audioLeadFrames,
  audio,
  timingKind,
} from "../src/timeline.ts";
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
const marked = JSON.parse(
  readFileSync(new URL("../src/speech-text.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const { buildSpeechDocument } = createSpeechTools(sdk, {
  voice: "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural",
  commas: "document",
  fingerprint: true,
});
assert.deepEqual(Object.keys(marked), Object.keys(narration));
for (const id of Object.keys(narration))
  assert.equal(
    buildSpeechDocument(marked[id], id).text,
    narration[id],
    id + ": pronunciation changed text",
  );
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
    row.id === "VS29" ||
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
  assert.equal(
    row.audioEndFrame,
    audioLeadFrames + Math.ceil(audio[row.id].duration * fps),
  );
  assert.equal(row.durationInFrames, row.audioEndFrame + row.pauseAfter * fps);
  assert(
    row.captions.every(
      (c) => c.start >= audioLeadFrames && c.end <= row.audioEndFrame,
    ),
  );
  assert.equal(visualAt(row, row.audioEndFrame - 1).thinking, false);
  assert.equal(visualAt(row, row.audioEndFrame).thinking, true);
  const cue = motionCue(row);
  assert(
    cue.start >= audioLeadFrames &&
      cue.start < cue.end &&
      cue.end <= row.audioEndFrame,
  );
  assert.equal(visualAt(row, cue.start - 1).motion, 0);
  assert.equal(visualAt(row, cue.end).motion, 1);
  if (row.pauseAfter)
    assert.equal(row.durationInFrames - row.audioEndFrame, 3 * fps);
  assert.equal(
    row.captions.map((c) => c.text).join(""),
    shots.find((s) => s.id === row.id)!.captions.join(""),
  );
}
assert.equal(
  pageList.filter((p) => /^第[一二三四五]节/.test(p.title)).length,
  5,
);
assert.equal(timingKind, "measured-narration");
for (const [index, row] of rows.entries()) {
  const previous = rows[index - 1];
  assert.equal(
    row.from,
    previous ? previous.from + previous.durationInFrames : 0,
  );
  assert.equal(
    row.previousCaption,
    previous?.page === row.page ? previous.captions.at(-1)!.text : "",
  );
  assert.equal(row.pauseAfter, rows[index + 1]?.page === row.page ? 0 : 3);
}
for (const [id, phrase] of [
  ["VS32", "首先记录"],
  ["VS39", "报告蓝色与紫色"],
]) {
  const row = rows.find((r) => r.id === id)!;
  const start = motionCue(row, [phrase]).start;
  assert.equal(visualAt(row, start - 1).currentReport, false);
  assert.equal(visualAt(row, start).currentReport, true);
  assert.equal(visualAt(row, row.durationInFrames - 1).currentReport, true);
}
const boundaries = rows.find((r) => r.id === "VS55")!;
const upper = motionCue(boundaries, ["上端的新"]).start;
assert.equal(visualAt(boundaries, upper - 1).boundaryPointIndex, 0);
assert.equal(visualAt(boundaries, upper).boundaryPointIndex, 1);
const pairs = rows.find((r) => r.id === "VS60")!;
const second = motionCue(pairs, ["再与第二份"]).start;
assert.equal(visualAt(pairs, second - 1).secondPointPair, false);
assert.equal(visualAt(pairs, second).secondPointPair, true);
console.log(
  `PASS: exact main-case coordinates and 8 events, two covered future candidates, point/interval restoration, ${shots.length} subtitle/narration pairs and ${pageList.length} page holds. No audio or visual acceptance implied.`,
);

updateSentencePauses(false);

const args = process.argv.slice(2);
assert(
  args.length === 0 || (args.length === 1 && args[0] === "--decode"),
  "Use [--decode]",
);
console.log(JSON.stringify(checkAudio(args.includes("--decode"))));
