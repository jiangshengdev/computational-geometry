import assert from "node:assert/strict";
import { test } from "node:test";
import { derivationAt, derivations } from "./derivations.ts";

const visible = (row: string, seconds: number) => {
  const { page, step } = derivationAt(row, seconds);
  return page.lines.slice(0, step.visibleCount);
};

test("each reveal retains every earlier step until the complete derivation ends", () => {
  for (const page of derivations) {
    const seen = new Set<string>();
    let previous: string[] = [];
    for (const step of page.steps) {
      step.cue.lines.forEach((line) => seen.add(line));
      const current = visible(step.row, step.cue.at);
      assert.deepEqual(current.slice(0, previous.length), previous);
      assert.deepEqual(new Set(current), seen);
      previous = current;
      assert.deepEqual(
        step.activeLines.map((index) => page.lines[index]),
        step.cue.lines,
      );
    }
  }
});

test("subtracting endpoint equations carries across narration boundaries", () => {
  const lines = visible("191-5", 11);
  for (const line of [
    "a + 3b = c",
    "3a + 7b = c",
    "(3a + 7b) − (a + 3b) = c − c",
    "3a + 7b − a − 3b = 0",
    "2a + 4b = 0",
  ]) {
    assert.ok(lines.includes(line), line);
  }
});

test("a result rederived later is appended after its calculation", () => {
  const lines = visible("194-2", 13);
  assert.deepEqual(lines.slice(-2), ["3X = 6", "X = 2"]);
  assert.equal(lines.filter((line) => line === "X = 2").length, 2);
});

test("thinking windows do not reveal answers, including after seeking backwards", () => {
  for (const [row, answer] of [
    ["190-4", "6 ≠ 5"],
    ["192-4", "b = −2"],
    ["196-2", "= 8"],
  ]) {
    const before = visible(row, 0);
    const { page } = derivationAt(row, 0);
    const end = page.steps[page.steps.length - 1];
    assert.ok(visible(end.row, end.cue.at).includes(answer));
    assert.deepEqual(visible(row, 0), before);
    assert.ok(!visible(row, 1000).includes(answer));
    assert.ok(!page.context.some((line) => line.includes(answer)));
  }
});

test("new proof pages keep their prerequisites without revealing later steps", () => {
  const { page } = derivationAt("193-7", 0);
  assert.deepEqual(page.context, [
    "a = Y₂ − Y₁",
    "b = X₁ − X₂",
    "c = aX₁ + bY₁",
  ]);
  assert.deepEqual(visible("193-7", 0), ["(aX₂ + bY₂) − (aX₁ + bY₁)"]);
  assert.ok(visible("193-7", 23).includes("= 0"));
});

test("authored teaching groups preserve every retained line across columns", async () => {
  const { mathLineGroups } = await import("./math-lines.ts");
  for (const page of derivations) {
    assert.ok(page.groups, page.rows[0]);
    const split = page.columnBreak ?? page.lines.length;
    const groups = [
      ...mathLineGroups(page.lines, page.groups, false, 0, split),
      ...mathLineGroups(page.lines, page.groups, false, split),
    ];
    assert.deepEqual(
      groups.flatMap((group) => group.rows.map((row) => row.index)),
      page.lines.map((_, index) => index),
      page.rows[0],
    );
  }
});

test("incomplete group coverage fails instead of omitting a teaching step", async () => {
  const { mathLineGroups, left } = await import("./math-lines.ts");
  assert.throws(
    () => mathLineGroups(["(2, 6)", "6 ≠ 5"], [left(1)]),
    /every line/,
  );
});
