import {
  equals,
  left,
  type TeachingGroup,
} from "../../shared/math/math-lines.ts";
import { pages228, shots228 } from "./lesson228.ts";
import { pages229, shots229 } from "./lesson229.ts";

export type Shot = {
  id: string;
  page: string;
  step: number;
  caption: string;
  pauseAfter?: number;
};
export type Page = {
  title: string;
  mode: string;
  lines: { math?: string; text?: string }[];
  groups: TeachingGroup[];
  note: string;
  holdAfterSeconds?: number;
  panel?: { title: string; lines: string[] };
};
export const pages: Record<string, Page> = {
  recap: {
    title: "整数端点，为什么会交出分数？",
    mode: "剪切变换④ · 接着上一集往下看",
    lines: [
      { text: "统一缩放后，输入端点坐标为整数" },
      { math: "aX+bY=c" },
      { text: "按上一集的取法，a、b、c 都是整数" },
      { math: "M\\ge1,\\quad |a|,|b|\\le2M" },
    ],
    groups: [left(1), left(2), left(1)],
    note: "M 控制全部端点的坐标范围；系数沿用约定取法",
  },
  lines: {
    title: "交点，要同时满足两个方程",
    mode: "X 是横坐标，Y 是纵坐标 · 两轴单位长度相同",
    lines: [
      { math: "X+Y=1" },
      { math: "X-Y=0" },
      { text: "公共点的坐标，同时满足两式" },
      { text: "整数端点，不保证交点坐标是整数" },
    ],
    groups: [equals(2), left(2)],
    note: "直线向两端延伸；图中的点用于确定直线",
  },
  question: {
    title: "先试一试：怎样消去一个未知数？",
    mode: "第一次练习 · 保留 4 秒思考时间",
    lines: [
      { math: "X+Y=1" },
      { math: "X-Y=0" },
      { text: "把两式相加，哪一项会抵消？" },
    ],
    groups: [equals(2), left(1)],
    note: "先想抵消的理由，再求横坐标",
  },
  eliminate: {
    title: "两式相加，先求横坐标",
    mode: "等式左边相加，右边也相加",
    lines: [
      { math: "(X+Y)+(X-Y)=1+0" },
      { math: "X+X+Y-Y=1" },
      { math: "2X=1" },
      { math: "X=\\frac12" },
    ],
    groups: [equals(2), equals(2)],
    holdAfterSeconds: 5,
    note: "Y 与 −Y 抵消；除以非零的 2，等式仍成立",
  },
  ordinate: {
    title: "代回去，再求纵坐标",
    mode: "使用第二个方程，求出同一个公共点的 Y",
    lines: [
      { math: "X-Y=0" },
      { math: "\\frac12-Y=0" },
      { math: "\\frac12=Y" },
      { math: "P=(\\frac12,\\frac12)" },
    ],
    groups: [equals(3), left(1)],
    holdAfterSeconds: 5,
    note: "有序数对先写横坐标，再写纵坐标",
  },
  verify: {
    title: "两个方程，都要核对",
    mode: "把同一对坐标分别代回原方程",
    lines: [
      { math: "X+Y=\\frac12+\\frac12=1" },
      { math: "X-Y=\\frac12-\\frac12=0" },
      { text: "两式都成立，P 就是这两条直线的交点" },
      { text: "分母 2 来自消元后的一次除法" },
    ],
    groups: [left(2), left(2)],
    holdAfterSeconds: 5,
    note: "下一步：一般整数系数下，除数会变成什么？",
  },
  ...pages228,
  ...pages229,
};
export const shots: Shot[] = [
  {
    id: "227-01",
    page: "recap",
    step: 1,
    caption: "上一集，我们把全部输入端点的坐标统一缩放成了整数。",
  },
  {
    id: "227-02",
    page: "recap",
    step: 3,
    caption: "直线写成 aX+bY=c，按照上一集的取法，三个系数都是整数。",
  },
  {
    id: "227-03",
    page: "recap",
    step: 4,
    caption:
      "M 控制全部端点的坐标范围，而且至少为 1。系数 a、b 的绝对值，都不超过 2M。",
  },
  {
    id: "227-04",
    page: "lines",
    step: 1,
    caption: "先看蓝色直线 X+Y=1，它经过整数点 (0,1) 和 (1,0)。",
  },
  {
    id: "227-05",
    page: "lines",
    step: 2,
    caption:
      "紫色直线满足 X−Y=0，经过整数点 (0,0) 和 (1,1)。X 表示横坐标，Y 表示纵坐标。",
  },
  {
    id: "227-06",
    page: "lines",
    step: 3,
    caption: "两条直线的公共点，必须同时满足两个方程。",
  },
  {
    id: "227-07",
    page: "lines",
    step: 4,
    caption: "虽然这些端点坐标都是整数，交点坐标却未必是整数。我们一起算一算。",
  },
  {
    id: "227-08",
    page: "question",
    step: 3,
    caption: "把两个方程相加，哪一项会抵消？先想一想，再求横坐标。",
    pauseAfter: 4,
  },
  {
    id: "227-09",
    page: "eliminate",
    step: 1,
    caption:
      "等式左边相加，右边也相加。左边是 X 与 Y 的和，加上 X 与 Y 的差；右边是 1 加 0。",
  },
  {
    id: "227-10",
    page: "eliminate",
    step: 2,
    caption:
      "去掉括号，两个横坐标相加，再加上纵坐标，最后减去纵坐标，等号右边保持为 1。",
  },
  {
    id: "227-11",
    page: "eliminate",
    step: 3,
    caption: "Y 与 −Y 相加等于 0，两项抵消。两个 X 相加，得到 2X=1。",
  },
  {
    id: "227-12",
    page: "eliminate",
    step: 4,
    caption: "2 不是零，所以两边都可以除以 2，得到 X=1/2。横坐标已经是分数了。",
  },
  {
    id: "227-13",
    page: "ordinate",
    step: 1,
    caption: "再求纵坐标，使用第二个方程 X−Y=0。",
  },
  {
    id: "227-14",
    page: "ordinate",
    step: 2,
    caption: "把横坐标 1/2 代进去，得到 1/2−Y=0。",
  },
  {
    id: "227-15",
    page: "ordinate",
    step: 3,
    caption: "两边同时加上 Y，左边的 −Y 与 Y 抵消，得到 1/2=Y。",
  },
  {
    id: "227-16",
    page: "ordinate",
    step: 4,
    caption:
      "所以交点 P 的横坐标和纵坐标，都是 1/2。有序数对先写横坐标，再写纵坐标。",
  },
  {
    id: "227-17",
    page: "verify",
    step: 1,
    caption: "代回第一个方程，1/2 加 1/2 等于 1，成立。",
  },
  {
    id: "227-18",
    page: "verify",
    step: 2,
    caption: "代回第二个方程，1/2 减 1/2 等于 0，也成立。",
  },
  {
    id: "227-19",
    page: "verify",
    step: 3,
    caption: "同一对坐标满足两个方程，所以 P 就是它们的交点。",
  },
  {
    id: "227-20",
    page: "verify",
    step: 4,
    caption:
      "这里的分母 2，来自消元后的一次除法。换成一般的整数系数，除数会变成什么呢？",
  },
  ...shots228,
  ...shots229,
];
