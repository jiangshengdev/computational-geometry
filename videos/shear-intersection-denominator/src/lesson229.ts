import { equals, left } from "../../shared/math/math-lines.ts";
import type { Page, Shot } from "./storyboard.ts";

export const pages229: Record<string, Page> = {
  "229-integer": {
    title: "先问：这个除数能有多小？",
    mode: "整数系数 · 两条直线有唯一交点",
    panel: {
      title: "沿用刚才的结论",
      lines: ["Δ=a₁b₂−a₂b₁", "两坐标都以 Δ 为除数", "Δ≠0"],
    },
    lines: [
      { text: "整数相乘、相减，结果仍是整数" },
      { text: "非零整数：…，−2，−1，1，2，…" },
      { math: "1\\le |\\Delta|" },
    ],
    groups: [left(2), left(1)],
    note: "整数性质和非零条件，缺一不可",
  },
  "229-products": {
    title: "再问：两个乘积能有多大？",
    mode: "每个系数的绝对值，都不超过 2M",
    panel: {
      title: "上一集给出的范围",
      lines: ["M≥1", "|a₁|,|b₁|≤2M", "|a₂|,|b₂|≤2M"],
    },
    lines: [
      { math: "|a_1b_2|=|a_1|\\,|b_2|" },
      { math: "|a_1b_2|\\le(2M)(2M)=4M^2" },
      { math: "|a_2b_1|=|a_2|\\,|b_1|" },
      { math: "|a_2b_1|\\le(2M)(2M)=4M^2" },
    ],
    groups: [left(2), left(2)],
    holdAfterSeconds: 5,
    note: "M 的平方来自 M 乘 M，4 来自 2 乘 2",
  },
  "229-difference": {
    title: "相减，为什么还要把上界相加？",
    mode: "先用具体数字，检查相减的结果",
    panel: {
      title: "除数的结构",
      lines: ["Δ=a₁b₂−a₂b₁", "一个乘积减去另一个乘积", "两个乘积都可能为负"],
    },
    lines: [
      { math: "3-(-4)=3+4=7" },
      { math: "|3-(-4)|=|3|+|-4|=7" },
      { text: "减去负数，绝对值可能变大" },
      { text: "异号时相加；同号时不会超过相加" },
    ],
    groups: [left(2), left(2)],
    holdAfterSeconds: 5,
    note: "减法不保证绝对值变小；需要覆盖所有正负情况",
  },
  "229-bound": {
    title: "把各步接起来：得到除数的界",
    mode: "每一步都有理由，不直接跳到最终结果",
    panel: {
      title: "现在已经知道",
      lines: ["1≤|Δ|", "|a₁b₂|≤4M²", "|a₂b₁|≤4M²"],
    },
    lines: [
      { math: "|\\Delta|=|a_1b_2-a_2b_1|" },
      { math: "|\\Delta|\\le |a_1b_2|+|a_2b_1|" },
      { math: "|\\Delta|\\le4M^2+4M^2=8M^2" },
      { math: "1\\le|\\Delta|\\le8M^2" },
    ],
    groups: [left(1), left(2), left(1)],
    holdAfterSeconds: 5,
    note: "非零整数给出下界；系数范围给出上界",
  },
  "229-numerators": {
    title: "从除数，走到坐标的分母",
    mode: "横坐标与纵坐标，使用同一个理由",
    panel: {
      title: "前提仍然有效",
      lines: ["a₁、b₁、c₁ 都是整数", "a₂、b₂、c₂ 都是整数", "1≤|Δ|≤8M²"],
    },
    lines: [
      { math: "X=\\frac{c_1b_2-c_2b_1}{\\Delta}" },
      { math: "Y=\\frac{a_1c_2-a_2c_1}{\\Delta}" },
      { text: "两个分子都是整数" },
      { text: "接下来：分母转正，再约分" },
    ],
    groups: [equals(2), left(2)],
    holdAfterSeconds: 5,
    note: "估计正分母，还要说明符号和约分的影响",
  },
  "229-positive": {
    title: "分母是负数时，怎样转正？",
    mode: "分子分母同时乘 −1，分数的值不变",
    panel: {
      title: "只改变写法",
      lines: [
        "Δ 可能为正，也可能为负",
        "坐标的值必须保持不变",
        "正分母便于统一比较",
      ],
    },
    lines: [
      { math: "\\frac{6}{-8}=\\frac{6\\times(-1)}{(-8)\\times(-1)}" },
      { math: "\\frac{6}{-8}=\\frac{-6}{8}" },
      { text: "Δ 为负时，分子分母同时变号" },
      { text: "转正后的分母就是 |Δ|" },
    ],
    groups: [equals(2), left(2)],
    holdAfterSeconds: 5,
    note: "Δ 为正时不用变号；两种情况都得到正分母 |Δ|",
  },
  "229-reduce": {
    title: "约分，会把正分母变大吗？",
    mode: "分子分母除以同一个正整数公因数",
    panel: {
      title: "约分前",
      lines: ["分子为整数", "正分母为 |Δ|", "|Δ|≤8M²"],
    },
    lines: [
      { math: "\\frac{-6}{8}=\\frac{-6\\div2}{8\\div2}=\\frac{-3}{4}" },
      { text: "能约分：正分母缩小" },
      { text: "不能再约分：正分母保持不变" },
      { text: "约分后的正分母 ≤ |Δ| ≤ 8M²" },
    ],
    groups: [left(1), left(3)],
    holdAfterSeconds: 5,
    note: "分子为 0 时写成 0/1，正分母也是 1",
  },
  "229-scope": {
    title: "这个分母上界，适用于什么坐标？",
    mode: "保留前提，才能正确使用结论",
    panel: {
      title: "本集的约定",
      lines: ["统一缩放后的坐标", "整数输入端点", "沿用上一集的系数取法"],
    },
    lines: [
      { text: "交点坐标：约分后的正分母 ≤ 8M²" },
      { text: "整数端点：可写成分母为 1 的分数" },
      { math: "1\\le8M^2\\quad(M\\ge1)" },
      { text: "非零倍乘系数后，须重新检查系数界" },
    ],
    groups: [left(2), left(2)],
    note: "非零倍乘保持直线，但不能直接沿用原来的系数界",
  },
  question229: {
    title: "最后判断：上界就是实际分母吗？",
    mode: "第二次练习 · 保留 4 秒思考时间",
    panel: {
      title: "已知结论",
      lines: [
        "统一缩放后的坐标",
        "约分后的正分母 ≤ 8M²",
        "想一想刚才的具体例题",
      ],
    },
    lines: [
      { text: "正分母不超过 8M²" },
      { text: "是否意味着分母一定等于 8M²？" },
    ],
    groups: [left(1), left(1)],
    note: "先判断，再看解释",
  },
  "229-answer": {
    title: "上界是一道保证，不是每次的答案",
    mode: "回到例题，区分保证值与实际值",
    panel: {
      title: "例题仍可直接核对",
      lines: ["X+Y=1，X−Y=0", "P=(1/2,1/2)", "端点范围允许取 M=1"],
    },
    lines: [
      { math: "8M^2=8\\quad(M=1)" },
      { math: "2<8" },
      { text: "实际正分母是 2，不必等于上界 8" },
      { text: "证明了上界，不等于证明它能够达到" },
    ],
    groups: [left(2), left(2)],
    holdAfterSeconds: 5,
    note: "本集得到保证：约分后的正分母不超过 8M²",
  },
};

export const shots229: Shot[] = [
  {
    id: "229-01",
    page: "229-integer",
    step: 1,
    caption: "承接刚才的交点公式，Δ 是两个整数乘积的差，所以仍是整数。",
  },
  {
    id: "229-02",
    page: "229-integer",
    step: 2,
    caption:
      "两条直线有唯一交点时，Δ 不等于零。非零整数离零最近的值，是 −1 和 1。",
  },
  {
    id: "229-03",
    page: "229-integer",
    step: 3,
    caption: "因此，Δ 的绝对值至少为 1。整数和非零这两个条件，缺一不可。",
  },
  {
    id: "229-04",
    page: "229-products",
    step: 1,
    caption: "先估计 a₁b₂。乘积的绝对值，等于两个因子的绝对值相乘。",
  },
  {
    id: "229-05",
    page: "229-products",
    step: 2,
    caption:
      "每个因子的绝对值都不超过 2M。把这个上界与自身相乘，得到 4M²。这就是两个因子乘积的绝对值的上界。",
  },
  {
    id: "229-06",
    page: "229-products",
    step: 4,
    caption:
      "另一个乘积 a₂b₁ 也一样，它的绝对值不超过 4M²。4 来自 2 乘 2，M² 来自 M 乘 M。",
  },
  {
    id: "229-07",
    page: "229-difference",
    step: 1,
    caption:
      "Δ 是两个乘积相减，但相减不保证结果的绝对值变小。比如，3 减 −4，等于 3 加 4，也就是 7。",
  },
  {
    id: "229-08",
    page: "229-difference",
    step: 3,
    caption:
      "这里，差的绝对值，正好等于两个数的绝对值之和。减去负数，反而会让结果变大。",
  },
  {
    id: "229-09",
    page: "229-difference",
    step: 4,
    caption:
      "两数异号时，差的绝对值等于绝对值之和；同号时，是较大的绝对值减去较小的，也不会超过它们的和。",
  },
  {
    id: "229-10",
    page: "229-bound",
    step: 1,
    caption:
      "回到 Δ。先用 a₁ 与 b₂ 的乘积，减去 a₂ 与 b₁ 的乘积，再取这个差的绝对值。",
  },
  {
    id: "229-11",
    page: "229-bound",
    step: 2,
    caption:
      "因此，Δ 的绝对值，不超过这两个乘积的绝对值之和。即使其中有零，这个不等式也成立。",
  },
  {
    id: "229-12",
    page: "229-bound",
    step: 3,
    caption: "两个乘积的绝对值，各不超过 4M²，加起来就不超过 8M²。",
  },
  {
    id: "229-13",
    page: "229-bound",
    step: 4,
    caption:
      "再接上非零整数给出的下界，我们得到：Δ 的绝对值至少为 1，至多为 8M²。",
  },
  {
    id: "229-14",
    page: "229-numerators",
    step: 2,
    caption:
      "看看横坐标和纵坐标的公式。它们的分子，也都是整数相乘再相减，所以都是整数。",
  },
  {
    id: "229-15",
    page: "229-numerators",
    step: 3,
    caption:
      "于是，两个坐标都写成了整数除以非零整数。现在还要说明，分母转正和约分，会不会破坏刚才的上界。",
  },
  {
    id: "229-16",
    page: "229-numerators",
    step: 4,
    caption: "我们先把分母转成正数，再看约分后的正分母。",
  },
  {
    id: "229-17",
    page: "229-positive",
    step: 1,
    caption: "例如，6 除以 −8。分子分母同时乘 −1，分数的值不变。",
  },
  {
    id: "229-18",
    page: "229-positive",
    step: 2,
    caption: "分子变成 −6，分母变成正的 8，所以可以写成 −6/8。",
  },
  {
    id: "229-19",
    page: "229-positive",
    step: 4,
    caption:
      "Δ 为负时，就这样同时变号；Δ 为正时，不用变号。两种情况，正分母都是 Δ 的绝对值。",
  },
  {
    id: "229-20",
    page: "229-reduce",
    step: 1,
    caption:
      "再看约分。−6/8 的分子分母同除以 2，得到 −3/4，正分母从 8 缩小到 4。",
  },
  {
    id: "229-21",
    page: "229-reduce",
    step: 2,
    caption:
      "约分时，分子分母同除以一个大于 1 的正整数公因数，所以正分母只会缩小。",
  },
  {
    id: "229-22",
    page: "229-reduce",
    step: 3,
    caption:
      "如果已经不能约分，正分母就保持不变。分子为零时，直接写成 0/1，正分母为 1。",
  },
  {
    id: "229-23",
    page: "229-reduce",
    step: 4,
    caption: "因此，约分后的正分母，不超过 Δ 的绝对值，也就不超过 8M²。",
  },
  {
    id: "229-24",
    page: "229-scope",
    step: 1,
    caption:
      "这个结论说的是统一缩放后的坐标，并且使用上一集约定的整数系数取法。",
  },
  {
    id: "229-25",
    page: "229-scope",
    step: 3,
    caption:
      "输入端点坐标是整数，可以写成分母为 1 的分数。因为 M 至少为 1，它们也满足这个分母上界。",
  },
  {
    id: "229-26",
    page: "229-scope",
    step: 4,
    caption:
      "把直线方程乘一个非零倍数，直线虽然不变，系数可能改变。不能直接把原来的系数界，套在倍乘后的系数上。",
  },
  {
    id: "229-27",
    page: "question229",
    step: 2,
    caption:
      "最后判断：约分后的正分母不超过 8M²，是否意味着，它一定等于 8M²？留四秒，想一想。",
    pauseAfter: 4,
  },
  {
    id: "229-28",
    page: "229-answer",
    step: 1,
    caption:
      "答案是否定的。回到开头的例题，端点坐标都在零到一之间，可以取 M 等于 1，此时上界为 8。",
  },
  {
    id: "229-29",
    page: "229-answer",
    step: 3,
    caption: "但交点的两个坐标都是 1/2，实际正分母是 2，比上界 8 小。",
  },
  {
    id: "229-30",
    page: "229-answer",
    step: 4,
    caption:
      "所以，8M² 是一个保证的上界，不是每个交点的实际分母。这段证明也没有说明，这个上界一定能够达到。",
  },
];
