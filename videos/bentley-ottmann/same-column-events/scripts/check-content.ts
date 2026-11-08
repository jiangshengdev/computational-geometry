import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import {
  inputs,
  intersections,
  orders,
  strictlyFuture,
} from "../src/example.ts";
import {
  rows,
  visualAt,
  fps,
  audioLeadFrames,
  timingKind,
  motionStart,
} from "../src/timeline.ts";
import { pageList, shots } from "../src/storyboard.ts";

// Verify the six mathematical input pairs independently of the teaching sequence.
const found: Record<string, number[]> = {};
for (const a of inputs) {
  for (const [xx, yy] of [a.start, a.end]) assert.equal(a.m * xx + a.b, yy);
  for (const b of inputs.slice(a.id + 1)) {
    if (a.m === b.m) {
      assert.notEqual(a.b, b.b);
      continue;
    }
    const xx = (b.b - a.b) / (a.m - b.m);
    if (
      xx >= a.start[0] &&
      xx <= a.end[0] &&
      xx >= b.start[0] &&
      xx <= b.end[0]
    )
      found[`${a.id},${b.id}`] = [xx, a.m * xx + a.b];
  }
}
assert.deepEqual(found, { "0,1": [0, -2], "0,3": [2, 0], "2,3": [0, 2] });
for (const [xx, key] of [
  [-0.5, "before"],
  [0.5, "afterQ"],
  [2.5, "afterR"],
] as const)
  assert.deepEqual(
    [...inputs]
      .sort((a, b) => a.m * xx + a.b - (b.m * xx + b.b))
      .map((s) => s.id),
    orders[key],
  );
assert.deepEqual(orders.afterP, [1, 0, 2, 3]);
assert(strictlyFuture(intersections.Q, intersections.P));
assert(strictlyFuture(intersections.R, intersections.Q));
assert(!strictlyFuture(intersections.P, intersections.P));
assert(!strictlyFuture(intersections.P, intersections.Q));
assert(!strictlyFuture([-1, 100], intersections.P));
assert(strictlyFuture([1, -100], intersections.P));
assert.equal(timingKind, "silent-inspection-only");
const narration: Record<string, string> = JSON.parse(
  readFileSync(new URL("../src/narration-text.json", import.meta.url), "utf8"),
);
const speech: Record<string, unknown> = JSON.parse(
  readFileSync(new URL("../src/speech-text.json", import.meta.url), "utf8"),
);
const { buildSpeechDocument } = createSpeechTools(sdk, {
  voice: "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural",
  commas: "document",
  fingerprint: true,
});
assert.deepEqual(
  Object.keys(narration),
  shots.map((s) => s.id),
);
assert.deepEqual(
  Object.keys(speech),
  shots.map((s) => s.id),
);
assert.equal(new Set(shots.map((s) => s.id)).size, shots.length);
for (const [i, row] of rows.entries()) {
  assert(!/[，,]/.test(narration[row.id]), `${row.id}: spoken comma`);
  assert.equal(
    buildSpeechDocument(speech[row.id], row.id).text,
    narration[row.id],
    `${row.id}: annotated input changes frozen text`,
  );
  assert.equal(
    visualAt(row, motionStart(row) - 1).motion,
    0,
    `${row.id}: motion precedes semantic cue`,
  );
  assert.equal(
    visualAt(row, motionStart(row) + 90).motion,
    1,
    `${row.id}: motion does not finish`,
  );
  assert.equal(
    row.from,
    i ? rows[i - 1].from + rows[i - 1].durationInFrames : 0,
  );
  assert.equal(
    row.captions.map((c) => c.text).join(""),
    row.captions.length ? shots[i].captions.join("") : "",
  );
  if (i && rows[i - 1].page === row.page)
    assert.equal(
      visualAt(row, 0).caption,
      visualAt(rows[i - 1], rows[i - 1].durationInFrames - 1).caption,
    );
  const end = visualAt(row, row.durationInFrames - 1);
  assert.equal(end.caption, row.captions[row.captions.length - 1].text);
  assert.equal(end.visibleStep, row.visibleStep);
  assert.equal(end.motion, 1);
  assert(end.thinking && !end.active);
  assert(row.durationInFrames >= audioLeadFrames + row.readingFrames + fps);
  if (rows[i + 1]?.page !== row.page) assert(row.pauseAfter >= 3);
}
console.log(
  `Verified six input pairs, strict-future cases, ${pageList.length} pages / ${rows.length} silent steps and caption/hold continuity.`,
);
