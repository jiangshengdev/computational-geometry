import { visuals } from "./scenes.ts";

// Page boundaries follow complete mathematical arguments, not narration rows.
// Context contains only facts already established before the page begins.
const pages: { rows: string[]; context: string[]; columnBreak?: number }[] = [
  { rows: ["190-1", "190-2", "190-3"], context: [], columnBreak: 4 },
  { rows: ["190-4", "190-5"], context: ["Y = 2X + 1"] },
  {
    rows: ["190-6", "190-7", "190-8"],
    context: ["同一条直线，等价变形"],
    columnBreak: 3,
  },
  {
    rows: ["191-1", "191-2", "191-3", "191-4", "191-5"],
    context: ["A = (1, 3)", "B = (3, 7)"],
    columnBreak: 6,
  },
  {
    rows: ["191-6", "191-7", "191-8"],
    context: ["a + 3b = c", "3a + 7b = c", "2a + 4b = 0"],
    columnBreak: 4,
  },
  {
    rows: ["192-1", "192-2", "192-3", "192-4", "192-5", "192-6"],
    context: ["a + 3b = c", "3a + 7b = c"],
    columnBreak: 6,
  },
  { rows: ["192-7", "192-8"], context: ["2a + 4b = 0", "a = 4", "b = −2"] },
  { rows: ["193-1"], context: ["a = 4", "b = −2", "aX + bY = c"] },
  { rows: ["193-2"], context: ["c = −2", "A = (1, 3)"] },
  { rows: ["193-3"], context: ["4X − 2Y = −2"], columnBreak: 6 },
  {
    rows: ["193-4", "193-5", "193-6"],
    context: ["A = (X₁, Y₁)", "B = (X₂, Y₂)", "aX + bY = c"],
    columnBreak: 2,
  },
  { rows: ["193-7"], context: ["a = Y₂ − Y₁", "b = X₁ − X₂", "c = aX₁ + bY₁"] },
  {
    rows: ["193-8"],
    context: ["a = Y₂ − Y₁", "b = X₁ − X₂", "两端点代入值都等于 c"],
    columnBreak: 6,
  },
  {
    rows: ["193-9"],
    context: ["两个端点不同", "b ≠ 0 时已证明；b = 0 接着检查"],
  },
  {
    rows: ["194-1", "194-2"],
    context: ["a = Y₂ − Y₁", "b = X₁ − X₂", "c = aX₁ + bY₁"],
    columnBreak: 4,
  },
  {
    rows: ["194-3"],
    context: ["aX + bY = c", "c = aX₁ + bY₁", "两个端点不同"],
  },
  {
    rows: ["194-4", "194-5"],
    context: ["a = Y₂ − Y₁", "b = X₁ − X₂", "c = aX₁ + bY₁"],
  },
  { rows: ["194-6"], context: ["a = Y₂ − Y₁", "b = X₁ − X₂", "c = aX₁ + bY₁"] },
  {
    rows: ["194-7"],
    context: ["水平线、竖直线都适用", "重合端点不能确定直线"],
  },
  {
    rows: ["195-1", "195-2", "195-3"],
    context: ["a = Y₂ − Y₁", "b = X₁ − X₂", "c = aX₁ + bY₁"],
    columnBreak: 6,
  },
  { rows: ["195-4"], context: ["a = 4", "b = −2", "c = −2"] },
  { rows: ["195-5"], context: ["同一条直线可以使用不同的系数"] },
  {
    rows: ["196-1", "196-2", "196-3", "196-4"],
    context: ["独立数轴练习：两个数都在 [−4, 4] 内"],
    columnBreak: 2,
  },
  {
    rows: ["196-5", "196-6"],
    context: ["端点差取法：a = Y₂ − Y₁", "b = X₁ − X₂"],
    columnBreak: 3,
  },
  {
    rows: ["196-7"],
    context: ["所有端点坐标的绝对值 ≤ M", "|a| ≤ 2M", "|b| ≤ 2M"],
  },
  {
    rows: ["196-8"],
    context: ["两个端点不同，坐标为整数", "端点坐标绝对值 ≤ M"],
  },
];

// Build once. Rendering any frame (including seeking backwards) is pure: no
// playback history, effects, or mutable accumulation can reveal future steps.
export const derivations = pages.map((page) => {
  const lines: string[] = [];
  let previousLines = new Map<string, number>();
  const steps = page.rows.flatMap((row) =>
    visuals[row].map((cue) => {
      const activeLines = cue.lines.map((line) => {
        let index = previousLines.get(line);
        if (index === undefined) {
          index = lines.length;
          lines.push(line);
        }
        return index;
      });
      // Keep context repeated by adjacent cues in place. A result reached again
      // later (e.g. X = 2 after 3X = 6) is a new step at the end of the proof.
      previousLines = new Map(
        cue.lines.map((line, index) => [line, activeLines[index]]),
      );
      return { row, cue, activeLines, visibleCount: lines.length };
    }),
  );
  return {
    ...page,
    lines,
    steps,
    graphic: steps.some(({ cue }) => cue.diagram !== "none"),
  };
});

export const derivationAt = (row: string, seconds: number) => {
  const page = derivations.find((item) => item.rows.includes(row));
  if (!page) throw new Error(`Missing derivation page for ${row}`);
  const steps = page.steps.filter((step) => step.row === row);
  const step =
    [...steps].reverse().find(({ cue }) => cue.at <= seconds) ?? steps[0];
  return { page, step };
};
