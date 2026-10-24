import { equals, left } from "../../shared/math/math-lines.ts";
import type { Page, Shot } from "./storyboard.ts";

export const coefficientPages: Record<string, Page> = {
  indices: {
    title: "先给两个端点的坐标编号",
    mode: "下标 1、2 区分端点，不表示乘法或平方",
    diagram: "integer",
    lines: [
      { math: "P'=(X_1,Y_1)=(3,-4)" },
      { math: "Q'=(X_2,Y_2)=(-2,1)" },
      { text: "X 表示横坐标，Y 表示纵坐标" },
      { text: "下标 1 对应 P′，下标 2 对应 Q′" },
    ],
    groups: [left(2), left(2)],
    note: "此后都使用放大后的坐标",
  },
  coefficients: {
    title: "直线方程里的系数从哪里来？",
    mode: "用两个不同端点的坐标差，构造一组系数",
    diagram: "integer",
    lines: [
      { math: "aX+bY=c" },
      { text: "a、b 是系数，c 是右侧常数" },
      { math: "a=Y_2-Y_1" },
      { math: "b=X_1-X_2" },
      { math: "c=aX_1+bY_1" },
    ],
    groups: [left(2), equals(2), left(1)],
    holdAfterSeconds: 5,
    note: "aX 表示 a 乘 X；本集只估计这种取法的 a、b",
  },
  calculateA: {
    title: "先算 a：第二个纵坐标减第一个",
    mode: "Y₁=−4，Y₂=1 · 减去负数等于加上对应正数",
    diagram: "integer",
    lines: [
      { math: "a=Y_2-Y_1" },
      { math: "a=1-(-4)" },
      { math: "a=1+4" },
      { math: "a=5" },
    ],
    groups: [equals(4)],
    holdAfterSeconds: 5,
    note: "纵坐标之差，成为横坐标 X 前面的系数",
  },
  calculateB: {
    title: "再算 b：第一个横坐标减第二个",
    mode: "X₁=3，X₂=−2 · 注意减法的次序",
    diagram: "integer",
    lines: [
      { math: "b=X_1-X_2" },
      { math: "b=3-(-2)" },
      { math: "b=3+2" },
      { math: "b=5" },
      { text: "整数相减，a、b 都是整数" },
    ],
    groups: [equals(4), left(1)],
    holdAfterSeconds: 5,
    note: "横坐标之差，成为纵坐标 Y 前面的系数",
  },
  distance: {
    title: "两个坐标，最多能相差多少？",
    mode: "先看数轴：区间 [−M,M] 的两端最远",
    diagram: "distance",
    lines: [
      { text: "两个坐标都在 −M 到 M 之间" },
      { math: "M-(-M)=M+M=2M" },
      { text: "任意两点的距离不超过 2M" },
      { text: "交换减法次序，只会改变差的符号" },
      { text: "取绝对值后，表示同一个距离" },
    ],
    groups: [left(1), left(1), left(3)],
    holdAfterSeconds: 5,
    note: "2M 表示 2 乘 M，是上界，不是每次的实际距离",
  },
  bounds: {
    title: "把距离上界用到 a、b",
    mode: "两个纵坐标的差、两个横坐标的差，都适用",
    diagram: "range",
    lines: [
      { math: "|a|=|Y_2-Y_1|\\le2M" },
      { math: "|b|=|X_1-X_2|\\le2M" },
      { math: "M=4,\\quad2M=8" },
      { math: "|a|=|b|=5\\le8" },
      { text: "实际是 5，上界是 8，不必相等" },
    ],
    groups: [left(2), left(2), left(1)],
    holdAfterSeconds: 5,
    note: "只针对这里按端点差构造的系数，不是任意倍数的系数",
  },
  conclusion: {
    title: "本集小结：整数坐标与系数范围",
    mode: "先统一缩放，再确定 M，最后估计坐标差",
    diagram: "integer",
    lines: [
      { math: "X=Dx,\\quad Y=Dy" },
      { text: "M：1 与全部端点坐标绝对值的最大值" },
      { math: "a,b,c\\in\\mathbb Z" },
      { math: "|a|\\le2M,\\quad|b|\\le2M" },
      { text: "交点仍可能是分数" },
    ],
    groups: [left(2), left(2), left(1)],
    holdAfterSeconds: 5,
    note: "不推出 |c|≤2M；为下一集的交点分母估计做准备",
    noteFromStep: 5,
  },
};

export const coefficientShots: Shot[] = [
  {
    id: "218-01",
    page: "indices",
    step: 1,
    caption: "为了写公式，把 P′ 的横纵坐标记作 X₁、Y₁，它们分别是 3 和负 4。",
  },
  {
    id: "218-02",
    page: "indices",
    step: 2,
    caption: "把 Q′ 的横纵坐标记作 X₂、Y₂，它们分别是负 2 和 1。",
  },
  {
    id: "218-03",
    page: "indices",
    step: 4,
    caption:
      "X 表示横坐标，Y 表示纵坐标。右下角的 1、2 叫下标，用来区分两个端点，不是乘法，也不是平方。",
  },
  {
    id: "218-04",
    page: "coefficients",
    step: 2,
    caption:
      "直线方程可以写成 aX+bY=c。aX 表示 a 乘 X，bY 表示 b 乘 Y。a、b 是系数，c 是右侧常数。",
  },
  {
    id: "218-05",
    page: "coefficients",
    step: 3,
    caption:
      "给定两个不同端点，可以这样取系数：a 等于第二个纵坐标减第一个纵坐标。",
  },
  {
    id: "218-06",
    page: "coefficients",
    step: 4,
    caption: "b 等于第一个横坐标减第二个横坐标，注意这里的减法次序。",
  },
  {
    id: "218-07",
    page: "coefficients",
    step: 5,
    caption:
      "再把第一个端点代入，取 c=aX₁+bY₁，就确定了右侧常数。本集不重讲方程证明，只研究这样取出的系数范围。",
  },
  {
    id: "218-08",
    page: "calculateA",
    step: 1,
    caption: "先算 a，取第二个纵坐标减第一个纵坐标。",
  },
  {
    id: "218-09",
    page: "calculateA",
    step: 2,
    caption: "代入 1 和负 4，得到 1 减负 4。",
  },
  {
    id: "218-10",
    page: "calculateA",
    step: 3,
    caption: "减去负 4，相当于加 4，所以变成 1 加 4。",
  },
  {
    id: "218-11",
    page: "calculateA",
    step: 4,
    caption: "算出 a=5。这是横坐标 X 前面的系数，却来自两个纵坐标的差。",
  },
  {
    id: "218-12",
    page: "calculateB",
    step: 1,
    caption: "再算 b，取第一个横坐标减第二个横坐标。",
  },
  {
    id: "218-13",
    page: "calculateB",
    step: 2,
    caption: "代入 3 和负 2，得到 3 减负 2。",
  },
  {
    id: "218-14",
    page: "calculateB",
    step: 3,
    caption: "减去负 2 相当于加 2，变成 3 加 2。",
  },
  {
    id: "218-15",
    page: "calculateB",
    step: 5,
    caption:
      "所以 b=5，它来自两个横坐标的差。整数相减仍是整数，因此 a、b 都是整数。",
  },
  {
    id: "218-16",
    page: "distance",
    step: 1,
    caption:
      "现在不只看本例。只要两个坐标都在负 M 到 M 之间，它们最多能相差多少？",
  },
  {
    id: "218-17",
    page: "distance",
    step: 2,
    caption:
      "最远的是区间两端。从负 M 到 M 的距离，是 M 减负 M，等于 M 加 M，也就是 2 乘 M。",
  },
  {
    id: "218-18",
    page: "distance",
    step: 3,
    caption: "区间里任意两个数之间的距离，都不会超过整个区间的长度 2M。",
  },
  {
    id: "218-19",
    page: "distance",
    step: 4,
    caption: "交换减法次序，只会让差变成相反数，零仍然是零。",
  },
  {
    id: "218-20",
    page: "distance",
    step: 5,
    caption: "取绝对值后，两种次序表示同一个距离，所以都不超过 2M。",
  },
  {
    id: "218-21",
    page: "bounds",
    step: 1,
    caption: "a 是两个纵坐标的差，所以 a 的绝对值不超过 2M。",
  },
  {
    id: "218-22",
    page: "bounds",
    step: 2,
    caption: "b 是两个横坐标的差，因此 b 的绝对值也不超过 2M。",
  },
  {
    id: "218-23",
    page: "bounds",
    step: 3,
    caption: "回到本例，M=4，所以 2M=8。",
  },
  {
    id: "218-24",
    page: "bounds",
    step: 5,
    caption:
      "a、b 的绝对值都是 5，确实不超过 8。5 是实际值，8 是上界，上界不一定达到。",
  },
  {
    id: "218-25",
    page: "conclusion",
    step: 1,
    caption:
      "回顾一下：选择同一个正整数公共分母，把全部输入端点的两个坐标统一缩放为整数。",
  },
  {
    id: "218-26",
    page: "conclusion",
    step: 2,
    caption: "再取 1 与全部端点坐标绝对值的最大值，这就是 M 的定义。",
  },
  {
    id: "218-27",
    page: "conclusion",
    step: 3,
    caption:
      "按刚才的公式，a、b 是整数之差，c 是整数乘积的和，所以这三个系数都是整数。符号 Z 表示整数集合。",
  },
  {
    id: "218-28",
    page: "conclusion",
    step: 4,
    caption:
      "这里按端点差取出的 a、b，绝对值都不超过 2M。如果把方程整体乘一个大数，新系数不一定满足这个上界。",
  },
  {
    id: "218-29",
    page: "conclusion",
    step: 5,
    caption:
      "我们没有得到 c 的绝对值也不超过 2M，更不能保证交点都是整数。交点仍可能是分数，下一集再研究它们的分母。",
  },
];
