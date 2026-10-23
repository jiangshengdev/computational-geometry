import { equals, left, type TeachingGroup } from "./math-lines.ts";

export type Shot = {
  id: string;
  page: string;
  step: number;
  caption: string;
  pauseAfter?: number;
  reveal?: string;
  motion?: { start: string; end: string };
};
export type Page = {
  title: string;
  mode: string;
  lines: { math?: string; text?: string }[];
  groups: TeachingGroup[];
  note: string;
  noteFromStep?: number;
  holdAfterSeconds?: number;
  diagram?: "scale" | "camera";
};

export const pages: Record<string, Page> = {
  opening: {
    title: "分数坐标，能不能先变成整数？",
    mode: "剪切变换③ · 从一条线段出发",
    lines: [
      { math: "P=(\\frac12,-\\frac23)" },
      { math: "Q=(-\\frac13,\\frac16)" },
      { text: "有理数：能写成整数之比" },
      { text: "分母不能是零，整数也属于有理数" },
    ],
    groups: [left(2), left(2)],
    note: "小写 x、y 表示原横坐标、原纵坐标",
  },
  denominator: {
    title: "用同一个公共分母",
    mode: "先看全部输入端点，再选择正整数 D",
    lines: [
      { math: "2,\\ 3,\\ 3,\\ 6" },
      { math: "D=6" },
      { math: "6\\div2=3,\\quad6\\div3=2" },
      { math: "6\\div6=1" },
      { text: "12 也可以，公共分母不必最小" },
    ],
    groups: [left(2), left(2), left(1)],
    note: "选定后，全部点和两个方向都用同一个 D",
    noteFromStep: 5,
  },
  formula: {
    title: "两个方向，同时乘 D",
    mode: "大写 X、Y 表示放大后的横坐标、纵坐标",
    lines: [
      { math: "X=D\\times x" },
      { math: "Y=D\\times y" },
      { math: "D=6>0" },
      { text: "不能给不同点或不同方向另选倍数" },
    ],
    groups: [equals(2), left(2)],
    note: "D 必须让全部输入端点的坐标都成为整数",
  },
  calculateP: {
    title: "先算 P：负数的符号要保留",
    mode: "横坐标、纵坐标分别计算 · D=6",
    lines: [
      { math: "X=6\\times\\frac12" },
      { math: "X=\\frac62=3" },
      { math: "Y=6\\times(-\\frac23)" },
      { math: "Y=-\\frac{6\\times2}{3}=-4" },
      { math: "P'=(3,-4)" },
    ],
    groups: [equals(2), equals(2), left(1)],
    holdAfterSeconds: 5,
    note: "P′ 表示放大后的对应点，撇号不是乘法",
    noteFromStep: 5,
  },
  questionQ: {
    title: "暂停试一试：Q 会变到哪里？",
    mode: "第一次练习 · 两个坐标都乘同一个 D",
    lines: [
      { math: "Q=(-\\frac13,\\frac16)" },
      { math: "D=6" },
      { text: "请计算 Q′ 的横坐标和纵坐标" },
    ],
    groups: [left(2), left(1)],
    note: "可以暂停视频，先自己算一算",
  },
  answerQ: {
    title: "揭晓：Q 的两个坐标",
    mode: "先处理负号，再做分数乘法",
    lines: [
      { math: "X=6\\times(-\\frac13)" },
      { math: "X=-\\frac63=-2" },
      { math: "Y=6\\times\\frac16" },
      { math: "Y=\\frac66=1" },
      { math: "Q'=(-2,1)" },
    ],
    groups: [equals(2), equals(2), left(1)],
    holdAfterSeconds: 5,
    note: "同样乘 6，得到另一个整数端点",
    noteFromStep: 5,
  },
  scaling: {
    title: "坐标轴不动，线段真的放大",
    mode: "以原点为中心 · 两轴每单位长度相同且固定",
    diagram: "scale",
    lines: [
      { math: "D=6" },
      { math: "P'=(3,-4)" },
      { math: "Q'=(-2,1)" },
      { text: "形状不变，所有长度变成原来的 6 倍" },
    ],
    groups: [left(1), left(2), left(1)],
    note: "每个原来的点，都有一个放大后的对应点",
    noteFromStep: 4,
  },
  camera: {
    title: "调整视野，不再改变坐标",
    mode: "几何缩放已经完成 · 现在只调整画面里的位置与大小",
    diagram: "camera",
    lines: [
      { math: "P'=(3,-4)" },
      { math: "Q'=(-2,1)" },
      { text: "点与网格一起变化，坐标保持不变" },
      { text: "下一步：找出整数坐标的范围" },
    ],
    groups: [left(2), left(2)],
    note: "本次只保证输入端点为整数，不保证交点为整数",
    noteFromStep: 4,
  },
};

// Readable captions are the source manuscript. Speech has independent wording
// and punctuation in speech-text.json; timestamps come only from real audio.
export const shots: Shot[] = [
  {
    id: "216-01",
    page: "opening",
    step: 0,
    caption: "能不能先把分数坐标变成整数，让后面的计算更方便？",
  },
  {
    id: "216-02",
    page: "opening",
    step: 1,
    caption: "看线段的端点 P：横坐标是二分之一，纵坐标是负三分之二。",
  },
  {
    id: "216-03",
    page: "opening",
    step: 2,
    caption: "另一个端点 Q，横坐标是负三分之一，纵坐标是六分之一。",
  },
  {
    id: "216-04",
    page: "opening",
    step: 4,
    caption: "能写成整数之比的数叫有理数，分母不能是零。整数也属于有理数。",
  },
  {
    id: "216-05",
    page: "denominator",
    step: 1,
    caption: "把全部输入端点一起考虑。本例的四个坐标，分母分别是 2、3、3、6。",
  },
  {
    id: "216-06",
    page: "denominator",
    step: 2,
    caption: "选一个正整数公共分母，用字母 D 表示。这里选 D=6。",
  },
  {
    id: "216-07",
    page: "denominator",
    step: 4,
    caption: "6 除以 2 得 3，除以 3 得 2，除以 6 得 1。它能被这些分母整除。",
  },
  {
    id: "216-08",
    page: "denominator",
    step: 5,
    caption:
      "12 也可以，所以公共分母不必最小。但选定后，全部点都要使用同一个 D。",
  },
  {
    id: "216-09",
    page: "formula",
    step: 1,
    caption: "小写 x 是原横坐标，大写 X 是放大后的横坐标。X 等于 D 乘 x。",
  },
  {
    id: "216-10",
    page: "formula",
    step: 2,
    caption: "小写 y 是原纵坐标，大写 Y 是放大后的纵坐标。Y 等于 D 乘 y。",
  },
  {
    id: "216-11",
    page: "formula",
    step: 4,
    caption:
      "本例 D=6，是正数。不能给不同点或不同方向另选倍数，必须让全部端点坐标都变成整数。",
  },
  {
    id: "216-12",
    page: "calculateP",
    step: 1,
    caption: "先算 P 的横坐标：6 乘二分之一。",
  },
  {
    id: "216-13",
    page: "calculateP",
    step: 2,
    caption: "把 6 写到分子上，得到二分之六，等于 3。",
  },
  {
    id: "216-14",
    page: "calculateP",
    step: 3,
    caption: "再算纵坐标：6 乘负三分之二。正数乘负数，结果是负数。",
  },
  {
    id: "216-15",
    page: "calculateP",
    step: 4,
    caption: "保留负号，6 乘 2 再除以 3，结果是负 4。",
  },
  {
    id: "216-16",
    page: "calculateP",
    step: 5,
    caption: "于是 P′ 的坐标是 (3,-4)。撇号表示放大后的对应点，不是乘法。",
  },
  {
    id: "216-17",
    page: "questionQ",
    step: 3,
    caption:
      "现在请你计算 Q 放大后的两个坐标，仍然都乘 6。可以暂停视频，先自己算一算。",
    pauseAfter: 4,
  },
  {
    id: "216-18",
    page: "answerQ",
    step: 1,
    caption: "看横坐标：6 乘负三分之一。",
  },
  {
    id: "216-19",
    page: "answerQ",
    step: 2,
    caption: "保留负号，得到负三分之六，等于负 2。",
  },
  {
    id: "216-20",
    page: "answerQ",
    step: 3,
    caption: "再看纵坐标：6 乘六分之一。",
  },
  { id: "216-21", page: "answerQ", step: 4, caption: "得到六分之六，等于 1。" },
  {
    id: "216-22",
    page: "answerQ",
    step: 5,
    caption: "所以 Q′ 的坐标是 (-2,1)，两个坐标也都成为整数。",
  },
  {
    id: "216-23",
    page: "scaling",
    step: 1,
    caption: "现在看真正的放大。保持坐标轴单位长度固定，以原点为中心。",
  },
  {
    id: "216-24",
    page: "scaling",
    step: 3,
    caption:
      "两个方向同时放大，点沿着从原点出发的方向移动，直到放大六倍。得到刚才算出的整数端点。",
    motion: { start: "同时放大", end: "放大六倍" },
  },
  {
    id: "216-25",
    page: "scaling",
    step: 4,
    caption:
      "线段形状不变，所有长度都变成原来的 6 倍。每个原来的点，都有一个对应点。",
  },
  {
    id: "216-26",
    page: "camera",
    step: 2,
    caption: "放大完成后，再调整视野。点与网格一起变化，端点坐标保持不变。",
    motion: { start: "再调整视野", end: "一起变化" },
  },
  {
    id: "216-27",
    page: "camera",
    step: 3,
    caption: "几何缩放改变坐标，视野调整只改变画面呈现。两者要分清。",
  },
  {
    id: "216-28",
    page: "camera",
    step: 4,
    caption:
      "本次只保证输入端点为整数，不保证交点也是整数。接下来，我们再找出整数坐标的范围。",
  },
];
