import { left, equals } from "../../../shared/math/math-lines.ts";

export const pages = {
  ordered: {
    title: "先数有顺序的选择",
    holdAfterSeconds: 2, // 推导密集页
    basis: [],
    lines: [
      { text: "n 表示原始输入的份数；四份时 n=4" },
      { text: "n≥2：暂时区分先选谁、后选谁" },
      { text: "第一份：n 种选择" },
      { text: "第二份：n-1 种选择，排除第一份" },
      { math: "n(n-1)" },
    ],
    groups: [left(2), left(2), left(1)],
  },
  unordered: {
    title: "每个无序对恰好数了两次",
    holdAfterSeconds: 2, // 推导密集页
    basis: [
      { from: "D24", math: "n\\ge2" },
      { from: "D26", math: "n(n-1)" },
    ],
    lines: [
      { text: "先选 1 后选 2 ／ 先选 2 后选 1：同一个无序对" },
      { math: "\\frac{n(n-1)}{2}" },
      { text: "每个无序输入对检查一次：这也是检查次数" },
    ],
    groups: [left(1), left(1), left(1)],
  },
  substitution: {
    title: "代入四份输入",
    holdAfterSeconds: 2, // 推导密集页
    basis: [
      { from: "D28", math: "\\frac{n(n-1)}{2}" },
      { from: "D23", math: "n=4" },
      { from: "D11", math: "3+2+1+0=6" },
    ],
    lines: [
      { math: "\\frac{4(4-1)}{2}=\\frac{4\\times3}{2}" },
      { math: "\\frac{4\\times3}{2}=\\frac{12}{2}" },
      { math: "\\frac{12}{2}=6" },
    ],
    groups: [equals(3)],
  },
};

export const shots = [
  {
    id: "D23",
    page: "ordered",
    step: 1,
    caption:
      "把原始输入的数量记作 n。四份输入时，n 等于 4。重合输入仍各算一份，n 不是图中不同位置的数量。",
  },
  {
    id: "D24",
    page: "ordered",
    step: 2,
    caption:
      "先假设至少有两份输入。为了计数，我们暂时把先选谁、后选谁区分开；这是计数办法，不是把无序输入对改成有方向的结果。",
  },
  {
    id: "D25",
    page: "ordered",
    step: 4,
    caption:
      "第一份有 n 种选择。选定之后，第二份不能与第一份相同，所以有 n-1 种选择。",
  },
  {
    id: "D26",
    page: "ordered",
    step: 5,
    caption:
      "每一种第一份的选择，都对应 n-1 种第二份的选择，因此有顺序的选择总数是 n(n-1)。",
  },
  {
    id: "D27",
    page: "unordered",
    step: 1,
    caption:
      "同一个无序输入对被数了两次。例如先选 1 再选 2，和先选 2 再选 1。任意两份不同输入都恰好有这两种顺序，没有第三种。",
  },
  {
    id: "D28",
    page: "unordered",
    step: 2,
    caption:
      "因此，把有顺序的选择总数除以 2，就得到无序输入对的数量，也就是 n(n − 1) 除以 2。",
  },
  {
    id: "D29",
    page: "unordered",
    step: 3,
    caption:
      "前面已经证明基准方法恰好检查每个无序输入对一次，所以这个数也就是它的检查次数。",
  },
  {
    id: "D30",
    page: "substitution",
    step: 1,
    caption: "代入四份输入。先算四减一，得到三，分子变成四乘三。",
  },
  {
    id: "D31",
    page: "substitution",
    step: 2,
    caption: "四乘三等于十二，所以现在是十二除以二。",
  },
  {
    id: "D32",
    page: "substitution",
    step: 3,
    caption:
      "十二除以二等于六，与前面逐行列出的六对一致。公式没有替代枚举证明，而是数出了同一批输入对。",
  },
];
