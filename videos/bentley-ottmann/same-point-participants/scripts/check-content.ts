import { uncoloredMathTree } from "../../../shared/checks/math-structure.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkAudio } from "./check-audio.ts";
import katex from "katex";
import { pageList, shots } from "../src/storyboard.ts";
import { inputs, type Name } from "../src/example.ts";
import {
  rows,
  visualAt,
  fps,
  audioLeadFrames,
  timingKind,
} from "../src/timeline.ts";
import { objectMarks, activeMarks } from "../src/teaching-colors.ts";
import {
  colorMath,
  normalizeMath,
} from "../../../shared/math/semantic-colors.ts";
import type { ColorMark } from "../../../shared/math/semantic-colors.ts";

const parse = (text: string) =>
  uncoloredMathTree(
    (katex as unknown as { __parse: (text: string) => unknown }).__parse(text),
  );
function checkMarks(row: (typeof rows)[number], marks: ColorMark[]) {
  const text = normalizeMath(row.math ?? row.text ?? "");
  for (const mark of marks)
    assert(
      text.includes(normalizeMath(mark.term)),
      `${row.id}: unused mark ${mark.term}`,
    );
  if (row.math) {
    const colored = colorMath(row.math, undefined, marks);
    katex.renderToString(colored, { throwOnError: true, strict: "error" });
    assert.deepEqual(
      parse(colored),
      parse(normalizeMath(row.math)),
      `${row.id}: coloring changed mathematical structure`,
    );
  }
}

// Independent arithmetic checks for the article's coordinates, not a scan simulation.
const nonzero: Name[] = ["A", "B", "C", "D"];
const cross = ([ax, ay]: number[], [bx, by]: number[]) => ax * by - ay * bx;
for (const name of nonzero) {
  const { start, end } = inputs[name];
  assert(start[0] < end[0], `${name}: nonvertical, ordered extent`);
  assert(start[0] <= 4 && 4 <= end[0]);
  assert.equal(
    cross([end[0] - start[0], end[1] - start[1]], [4 - start[0], 4 - start[1]]),
    0,
    `${name}: contains P`,
  );
}
let pairCount = 0;
for (const [i, a] of nonzero.entries())
  for (const b of nonzero.slice(i + 1)) {
    const direction = (name: Name) =>
      inputs[name].end.map((v, axis) => v - inputs[name].start[axis]);
    assert.notEqual(
      cross(direction(a), direction(b)),
      0,
      `${a},${b}: unique line intersection`,
    );
    pairCount++;
  }
assert.equal(pairCount, 6);
for (const name of ["Z_1", "Z_2"] as const) {
  assert.deepEqual(inputs[name].start, [4, 4]);
  assert.deepEqual(inputs[name].end, [4, 4]);
}
const leftHeight = (name: Name, x: number) => {
  const { start, end } = inputs[name];
  return (
    start[1] + ((x - start[0]) * (end[1] - start[1])) / (end[0] - start[0])
  );
};
assert.deepEqual(
  ["D", "A", "C"].map((n) => leftHeight(n as Name, 3)),
  [2, 4, 5],
);

assert.equal(timingKind, "measured-narration");
const captionPlan = JSON.parse(
  readFileSync(new URL("../src/caption-plan.json", import.meta.url), "utf8"),
);
assert.equal(new Set(shots.map((s) => s.id)).size, shots.length);
assert.deepEqual(
  Object.keys(Object.fromEntries(pageList.map((p) => [p.section, true]))),
  ["1", "2", "3", "4", "5"],
);
for (const [index, row] of rows.entries()) {
  assert(row.source && row.first && row.action);
  assert.equal(
    row.from,
    index ? rows[index - 1].from + rows[index - 1].durationInFrames : 0,
  );
  assert.equal(
    row.captions.map((c) => c.text).join(""),
    captionPlan[row.id].map((p: { caption: string }) => p.caption).join(""),
  );
  assert.equal(visualAt(row, 0).visibleStep, row.visibleStep);
  assert.equal(visualAt(row, 0).activeCaption, null);
  if (row.targets)
    assert.equal(row.targets.length, shots[index].captions.length);
  if (row.focus) assert.equal(row.focus.length, shots[index].captions.length);
  for (const c of row.captions) {
    assert(
      c.source >= 0 && c.source < shots[index].captions.length,
      `${row.id}: invalid teaching source`,
    );
    assert.equal(visualAt(row, c.start).activeCaption, c.source);
    assert.equal(visualAt(row, c.start).caption, c.text);
    checkMarks(row, [...objectMarks[row.id], ...activeMarks(row.id, c.source)]);
  }
  let prior = visualAt(row, 0);
  for (let frame = 1; frame < row.durationInFrames; frame++) {
    const state = visualAt(row, frame);
    assert(
      (state.reachedCaption ?? -1) >= (prior.reachedCaption ?? -1),
      `${row.id}: introduced content retreated`,
    );
    for (const target of prior.reached) assert(state.reached.includes(target));
    if (state.target && state.target === prior.target)
      assert(state.progress >= prior.progress, `${row.id}: action restarted`);
    prior = state;
  }
  checkMarks(row, objectMarks[row.id]);
  const end = visualAt(row, row.durationInFrames - 1);
  assert.equal(end.target, null);
  assert.equal(end.caption, row.captions[row.captions.length - 1].text);
  assert.equal(end.visibleStep, row.visibleStep);
  assert(
    row.durationInFrames - audioLeadFrames - row.speechFrames >=
      (row.thinkAfter ?? 1) * fps,
  );
  if (rows[index + 1]?.page !== row.page)
    assert(
      row.durationInFrames - audioLeadFrames - row.speechFrames >=
        pageList.find((p) => p.id === row.page)!.holdAfterSeconds * fps,
    );
  const previous = rows[index - 1];
  assert.equal(
    row.previousCaption,
    previous?.page === row.page
      ? previous.captions[previous.captions.length - 1].text
      : "",
  );
}

const { clips, counts } = checkAudio(process.argv.includes("--decode"));
console.log(JSON.stringify({ clips, counts, actualListeningPerformed: false }));
console.log(
  `PASS ${shots.length} steps / ${pageList.length} pages: example arithmetic, marks and KaTeX structure, measured timing, retained content, captions and current narration requests. Runtime synchronization requires separate verification.`,
);
