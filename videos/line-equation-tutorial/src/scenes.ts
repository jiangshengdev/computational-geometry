// Visual cues follow the Resolution rows in #190–#196. Times are local to each row.
import type { CoordinateScale } from "./coordinates";
export type Diagram =
  | "line"
  | "faint"
  | "points-a"
  | "points-ab"
  | "points-more"
  | "check"
  | "delta"
  | "vertical"
  | "horizontal"
  | "coincident"
  | "axis-question"
  | "axis-answer"
  | "axis-reverse"
  | "axis-general"
  | "axis-y"
  | "axis-x"
  | "intersection"
  | "none";
export type Cue = {
  at: number;
  lines: string[];
  diagram?: Diagram;
  note?: string;
  coordinateScale?: CoordinateScale;
};
export const titles = [
  "为什么先找直线方程？",
  "一个等式怎样表示一条线？",
  "两个端点给系数什么要求？",
  "怎样选，让两项抵消？",
  "c 怎么算，公式怎么推广？",
  "水平线、竖直线怎么办？",
  "为什么系数一定是整数？",
  "为什么 a、b 的绝对值不超过 2M？",
];
const cue = (
  at: number,
  lines: string[],
  diagram?: Diagram,
  note?: string,
): Cue => ({ at, lines, diagram, note });
export const visuals: Record<string, Cue[]> = {
  "190-1": [cue(0, ["Y = 2X + 1"], "faint", "X：横坐标　Y：纵坐标")],
  "190-2": [
    cue(0, ["X = 1", "Y = 2×1 + 1"], "faint"),
    cue(3, ["X = 1", "Y = 2×1 + 1 = 3"], "points-a"),
    cue(6.5, ["X = 3", "Y = 2×3 + 1"], "points-a"),
    cue(10, ["X = 3", "Y = 2×3 + 1 = 7"], "points-ab"),
  ],
  "190-3": [
    cue(0, ["Y = 2X + 1"], "points-more", "根据已学的一次函数知识"),
    cue(
      5,
      ["所有满足等式的点", "组成这条直线"],
      "line",
      "依据：一次函数的图像",
    ),
  ],
  "190-4": [cue(0, ["(2, 6)", "在这条直线上吗？"], "line", "先代入判断")],
  "190-5": [
    cue(0, ["2×2 + 1 = 5"], "line"),
    cue(3.2, ["2×2 + 1 = 5", "6 ≠ 5"], "line"),
    cue(6, ["6 ≠ 5", "(2, 6) 不在直线上"], "check"),
  ],
  "190-6": [
    cue(0, ["Y = 2X + 1"], "line", "两边同时减去 2X"),
    cue(2, ["Y − 2X = 1"], "line", "再同时乘以 −1"),
    cue(5, ["2X − Y = −1"], "line", "满足等式的点没有改变"),
  ],
  "190-7": [
    cue(0, ["2X + (−1)Y = −1", "aX + bY = c"], "line"),
    cue(
      3,
      ["a = 2　b = −1　c = −1", "aX + bY = c"],
      "line",
      "a、b、c 固定；X、Y 随点变化",
    ),
  ],
  "190-8": [cue(0, ["aX + bY = c", "怎样找到 a、b、c？"], "line")],
  "191-1": [cue(0, ["aX + bY = c"], "line", "两个端点必须满足同一个方程")],
  "191-2": [
    cue(0, ["A = (1, 3)", "a×1 + b×3 = c"], "line"),
    cue(10, ["A = (1, 3)", "a + 3b = c"], "line"),
  ],
  "191-3": [
    cue(0, ["a + 3b = c", "a×3 + b×7 = c"], "line"),
    cue(4, ["a + 3b = c", "3a + 7b = c"], "line", "两式中的 a、b、c 完全相同"),
  ],
  "191-4": [
    cue(0, ["a + 3b = c", "3a + 7b = c"], "line"),
    cue(4, ["(3a + 7b) − (a + 3b)", "= c − c"], "line"),
    cue(11, ["(3a + 7b) − (a + 3b)", "= 0"], "line"),
  ],
  "191-5": [
    cue(0, ["3a + 7b − a − 3b = 0"], "line", "括号里的两项都变号"),
    cue(5, ["(3a − a) + (7b − 3b) = 0"], "line"),
    cue(11, ["2a + 4b = 0"], "line"),
  ],
  "191-6": [
    cue(0, ["3 − 1 = 2", "aX 的变化：2a"], "delta"),
    cue(9, ["7 − 3 = 4", "bY 的变化：4b"], "delta", "虚线只用于比较坐标"),
  ],
  "191-7": [
    cue(0, ["A 代入：c", "B 代入：c"], "delta"),
    cue(6, ["差：c − c = 0", "2a + 4b = 0"], "delta", "带正负号的变化"),
  ],
  "191-8": [cue(0, ["2a + 4b = 0", "怎样选，让两项抵消？"], "delta")],
  "192-1": [cue(0, ["2a + 4b = 0"], "delta", "两项的绝对值相同，符号相反")],
  "192-2": [cue(0, ["2a + 4b = 0", "2×4 = 4×2"], "delta", "乘法交换律")],
  "192-3": [
    cue(0, ["a = 4", "2×4 + 4b = 0"], "delta"),
    cue(5, ["a = 4", "8 + 4b = 0"], "delta"),
  ],
  "192-4": [cue(0, ["8 + 4b = 0", "b 应该是多少？"], "delta", "想一想")],
  "192-5": [
    cue(0, ["第二项需要等于 −8"], "delta"),
    cue(4, ["4×(−2) = −8"], "delta"),
    cue(9, ["b = −2"], "delta"),
  ],
  "192-6": [
    cue(0, ["2×4 + 4×(−2)"], "delta"),
    cue(4, ["= 8 + (−8)"], "delta"),
    cue(8, ["= 0"], "delta", "代回检查：符合要求"),
  ],
  "192-7": [
    cue(
      0,
      ["纵坐标变化 4 → a = 4", "横坐标变化 2 → b = −2"],
      "delta",
      "这不是唯一答案",
    ),
  ],
  "192-8": [cue(0, ["4X − 2Y = c"], "line", "c 怎样确定？")],
  "193-1": [
    cue(0, ["4X − 2Y = c", "A = (1, 3)"], "line"),
    cue(6, ["c = 4×1 − 2×3"], "line"),
    cue(11, ["c = 4 − 6"], "line"),
    cue(15, ["c = −2"], "line"),
  ],
  "193-2": [
    cue(0, ["4X − 2Y = −2", "B = (3, 7)"], "line"),
    cue(3, ["4×3 − 2×7"], "line"),
    cue(6, ["= 12 − 14"], "line"),
    cue(9, ["= −2"], "line"),
  ],
  "193-3": [
    cue(0, ["A = (1, 3)", "B = (3, 7)"], "line"),
    cue(3, ["1 → X₁", "A = (X₁, 3)"], "line"),
    cue(6, ["3 → Y₁", "A = (X₁, Y₁)"], "line"),
    cue(9, ["3 → X₂", "B = (X₂, 7)"], "line"),
    cue(
      12,
      ["7 → Y₂", "B = (X₂, Y₂)"],
      "line",
      "1、2 是两个点的编号，不是乘法",
    ),
  ],
  "193-4": [
    cue(0, ["a = 7 − 3 = 4"], "delta"),
    cue(5, ["a = Y₂ − Y₁"], "delta", "第二个纵坐标 − 第一个纵坐标"),
  ],
  "193-5": [
    cue(0, ["横坐标变化：X₂ − X₁"], "delta"),
    cue(4, ["b = −(X₂ − X₁)"], "delta"),
    cue(9, ["b = −X₂ + X₁"], "delta", "两项都变号"),
    cue(13, ["b = X₁ − X₂"], "delta"),
  ],
  "193-6": [
    cue(0, ["aX + bY = c"], "line"),
    cue(5, ["c = aX₁ + bY₁"], "line", "第一个点一定满足方程"),
  ],
  "193-7": [
    cue(0, ["(aX₂ + bY₂) − (aX₁ + bY₁)"], "none", "比较两点代入值"),
    cue(5, ["aX₂ + bY₂ − aX₁ − bY₁"], "none", "展开"),
    cue(10, ["a(X₂ − X₁) + b(Y₂ − Y₁)"], "none", "合并"),
    cue(
      16,
      ["(Y₂ − Y₁)(X₂ − X₁)", "− (X₂ − X₁)(Y₂ − Y₁)"],
      "none",
      "相同乘积相减",
    ),
    cue(23, ["= 0", "两个点代入值相同，都等于 c"], "none"),
  ],
  "193-8": [
    cue(0, ["端点不同", "a、b 不同时为零"], "none"),
    cue(6, ["当 b ≠ 0", "aX + bY = c"], "none"),
    cue(10, ["bY = c − aX"], "none", "移项"),
    cue(13, ["Y = −(a/b)X + c/b"], "none", "除以非零的 b；a = 0 时是水平线"),
    cue(
      19,
      ["经过两个不同端点的直线", "就是我们要找的直线"],
      "none",
      "b = 0：下一段检查",
    ),
  ],
  "193-9": [
    cue(
      0,
      ["a = Y₂ − Y₁", "b = X₁ − X₂", "c = aX₁ + bY₁"],
      "none",
      "先算两个差，再代入一个点",
    ),
  ],
  "194-1": [
    cue(0, ["(2, 1)　(2, 4)", "X = 2"], "vertical", "每个点的横坐标都是 2"),
  ],
  "194-2": [
    cue(0, ["a = 4 − 1 = 3"], "vertical"),
    cue(3, ["b = 2 − 2 = 0"], "vertical"),
    cue(5, ["c = 3×2 + 0×1 = 6"], "vertical"),
    cue(8, ["3X + 0Y = 6"], "vertical"),
    cue(10, ["3X = 6"], "vertical"),
    cue(13, ["X = 2"], "vertical", "两边除以 3"),
  ],
  "194-3": [
    cue(0, ["b = 0，a ≠ 0"], "vertical", "两个横坐标相同，纵坐标不同"),
    cue(6, ["c = aX₁"], "vertical"),
    cue(9, ["aX = aX₁"], "vertical"),
    cue(12, ["X = X₁"], "vertical", "除以非零的 a，补齐直线证明"),
  ],
  "194-4": [cue(0, ["(1, 3)　(4, 3)", "Y = 3"], "horizontal")],
  "194-5": [
    cue(0, ["a = 3 − 3 = 0"], "horizontal"),
    cue(3, ["b = 1 − 4 = −3"], "horizontal"),
    cue(5, ["c = 0×1 + (−3)×3 = −9"], "horizontal"),
    cue(8, ["−3Y = −9"], "horizontal"),
    cue(11, ["Y = 3"], "horizontal", "两边除以 −3"),
  ],
  "194-6": [
    cue(0, ["两个端点重合于 (1, 3)"], "coincident"),
    cue(3, ["a = 3 − 3 = 0", "b = 1 − 1 = 0", "c = 0"], "coincident"),
    cue(7, ["0 = 0"], "coincident", "任何坐标代入都成立"),
    cue(11, ["不能确定一条直线"], "coincident", "经过一个点，可以画许多条直线"),
  ],
  "194-7": [
    cue(
      0,
      ["两个端点必须不同", "a = Y₂ − Y₁", "b = X₁ − X₂", "c = aX₁ + bY₁"],
      "none",
    ),
  ],
  "195-1": [cue(0, ["A = (1, 3)", "B = (3, 7)"], "line", "端点坐标都是整数")],
  "195-2": [
    cue(0, ["a = 7 − 3 = 4", "a = Y₂ − Y₁"], "line"),
    cue(6, ["b = 1 − 3 = −2", "b = X₁ − X₂"], "line", "整数 − 整数 = 整数"),
  ],
  "195-3": [
    cue(
      0,
      ["c = 4×1 + (−2)×3 = −2", "c = aX₁ + bY₁"],
      "line",
      "两次整数乘法，再相加",
    ),
    cue(7, ["只用加、减、乘", "没有除法"], "line"),
  ],
  "195-4": [
    cue(0, ["2X − Y = −1"], "line"),
    cue(4, ["2X − Y = −1", "↓ 两边同乘 2", "4X − 2Y = −2"], "line"),
    cue(
      9,
      ["2X − Y = −1", "↑ 两边同除以 2", "4X − 2Y = −2"],
      "line",
      "满足方程的点完全相同",
    ),
  ],
  "195-5": [
    cue(
      0,
      ["a = 4　b = −2　c = −2", "a = Y₂ − Y₁", "b = X₁ − X₂", "c = aX₁ + bY₁"],
      "none",
      "后面固定使用端点差取法",
    ),
  ],
  "196-1": [
    cue(
      0,
      ["两个数都在 [−4, 4] 内", "最多相差多少？"],
      "axis-question",
      "这是一个独立的数轴问题",
    ),
  ],
  "196-2": [
    cue(
      0,
      ["两个数都在 [−4, 4] 内", "最多相差多少？"],
      "axis-question",
      "想一想",
    ),
  ],
  "196-3": [
    cue(0, ["4 − (−4)"], "axis-answer"),
    cue(6, ["4 + 4"], "axis-answer"),
    cue(10, ["= 8"], "axis-answer"),
  ],
  "196-4": [
    cue(0, ["−4 − 4 = −8"], "axis-reverse"),
    cue(6, ["|8| = |−8| = 8"], "axis-reverse", "正负改变，距离不变"),
  ],
  "196-5": [
    cue(
      0,
      ["整数 M ≥ 1", "所有端点坐标的绝对值 ≤ M"],
      "axis-general",
      "M 不必是最小上界",
    ),
    cue(9, ["M − (−M) = 2M"], "axis-general"),
  ],
  "196-6": [
    cue(0, ["a = Y₂ − Y₁"], "axis-y"),
    cue(3, ["|a| = |Y₂ − Y₁| ≤ 2M"], "axis-y"),
    cue(7, ["b = X₁ − X₂"], "axis-x"),
    cue(
      10,
      ["|a| = |Y₂ − Y₁| ≤ 2M", "|b| = |X₁ − X₂| ≤ 2M"],
      "axis-x",
      "减法顺序不影响上界",
    ),
  ],
  "196-7": [
    cue(
      0,
      ["仅限端点差取法", "仅限制 |a|、|b|"],
      "none",
      "任意放大方程后，不能继续照用",
    ),
    cue(8, ["c = aX₁ + bY₁", "这里没有给出 |c| ≤ 2M"], "none"),
  ],
  "196-8": [
    cue(
      0,
      ["a = Y₂ − Y₁", "b = X₁ − X₂", "c = aX₁ + bY₁"],
      "none",
      "两点不同，坐标为整数 → 整数系数；|a|、|b| ≤ 2M",
    ),
    cue(9, ["下一篇：交点坐标的分母"], "intersection", "联立两条直线的方程"),
  ],
};
