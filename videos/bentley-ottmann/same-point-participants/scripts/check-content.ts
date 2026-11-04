import { uncoloredMathTree } from "../../../shared/checks/math-structure.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
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

assert.equal(timingKind, "provisional-silent-reading");
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
    shots[index].captions.join(""),
  );
  assert.equal(visualAt(row, 0).visibleStep, row.visibleStep);
  assert.equal(visualAt(row, 0).activeCaption, null);
  if (row.targets)
    assert.equal(row.targets.length, shots[index].captions.length);
  if (row.focus) assert.equal(row.focus.length, shots[index].captions.length);
  for (const c of row.captions) {
    assert.equal(visualAt(row, c.start).activeCaption, c.source);
    assert.equal(visualAt(row, c.start).caption, c.text);
    checkMarks(row, [...objectMarks[row.id], ...activeMarks(row.id, c.source)]);
  }
  checkMarks(row, objectMarks[row.id]);
  const end = visualAt(row, row.durationInFrames - 1);
  assert.equal(end.target, null);
  assert.equal(end.caption, row.captions[row.captions.length - 1].text);
  assert.equal(end.visibleStep, row.visibleStep);
  assert(
    row.durationInFrames - audioLeadFrames - row.readingFrames >=
      (row.thinkAfter ?? 1) * fps,
  );
  if (rows[index + 1]?.page !== row.page)
    assert(
      row.durationInFrames - audioLeadFrames - row.readingFrames >=
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

const plainBytes = readFileSync(
  new URL("../src/narration-text.json", import.meta.url),
  "utf8",
);
assert.equal(
  createHash("sha256").update(plainBytes).digest("hex"),
  "a5002b8fddec98afd3ac61d0813a0520e29ede8ea0e51572566955e29cb5afd5",
  "Independently frozen narration changed",
);
const plain = JSON.parse(plainBytes) as Record<string, string>;
const speechBytes = readFileSync(
  new URL("../src/speech-text.json", import.meta.url),
  "utf8",
);
assert.equal(
  createHash("sha256").update(speechBytes).digest("hex"),
  "3817224763afe2347bcdf8beafa2b4386c7546a2326e446fc0662dcfd7dee20b",
  "Reviewed pronunciation source changed",
);
const speech = JSON.parse(speechBytes) as Record<
  string,
  (string | { text: string; pinyin: string })[]
>;
assert.deepEqual(
  Object.keys(plain),
  shots.map((s) => s.id),
);
assert.deepEqual(Object.keys(speech), Object.keys(plain));
for (const id of Object.keys(plain)) {
  assert.doesNotMatch(plain[id], /[,，]/);
  assert.equal(
    speech[id]
      .map((part) => (typeof part === "string" ? part : part.text))
      .join(""),
    plain[id],
    `${id}: pronunciation changed frozen text`,
  );
  for (const part of speech[id])
    if (typeof part !== "string") {
      assert.deepEqual(Object.keys(part).sort(), ["pinyin", "text"]);
      assert.match(part.text, /^[\u3400-\u9fff]+$/);
      const syllables = part.pinyin.split(" ");
      assert.equal(syllables.length, [...part.text].length);
      for (const syllable of syllables)
        assert.match(syllable, /^[a-zv]+[1-5]$/);
    }
}
console.log(
  `PASS ${shots.length} steps / ${pageList.length} pages: example arithmetic, marks and KaTeX structure, silent timing, retained content, captions and pronunciation text. No audio/synchronization acceptance claimed.`,
);
