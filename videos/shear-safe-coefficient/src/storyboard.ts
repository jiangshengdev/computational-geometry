import {
  equals,
  left,
  type TeachingGroup,
} from "../../shared/math/math-lines.ts";

export type Line = { text?: string; math?: string };
export type Page = {
  title: string;
  mode: string;
  context: Line[];
  lines: Line[];
  groups: TeachingGroup[];
  mainSplitAfterGroup?: number;
  note: string;
  holdAfterSeconds?: number;
  diagram?: boolean;
};
export type Shot = {
  id: string;
  page: string;
  step: number;
  caption: string;
  pauseAfter?: number;
};

const fractionConditions: Line[] = [
  { math: "M\\ge1,\\quad p,r\\in\\mathbb Z" },
  { text: "约分后的分母为正整数" },
  { math: "0<q,t\\le8M^2,\\quad q,t\\in\\mathbb Z" },
  { math: "X_P=\\frac pq\\ne\\frac rt=X_Q" },
  { math: "pt-rq\\ne0,\\quad qt>0" },
];

export const pages: Record<string, Page> = {
  recap: {
    title: "不同横坐标，至少隔多远？",
    mode: "剪切变换⑤ · 从事件间距开始",
    context: [],
    lines: [
      { text: "全部输入端点，统一缩放为整数坐标" },
      { text: "M：1 与全部端点坐标绝对值的最大值" },
      { math: "M\\ge1" },
      { text: "事件：输入端点与实际线段交点" },
      { text: "q 表示这些坐标约分后的正分母" },
      { math: "0<q\\le8M^2" },
      { math: "X'=X+sY,\\quad Y'=Y" },
    ],
    groups: [left(3), left(3), left(1)],
    note: "q 表示约分后的正分母；本段先求剪切前的间距",
  },
  example: {
    title: "实际距离，与保证下界不同",
    mode: "先看具体分数 · 一维数轴",
    context: [],
    diagram: true,
    lines: [
      { math: "\\frac23-\\frac12=\\frac46-\\frac36=\\frac16" },
      { math: "2\\le3,\\quad 3\\le3" },
      { math: "2\\times3\\le3\\times3=9" },
      { math: "\\frac16\\ge\\frac1{3\\times3}=\\frac19" },
      { text: "实际距离是 1/6，保证下界是 1/9" },
      { text: "下界不保证恰好取到" },
    ],
    groups: [left(1), left(2), left(3)],
    holdAfterSeconds: 5,
    note: "一般证明，也要分清实际距离和保证下界",
  },
  numerator: {
    title: "先通分，再看分子能有多小",
    mode: "先选取两个事件，再逐步建立间距下界",
    context: [],
    lines: [
      { text: "从输入端点与实际交点中选取 P、Q" },
      { math: "X_P=\\frac pq\\ne\\frac rt=X_Q" },
      { math: "p,r\\in\\mathbb Z" },
      { text: "q、t 是约分后的正整数分母" },
      { math: "0<q,t\\le8M^2,\\quad q,t\\in\\mathbb Z" },
      { math: "\\frac pq-\\frac rt=\\frac{pt}{qt}-\\frac{rq}{qt}" },
      { math: "=\\frac{pt-rq}{qt}" },
      {
        math: "\\left|\\frac pq-\\frac rt\\right|=\\frac{|pt-rq|}{qt},\\quad qt>0",
      },
      { math: "pt-rq\\ne0,\\quad pt-rq\\in\\mathbb Z" },
      { math: "|pt-rq|\\ge1" },
      { math: "\\frac{|pt-rq|}{qt}\\ge\\frac1{qt}" },
    ],
    groups: [left(2), left(3), equals(2), left(1), left(2), left(1)],
    mainSplitAfterGroup: 2,
    holdAfterSeconds: 5,
    note: "非零整数的绝对值至少为 1；除以同一个正数，方向不变",
  },
  product: {
    title: "分母乘积，也有上界",
    mode: "保留上一段结论 · 两个正分母分别放大",
    context: [
      ...fractionConditions,
      { math: "\\left|\\frac pq-\\frac rt\\right|\\ge\\frac1{qt}" },
    ],
    lines: [
      { math: "qt\\le(8M^2)t" },
      { math: "(8M^2)t\\le(8M^2)(8M^2)" },
      { math: "(8M^2)(8M^2)=64M^4" },
      { math: "0<qt\\le64M^4" },
    ],
    groups: [left(2), left(2)],
    holdAfterSeconds: 5,
    note: "乘以正数时不等号不变；8×8=64，M²×M²=M⁴",
  },
  "question-reciprocal": {
    title: "正分母越大，倒数怎样变化？",
    mode: "先判断，再连接两段证明",
    context: [...fractionConditions.slice(0, 3), { math: "0<qt\\le64M^4" }],
    lines: [
      { text: "2<6，比较 1/2 与 1/6，先想一想" },
      { math: "\\frac12>\\frac16" },
      { text: "分子同为 1，正分母越大，分数越小" },
      { math: "\\frac1{qt}\\ge\\frac1{64M^4}" },
    ],
    groups: [left(1), left(1), left(2)],
    holdAfterSeconds: 5,
    note: "两边都为正数，取倒数后不等号方向反过来",
  },
  bound: {
    title: "把分子下界与分母上界连接起来",
    mode: "只讨论原来横坐标不同的事件",
    context: [
      ...fractionConditions,
      { math: "|pt-rq|\\ge1" },
      { math: "\\frac1{qt}\\ge\\frac1{64M^4}" },
    ],
    lines: [
      { math: "\\left|\\frac pq-\\frac rt\\right|=\\frac{|pt-rq|}{qt}" },
      { math: "\\ge\\frac1{qt}" },
      { math: "\\ge\\frac1{64M^4}" },
      { text: "这是保证下界，不一定是真实最小间距" },
    ],
    groups: [left(3), left(1)],
    holdAfterSeconds: 5,
    note: "下一段再比较：剪切最多会缩短多少？",
  },
};

// Reading copy is authored first; synthesis has its own reviewed document.
export const shots: Shot[] = [
  {
    id: "232-01",
    page: "recap",
    step: 2,
    caption:
      "全部输入端点统一缩放为整数坐标。M 是 1 与所有端点坐标绝对值的最大值。",
  },
  {
    id: "232-02",
    page: "recap",
    step: 6,
    caption:
      "所以 M 至少为 1。沿用前集结论，端点和实际线段交点的坐标，用 q 表示约分后的正分母，都不超过 8M²。",
  },
  {
    id: "232-03",
    page: "recap",
    step: 7,
    caption:
      "剪切后的横坐标是 X+sY，纵坐标仍是 Y。这一段先研究，不同横坐标原来至少隔多远。",
  },
  {
    id: "232-04",
    page: "example",
    step: 1,
    caption: "先看 1/2 和 2/3。通分成六分之三和六分之四，实际距离是 1/6。",
  },
  {
    id: "232-05",
    page: "example",
    step: 5,
    caption:
      "它们的分母都不超过 3，分母乘积就不超过 9。因此可以保证距离至少为 1/9，实际的 1/6 比它更大。",
  },
  {
    id: "232-06",
    page: "example",
    step: 6,
    caption:
      "下界只保证不会更小，不保证恰好取到。下面用字母说明，这个保证为什么成立。",
  },
  {
    id: "232-07",
    page: "numerator",
    step: 5,
    caption:
      "从输入端点与实际交点中，选取横坐标不同的两点 P、Q。点 P 的横坐标记作 X_P。点 Q 的横坐标，记作带下标 Q 的 X。把这两个横坐标分别写成 p/q 和 r/t，其中 p 与 r 是整数。q 与 t 是约分后的正整数分母，都不超过 8M²。",
  },
  {
    id: "232-08",
    page: "numerator",
    step: 7,
    caption:
      "第一个分数的分子分母，都乘以另一个分母。第二个分数也这样处理。通分以后，用第一个新分子减去第二个新分子。共同分母等于两个原分母的乘积。",
  },
  {
    id: "232-09",
    page: "numerator",
    step: 8,
    caption:
      "距离不区分正负，所以取绝对值。分母 qt 为正，绝对值只需留在整个分子上。",
  },
  {
    id: "232-10",
    page: "numerator",
    step: 11,
    caption:
      "横坐标不同，所以 pt−rq 不是零。它是非零整数，绝对值至少为 1。除以同一个正数 qt，得到距离至少为 1/(qt)。",
  },
  {
    id: "232-11",
    page: "product",
    step: 2,
    caption:
      "保留刚才的距离下界。先把 q 放大到 8M²，再把 t 放大到 8M²。每次都乘以正数，不等号方向不变。",
  },
  {
    id: "232-12",
    page: "product",
    step: 4,
    caption: "8 乘以 8 等于 64，M² 乘以 M² 等于 M⁴。因此正数 qt 不超过 64M⁴。",
  },
  {
    id: "232-13",
    page: "question-reciprocal",
    step: 1,
    caption: "正分母越大，倒数怎样变化？比较 1/2 和 1/6，安静想四秒。",
    pauseAfter: 4,
  },
  {
    id: "232-14",
    page: "question-reciprocal",
    step: 3,
    caption:
      "1/2 大于 1/6。同样的一份，分成六份时每份更小。分子同为 1，正分母越大，分数越小。",
  },
  {
    id: "232-15",
    page: "question-reciprocal",
    step: 4,
    caption:
      "qt 为正且不超过 64M⁴，取倒数后方向反过来。因此 1/(qt) 大于或等于 1/(64M⁴)。",
  },
  {
    id: "232-16",
    page: "bound",
    step: 2,
    caption:
      "把两段连接起来。距离等于分子绝对值除以正分母，分子绝对值至少为 1，所以距离至少为 1/(qt)。",
  },
  {
    id: "232-17",
    page: "bound",
    step: 4,
    caption:
      "再用分母乘积的上界，得到距离至少为 1/(64M⁴)。这是保证下界，不一定是真实最小间距。",
  },
];
