import type { TeachingGroup } from "../../shared/math/math-lines.ts";
export type Line = { math?: string; text?: string };
export type Page = {
  title: string;
  lines: Line[];
  groups: TeachingGroup[];
  basis: { from: string; math: string }[];
  diagram?: "numeric" | "similar";
  referenceDiagram?: boolean;
  holdAfterSeconds: number;
};
export type Shot = { id: string; page: string; step: number; caption: string };
const left = (count: number): TeachingGroup[] => [{ count, align: "left" }];
export const pages: Record<string, Page> = {
  numeric: {
    title: "从具体线段上的位置说起",
    diagram: "numeric",
    basis: [],
    holdAfterSeconds: 5,
    groups: left(4),
    lines: [
      { math: "A=(1,1),\\quad B=(5,3)" },
      { math: "5-1=4,\\quad 3-1=2" },
      { math: "M=(1+2,1+1)=(3,2)" },
      { math: "Q=(1+1,1+\\tfrac12)=(2,\\tfrac32)" },
    ],
  },
  symbols: {
    title: "把具体坐标换成一般符号",
    basis: [],
    holdAfterSeconds: 5,
    groups: left(4),
    lines: [
      { math: "A=(a_x,a_y),\\quad B=(b_x,b_y)" },
      { text: "下标标记横、纵坐标，不是乘法" },
      { math: "P=(x,y),\\quad u=\\frac{AP}{AB}\\quad(A\\ne B)" },
      { math: "0\\le u\\le1,\\quad u=0:\\ P=A,\\quad u=1:\\ P=B" },
    ],
  },
  similar: {
    title: "为什么横向、纵向都取同一比例？",
    diagram: "similar",
    holdAfterSeconds: 5,
    basis: [
      { from: "242-05", math: "A=(a_x,a_y),\\quad B=(b_x,b_y)" },
      { from: "242-07", math: "A\\ne B,\\quad P=(x,y),\\quad u=AP/AB" },
    ],
    groups: left(3),
    lines: [
      { math: "H=(b_x,a_y),\\quad K=(x,a_y)" },
      { math: "\\triangle AKP\\sim\\triangle AHB" },
      { math: "\\frac{AK}{AH}=\\frac{KP}{HB}=\\frac{AP}{AB}=u" },
    ],
  },
  changes: {
    diagram: "similar",
    title: "长度比例，变成带方向的坐标变化",
    holdAfterSeconds: 5,
    groups: left(3),
    basis: [
      { from: "242-09", math: "H=(b_x,a_y),\\quad K=(x,a_y)" },
      { from: "242-11", math: "AK/AH=KP/HB=AP/AB=u,\\quad 0<u<1" },
    ],
    lines: [
      { math: "x-a_x=u(b_x-a_x)" },
      { math: "y-a_y=u(b_y-a_y)" },
      { text: "向左、向下时差为负，同一比例仍成立" },
    ],
  },
  horizontal: {
    referenceDiagram: true,
    title: "横坐标：从变化量到分点公式",
    holdAfterSeconds: 5,
    basis: [{ from: "242-12", math: "x-a_x=u(b_x-a_x),\\quad 0\\le u\\le1" }],
    groups: [{ count: 3, align: "equals" }],
    lines: [
      { math: "x=a_x+u(b_x-a_x)" },
      { math: "=a_x+ub_x-ua_x" },
      { math: "=(1-u)a_x+ub_x" },
    ],
  },
  vertical: {
    referenceDiagram: true,
    title: "纵坐标：逐步做同样的整理",
    holdAfterSeconds: 5,
    basis: [
      { from: "242-13", math: "y-a_y=u(b_y-a_y),\\quad 0\\le u\\le1" },
      { from: "242-17", math: "x=(1-u)a_x+ub_x" },
    ],
    groups: [{ count: 3, align: "equals" }],
    lines: [
      { math: "y=a_y+u(b_y-a_y)" },
      { math: "=a_y+ub_y-ua_y" },
      { math: "=(1-u)a_y+ub_y" },
    ],
  },
  boundary: {
    title: "水平、竖直与端点也包括在内",
    holdAfterSeconds: 5,
    groups: left(4),
    basis: [
      { from: "242-17", math: "x=a_x+u(b_x-a_x)=(1-u)a_x+ub_x" },
      { from: "242-20", math: "y=a_y+u(b_y-a_y)=(1-u)a_y+ub_y" },
    ],
    lines: [
      { math: "a_y=b_y:\\ y=a_y,\\quad x=a_x+u(b_x-a_x)" },
      { math: "a_x=b_x:\\ x=a_x,\\quad y=a_y+u(b_y-a_y)" },
      { math: "u=0:\\ P=A,\\quad u=1:\\ P=B" },
      { text: "比例取遍零到一，覆盖整条闭线段" },
    ],
  },
  shear: {
    title: "先讲清剪切，再做代入",
    holdAfterSeconds: 5,
    groups: left(3),
    basis: [],
    lines: [
      { text: "s 是固定系数；撇号表示剪切后的坐标" },
      { math: "x'=x+sy,\\quad y'=y" },
      { text: "本页只使用剪切定义，不假设系数足够小" },
    ],
  },
  substitution: {
    referenceDiagram: true,
    title: "将分点公式代入剪切公式",
    holdAfterSeconds: 5,
    groups: left(2),
    basis: [
      { from: "242-17", math: "x=(1-u)a_x+ub_x,\\quad 0\\le u\\le1" },
      { from: "242-20", math: "y=(1-u)a_y+ub_y" },
      { from: "242-26", math: "x'=x+sy,\\quad y'=y" },
    ],
    lines: [
      { math: "x'=(1-u)a_x+ub_x+s\\bigl((1-u)a_y+ub_y\\bigr)" },
      { math: "y'=(1-u)a_y+ub_y" },
    ],
  },
  expand: {
    referenceDiagram: true,
    title: "展开，再按两个端点分组",
    holdAfterSeconds: 5,
    basis: [
      { from: "242-28", math: "x'=(1-u)a_x+ub_x+s\\bigl((1-u)a_y+ub_y\\bigr)" },
      { from: "242-29", math: "y'=(1-u)a_y+ub_y,\\quad 0\\le u\\le1" },
    ],
    groups: [{ count: 3, align: "equals" }],
    lines: [
      { math: "x'=(1-u)a_x+ub_x+s(1-u)a_y+sub_y" },
      { math: "=(1-u)a_x+s(1-u)a_y+ub_x+sub_y" },
      { math: "=(1-u)(a_x+sa_y)+u(b_x+sb_y)" },
    ],
  },
  endpoints: {
    referenceDiagram: true,
    title: "识别括号里的新端点坐标",
    holdAfterSeconds: 5,
    groups: left(3),
    basis: [
      { from: "242-05", math: "A=(a_x,a_y),\\quad B=(b_x,b_y)" },
      { from: "242-26", math: "x'=x+sy,\\quad y'=y" },
      { from: "242-32", math: "x'=(1-u)(a_x+sa_y)+u(b_x+sb_y)" },
      { from: "242-29", math: "y'=(1-u)a_y+ub_y,\\quad 0\\le u\\le1" },
    ],
    lines: [
      { math: "A'=(a_x+sa_y,a_y)" },
      { math: "B'=(b_x+sb_y,b_y)" },
      { text: "横、纵坐标仍使用同一个比例 u" },
    ],
  },
};
export const shots: Shot[] = [
  {
    id: "242-01",
    page: "numeric",
    step: 1,
    caption:
      "先看线段的两个端点，A 的坐标是一、一。B 的坐标是五、三，坐标总是先横后纵。",
  },
  {
    id: "242-02",
    page: "numeric",
    step: 2,
    caption: "从 A 到 B，横向增加四。纵向增加二，这是走完全程的两个变化量。",
  },
  {
    id: "242-03",
    page: "numeric",
    step: 3,
    caption:
      "中点记作 M，从 A 走一半。横向增加四的一半，纵向增加二的一半。加回起点坐标，得到三、二。",
  },
  {
    id: "242-04",
    page: "numeric",
    step: 4,
    caption:
      "再把四分之一位置记作 Q，横向增加一。纵向增加二分之一，所以坐标是二、二分之三。为什么两个方向能用同一比例，下面用相似三角形说明。",
  },
  {
    id: "242-05",
    page: "symbols",
    step: 1,
    caption:
      "现在用一般符号表示端点，A 的横纵坐标分别记作 a_x 和 a_y。B 的横纵坐标分别记作 b_x 和 b_y，这些字母代表坐标值。",
  },
  {
    id: "242-06",
    page: "symbols",
    step: 2,
    caption:
      "写在右下方的 x 和 y 是下标，用来区分横坐标和纵坐标。a_x 是一个坐标符号，不表示 a 乘以 x。其余三个符号同理。",
  },
  {
    id: "242-07",
    page: "symbols",
    step: 3,
    caption:
      "先设两个端点不同，在线段上选点 P。它的坐标记作 x 和 y，用 u 表示从 A 到 P 的长度占整条线段的比例。也就是 AP 的长度，除以 AB 的长度。",
  },
  {
    id: "242-08",
    page: "symbols",
    step: 4,
    caption:
      "u 从零到一，零对应起点 A。一对应终点 B，介于零和一之间就对应内部点。",
  },
  {
    id: "242-09",
    page: "similar",
    step: 1,
    caption:
      "先看既不水平也不竖直的线段，取内部点 P。过 B 和 P 作竖线，与过 A 的横线分别交于 H 和 K。H 的横坐标是 b_x，K 的横坐标是 x。它们的纵坐标都是 a_y。",
  },
  {
    id: "242-10",
    page: "similar",
    step: 2,
    caption:
      "三角形 AKP 与 AHB 都是直角三角形，而且共用 A 处的角。两角分别相等，因此两个三角形相似。",
  },
  {
    id: "242-11",
    page: "similar",
    step: 3,
    caption:
      "相似三角形的对应边成比例，小三角形与大三角形的水平边之比。竖直边之比，以及斜边之比都相等。斜边之比正是 u，所以横向和纵向也都取同一个比例。",
  },
  {
    id: "242-12",
    page: "changes",
    step: 1,
    caption:
      "保留刚才的对应边比例，横向全程变化是 b_x 减 a_x。走到 P 时的变化是 x 减 a_x，等于全程变化乘以 u。",
  },
  {
    id: "242-13",
    page: "changes",
    step: 2,
    caption:
      "纵向全程变化是 b_y 减 a_y，走到 P 时是 y 减 a_y。因此纵向变化也等于全程变化乘以 u。",
  },
  {
    id: "242-14",
    page: "changes",
    step: 3,
    caption:
      "图中向右向上时差为正，向左或向下时相应的差为负。局部变化与全程变化方向一致，所以在长度比例前同时带上方向符号。仍然得到这两个等式，不能把带方向的差直接当成正长度。",
  },
  {
    id: "242-15",
    page: "horizontal",
    step: 1,
    caption:
      "现在推导横坐标，上一页的等式保留在上方。两边都加上 a_x，得到起点横坐标加上横向变化。",
  },
  {
    id: "242-16",
    page: "horizontal",
    step: 2,
    caption:
      "用乘法分配律展开，u 分别乘以括号内的两项。得到 a_x 加 u 乘以 b_x，再减 u 乘以 a_x。",
  },
  {
    id: "242-17",
    page: "horizontal",
    step: 3,
    caption:
      "把含 a_x 的两项合并，提取共同因子 a_x。得到一减 u 的差乘以 a_x，再加 u 乘以 b_x。",
  },
  {
    id: "242-18",
    page: "vertical",
    step: 1,
    caption:
      "换页后保留纵向变化等式，以及刚刚求出的横坐标公式。纵向等式两边加上 a_y，得到起点纵坐标加上纵向变化。",
  },
  {
    id: "242-19",
    page: "vertical",
    step: 2,
    caption: "同样先展开，得到 a_y 加 u 乘以 b_y。再减 u 乘以 a_y。",
  },
  {
    id: "242-20",
    page: "vertical",
    step: 3,
    caption:
      "再合并含 a_y 的两项，得到一减 u 的差乘以 a_y。再加 u 乘以 b_y，横纵分点公式都推导出来了。",
  },
  {
    id: "242-21",
    page: "boundary",
    step: 1,
    caption:
      "水平线段的两个纵坐标相等，所以纵向变化为零。只在横向按比例移动，仍然满足这两个公式。",
  },
  {
    id: "242-22",
    page: "boundary",
    step: 2,
    caption:
      "竖直线段的两个横坐标相等，所以横向变化为零。只在纵向按比例移动，公式也成立。",
  },
  {
    id: "242-23",
    page: "boundary",
    step: 3,
    caption:
      "把 u 等于零代入，得到 A 的两个坐标。把 u 等于一代入，得到 B 的两个坐标。端点不需要使用退化的相似三角形。",
  },
  {
    id: "242-24",
    page: "boundary",
    step: 4,
    caption:
      "每个内部点都有从 A 出发的长度比例，反过来每个零到一之间的比例也确定一个位置。因此让 u 取遍零到一，覆盖整条闭线段。不是只检查中点和四分之一位置。",
  },
  {
    id: "242-25",
    page: "shear",
    step: 1,
    caption:
      "接下来介绍剪切，用 s 表示固定的剪切系数。坐标右上方的撇号，表示剪切后的新坐标。",
  },
  {
    id: "242-26",
    page: "shear",
    step: 2,
    caption:
      "新横坐标等于原横坐标，加上 s 乘以原纵坐标。新纵坐标等于原纵坐标，也就是纵坐标不变。",
  },
  {
    id: "242-27",
    page: "shear",
    step: 3,
    caption:
      "下面只使用这个定义做代数变形，不要求系数足够小。小系数保序是另一个问题，这里先不使用保序结论。",
  },
  {
    id: "242-28",
    page: "substitution",
    step: 1,
    caption:
      "上方保留两个分点公式和剪切公式，把原横坐标替换为横向分点式。再把原纵坐标替换为纵向分点式，注意 s 乘的是整个纵坐标的和。",
  },
  {
    id: "242-29",
    page: "substitution",
    step: 2,
    caption:
      "纵坐标不变，直接保留原来的纵向分点公式。横纵坐标中的 u 始终是同一个比例。",
  },
  {
    id: "242-30",
    page: "expand",
    step: 1,
    caption:
      "换页仍保留刚才的完整代入式，将 s 分别乘以括号内两项。横坐标展开成四项，没有省略任何乘积。",
  },
  {
    id: "242-31",
    page: "expand",
    step: 2,
    caption:
      "交换中间两项的位置，把含端点 A 坐标的两项放在前面。把含端点 B 坐标的两项放在后面，等式的值不变。",
  },
  {
    id: "242-32",
    page: "expand",
    step: 3,
    caption:
      "前两项提取一减 u 这个共同因子，后两项提取 u。两个括号内分别是 a_x 加 s 乘以 a_y，以及 b_x 加 s 乘以 b_y。",
  },
  {
    id: "242-33",
    page: "endpoints",
    step: 1,
    caption:
      "保留端点定义和剪切公式，对 A 做同样的剪切。新端点记作 A′，横坐标恰好是第一个括号内的表达式。纵坐标仍为 a_y。",
  },
  {
    id: "242-34",
    page: "endpoints",
    step: 2,
    caption:
      "对 B 剪切得到 B′，横坐标恰好是第二个括号内的表达式。纵坐标仍为 b_y。",
  },
  {
    id: "242-35",
    page: "endpoints",
    step: 3,
    caption:
      "于是新点的横纵坐标，仍按同一个 u 组合两个新端点。后续将用这个结果证明整条线段的对应，再分别证明不丢交点与不添交点。",
  },
];
