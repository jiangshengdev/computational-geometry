import assert from "node:assert/strict";
import test from "node:test";
import { equals, left, mathLineGroups } from "./math-lines.ts";

test("aligned formulas split only at an outer equality and retain later relations", () => {
  const layout = mathLineGroups(
    [{ math: String.raw`{\color{blue}x=1}=2=3` }],
    [equals(1)],
  );
  assert.deepEqual(layout[0].rows, [
    {
      index: 0,
      cells: [{ math: String.raw`{\color{blue}x=1}` }, { math: "{}=2=3" }],
    },
  ]);
});

test("groups reject missing lines and invalid aligned content rather than hide it", () => {
  assert.throws(
    () => mathLineGroups([{ text: "题目" }], [left(2)]),
    /cover every line/,
  );
  assert.throws(
    () => mathLineGroups([{ text: "题目" }], [equals(1)]),
    /requires a formula/,
  );
  assert.throws(
    () => mathLineGroups([{ math: "x+1" }], [equals(1)]),
    /Missing outer equality/,
  );
  assert.deepEqual(mathLineGroups([{ text: "题目" }], [left(1)])[0].rows, [
    { index: 0, cells: [{ text: "题目" }] },
  ]);
});
