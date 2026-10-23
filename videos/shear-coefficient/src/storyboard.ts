import { equals, left, type TeachingGroup } from "./math-lines.ts";

export type Shot = {
  id: string;
  page: string;
  step: number;
  caption: string;
  pauseAfter?: number;
  reveal?: string;
  motion?: { start: string; midpoint?: string; end: string };
};
export type Page = {
  title: string;
  mode: string;
  lines: { math?: string; text?: string }[];
  groups: TeachingGroup[];
  note: string;
  noteFromStep?: number;
  holdAfterSeconds?: number;
};

export const pages: Record<string, Page> = {
  opening: {
    title: "0.01 还不够小？",
    mode: "剪切变换② · 固定直角坐标轴，观察两个点",
    lines: [
      { math: "A=(0,200)" },
      { math: "B=(1,0)" },
      { math: "0<1" },
      { text: "原来 A 在 B 左侧" },
    ],
    groups: [left(2), left(2)],
    note: "横纵方向的画面长度不能直接比较",
  },
  formula: {
    title: "剪切：高度不变，横向移动",
    mode: "先认识公式 · 撇号区分新坐标和原坐标",
    lines: [
      { math: "x'=x+sy" },
      { math: "y'=y" },
      { math: "s>0,\\quad sy=s\\times y" },
      { text: "横向位移 = 系数 × 高度" },
    ],
    groups: [equals(2), left(2)],
    note: "本集始终固定坐标轴，让点移动",
  },
  notation: {
    title: "下标说明：在计算哪个点？",
    mode: "A、B 是点名 · 下标不是乘法",
    lines: [
      { math: "x_A=0,\\quad y_A=200" },
      { math: "x_B=1,\\quad y_B=0" },
      { math: "x'_A=x_A+s\\times y_A" },
      { math: "x'_B=x_B+s\\times y_B" },
    ],
    groups: [left(2), equals(2)],
    note: "例如 x′ 的下标 A，表示 A 的新横坐标",
  },
  calculateA: {
    title: "取 s=0.01，先算高处的 A",
    mode: "先乘后加 · 每一步都保留",
    lines: [
      { math: "s=0.01=\\frac{1}{100}" },
      { math: "x'_A=0+\\frac{1}{100}\\times200" },
      { math: "x'_A=0+2" },
      { math: "x'_A=2" },
    ],
    groups: [left(1), equals(3)],
    holdAfterSeconds: 5,
    note: "A 的高度仍为 200，横向位移为 2",
    noteFromStep: 4,
  },
  calculateB: {
    title: "再算横轴上的 B",
    mode: "同一个系数 · B 的高度为零",
    lines: [
      { math: "s=0.01=\\frac{1}{100}" },
      { math: "x'_B=1+\\frac{1}{100}\\times0" },
      { math: "x'_B=1+0" },
      { math: "x'_B=1" },
    ],
    groups: [left(1), equals(3)],
    holdAfterSeconds: 5,
    note: "B 的横向位移为零，所以 B 不动",
    noteFromStep: 4,
  },
  crossing: {
    title: "A 向右越过 B，左右顺序颠倒",
    mode: "坐标轴固定 · 两点高度保持不变",
    lines: [
      { math: "x_A=0<1=x_B" },
      { math: "A'=(2,200),\\quad B'=(1,0)" },
      { math: "x'_A=2>1=x'_B" },
      { text: "0.01 看起来小，仍会颠倒顺序" },
    ],
    groups: [left(1), left(1), left(2)],
    note: "小数看起来很小，不代表能保持左右顺序",
    noteFromStep: 4,
  },
};

export const shots: Shot[] = [
  {
    id: "210-01",
    page: "opening",
    step: 1,
    caption: "0.01 还不够小吗？先看两个点。A 的坐标是 (0,200)。",
  },
  {
    id: "210-02",
    page: "opening",
    step: 2,
    caption: "B 的坐标是 (1,0)。它在横轴上。",
  },
  {
    id: "210-03",
    page: "opening",
    step: 4,
    caption: "比较横坐标。零小于一。所以原来 A 在 B 左侧。",
    reveal: "零小于一",
  },
  {
    id: "210-04",
    page: "opening",
    step: 4,
    caption: "高度差是 200。横向间距只有 1。为看清两点。这里使用不等比例示意。",
  },
  {
    id: "210-05",
    page: "opening",
    step: 4,
    caption: "刻度标出的数值才是依据。横纵方向的画面长度不能直接比较。",
  },
  {
    id: "210-06",
    page: "formula",
    step: 1,
    caption: "剪切公式写成 x′=x+sy。撇号表示新坐标。没有撇号的是原坐标。",
  },
  {
    id: "210-07",
    page: "formula",
    step: 2,
    caption: "y′=y。新旧纵坐标相等。所以高度不变。",
  },
  {
    id: "210-08",
    page: "formula",
    step: 3,
    caption: "s 是正的剪切系数。sy 表示 s 乘 y。",
    reveal: "s 是正的",
  },
  {
    id: "210-09",
    page: "formula",
    step: 4,
    caption: "系数乘高度。就是横向位移。加到原横坐标上。得到新横坐标。",
  },
  {
    id: "210-10",
    page: "notation",
    step: 1,
    caption: "下标 A 表示点 A。它的横坐标是零。纵坐标是 200。",
  },
  {
    id: "210-11",
    page: "notation",
    step: 2,
    caption: "下标 B 表示点 B。它的横坐标是 1。纵坐标是零。下标不是乘法。",
  },
  {
    id: "210-12",
    page: "notation",
    step: 3,
    caption:
      "x′ 的下标 A。表示 A 的新横坐标。用 A 的原横坐标。加上系数乘 A 的高度。",
  },
  {
    id: "210-13",
    page: "notation",
    step: 4,
    caption: "B 也用同一个公式。代入 B 自己的横坐标和高度。",
  },
  {
    id: "210-14",
    page: "calculateA",
    step: 1,
    caption: "现在取 s=0.01。也就是一百分之一。",
  },
  {
    id: "210-15",
    page: "calculateA",
    step: 2,
    caption: "代入 A 的数据。新横坐标等于零加上一百分之一乘 200。",
  },
  {
    id: "210-16",
    page: "calculateA",
    step: 3,
    caption: "先算乘法。200 除以 100 得到 2。于是变成零加 2。",
    reveal: "于是变成",
  },
  {
    id: "210-17",
    page: "calculateA",
    step: 4,
    caption: "再算加法。零加 2 等于 2。这就是 A 的新横坐标。",
    reveal: "零加二",
  },
  {
    id: "210-18",
    page: "calculateB",
    step: 1,
    caption: "再看 B。系数仍是一百分之一。",
  },
  {
    id: "210-19",
    page: "calculateB",
    step: 2,
    caption: "B 的原横坐标是 1。高度是零。代入得到 1 加上一百分之一乘零。",
  },
  {
    id: "210-20",
    page: "calculateB",
    step: 3,
    caption: "先算乘法。乘零得到零。于是变成 1 加零。",
    reveal: "于是变成",
  },
  {
    id: "210-21",
    page: "calculateB",
    step: 4,
    caption: "1 加零仍是 1。B 的新横坐标没有改变。高度也没变。所以 B 不动。",
  },
  {
    id: "210-22",
    page: "crossing",
    step: 1,
    caption: "把计算放回图中。原来零小于一。A 在 B 左侧。",
  },
  {
    id: "210-23",
    page: "crossing",
    step: 2,
    caption:
      "A 水平向右移动。经过 B 的正上方。继续移动到横坐标 2。高度始终是 200。B 留在原位。",
    reveal: "高度始终",
    motion: { start: "水平向右移动", midpoint: "正上方", end: "横坐标二" },
  },
  {
    id: "210-24",
    page: "crossing",
    step: 3,
    caption: "现在 2 大于 1。A 已经在 B 的右侧。左右顺序颠倒了。",
  },
  {
    id: "210-25",
    page: "crossing",
    step: 4,
    caption: "所以 0.01 虽然看起来很小。仍然不能保持这两个点的左右顺序。",
  },
];
