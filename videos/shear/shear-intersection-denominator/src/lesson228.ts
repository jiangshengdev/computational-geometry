import { equals, left } from "../../../shared/math/math-lines.ts";
import type { Page, Shot } from "./storyboard.ts";

export const pages228: Record<string, Page> = {
  "228-system": {
    title: "从数字例题，走向一般方程",
    mode: "只讨论不平行、也不重合的两条直线",
    panel: {
      title: "下标只是编号",
      lines: [
        "下标 1：第一条直线",
        "下标 2：第二条直线",
        "X、Y：同一个交点的坐标",
      ],
    },
    lines: [
      { math: "a_1X+b_1Y=c_1" },
      { math: "a_2X+b_2Y=c_2" },
      { text: "每条直线的 a、b 不能同时为零" },
      { text: "六个系数均按前集约定取整数" },
    ],
    groups: [equals(2), left(2)],
    note: "下标不是乘法，也不是平方；两式使用同一对 X、Y",
  },
  "228-delta": {
    title: "先给将要出现的除数起个名字",
    mode: "Δ 读作“德尔塔” · 先说明为什么能除",
    panel: {
      title: "先检查条件",
      lines: ["直线有唯一交点", "排除平行与重合", "接下来分情况证明 Δ≠0"],
    },
    lines: [
      { math: "\\Delta=a_1b_2-a_2b_1" },
      { text: "两个乘积相减，记作 Δ" },
      { text: "不能直接假定它非零" },
      { text: "分别检查非竖直与竖直情况" },
    ],
    groups: [left(4)],
    note: "乘法中省略的乘号，仍表示两个系数相乘",
  },
  "228-slopes": {
    title: "两个 b 都非零：先看斜率",
    mode: "把 Y 单独放在等号左边",
    panel: {
      title: "斜率的意思",
      lines: ["横坐标增加 1", "纵坐标改变 k", "相同斜率表示相同倾斜程度"],
    },
    lines: [
      { math: "bY=c-aX" },
      { math: "Y=-\\frac abX+\\frac cb" },
      { math: "k_1=-\\frac{a_1}{b_1}" },
      { math: "k_2=-\\frac{a_2}{b_2}" },
    ],
    groups: [equals(2), equals(2)],
    holdAfterSeconds: 5,
    note: "本页 b₁、b₂ 都非零，所以除法合法",
  },
  "228-contradiction": {
    title: "假如 Δ=0，会发生什么？",
    mode: "仍在 b₁≠0、b₂≠0 的情况下",
    panel: {
      title: "相同斜率",
      lines: [
        "纵轴截距不同：平行",
        "纵轴截距相同：重合",
        "都不符合本段选定条件",
      ],
    },
    lines: [
      { math: "a_1b_2=a_2b_1" },
      { math: "\\frac{a_1}{b_1}=\\frac{a_2}{b_2}" },
      { math: "-\\frac{a_1}{b_1}=-\\frac{a_2}{b_2}" },
      { math: "\\Delta\\ne0" },
    ],
    groups: [equals(3), left(1)],
    holdAfterSeconds: 5,
    note: "中间一步两边同除以非零的 b₁b₂；假设导致矛盾",
  },
  "228-vertical1": {
    title: "第一条直线竖直，也不会漏掉",
    mode: "b₁=0 时，a₁ 必须非零",
    panel: {
      title: "竖直直线",
      lines: ["X 是固定值", "另一条不能也竖直", "两条都竖直只会平行或重合"],
    },
    lines: [
      { math: "a_1X=c_1" },
      { math: "X=\\frac{c_1}{a_1}" },
      { math: "b_2\\ne0" },
      { math: "\\Delta=a_1b_2\\ne0" },
    ],
    groups: [equals(2), left(2)],
    holdAfterSeconds: 5,
    note: "两个非零数相乘非零；本例无需除以 b₁",
  },
  "228-vertical2": {
    title: "第二条直线竖直，理由同样明确",
    mode: "b₂=0 时，a₂ 必须非零",
    panel: {
      title: "条件已覆盖",
      lines: ["两个 b 都非零", "只有 b₁ 为零", "只有 b₂ 为零"],
    },
    lines: [
      { math: "X=\\frac{c_2}{a_2}" },
      { math: "b_1\\ne0" },
      { math: "\\Delta=-a_2b_1\\ne0" },
      { text: "所以选定的两条直线满足 Δ≠0" },
    ],
    groups: [left(4)],
    holdAfterSeconds: 5,
    note: "两个 b 同时为零的情况，已由平行或重合排除",
  },
  "228-xmultiply": {
    title: "先求 X：让两个 Y 项相同",
    mode: "第一式乘 b₂，第二式乘 b₁ · 等式两边都要乘",
    panel: {
      title: "原方程",
      lines: ["a₁X+b₁Y=c₁", "a₂X+b₂Y=c₂", "目标：消去 Y"],
    },
    lines: [
      { math: "b_2(a_1X+b_1Y)=b_2c_1" },
      { math: "a_1b_2X+b_1b_2Y=c_1b_2" },
      { math: "b_1(a_2X+b_2Y)=b_1c_2" },
      { math: "a_2b_1X+b_2b_1Y=c_2b_1" },
    ],
    groups: [equals(2), equals(2)],
    holdAfterSeconds: 5,
    note: "分配律：括号里的每一项，都乘同一个倍数",
  },
  "228-xsubtract": {
    title: "第一条新等式，减去第二条",
    mode: "下面三行合起来，是同一个等式",
    panel: {
      title: "相减规则",
      lines: ["左边减左边", "右边减右边", "括号前的负号作用于整组"],
    },
    lines: [
      { math: "(a_1b_2X+b_1b_2Y)" },
      { math: "{}-(a_2b_1X+b_2b_1Y)" },
      { math: "{}=c_1b_2-c_2b_1" },
    ],
    groups: [left(3)],
    holdAfterSeconds: 5,
    note: "不是只减第一项；第二个括号里的两项都要减去",
  },
  "228-xcancel": {
    title: "展开减号，再把同类项放一起",
    mode: "交换乘法次序，b₁b₂ 与 b₂b₁ 相等",
    panel: {
      title: "两组同类项",
      lines: [
        "X 项：提取共同的 X",
        "Y 项：相同系数相减为零",
        "等式右边保持不变",
      ],
    },
    lines: [
      { math: "a_1b_2X-a_2b_1X" },
      { math: "{}+b_1b_2Y-b_2b_1Y" },
      { math: "{}=c_1b_2-c_2b_1" },
      { math: "(a_1b_2-a_2b_1)X=c_1b_2-c_2b_1" },
    ],
    groups: [left(3), left(1)],
    holdAfterSeconds: 5,
    note: "前三行是展开后的同一个等式；最后一行消去了 Y",
  },
  "228-xdivide": {
    title: "已经证明 Δ≠0，现在才能除",
    mode: "把横坐标前的系数，写成刚才定义的 Δ",
    panel: {
      title: "除法的依据",
      lines: ["Δ=a₁b₂−a₂b₁", "选定条件保证 Δ≠0", "两边同时除以 Δ"],
    },
    lines: [
      { math: "\\Delta X=c_1b_2-c_2b_1" },
      { math: "X=\\frac{c_1b_2-c_2b_1}{\\Delta}" },
      { text: "横坐标的分母来自消元后的除法" },
    ],
    groups: [equals(2), left(1)],
    holdAfterSeconds: 5,
    note: "乘倍数可能用到零；这里的除法只除以已证明非零的 Δ",
  },
  "228-ymultiply": {
    title: "再求 Y：这次让两个 X 项相同",
    mode: "第一式乘 a₂，第二式乘 a₁",
    panel: {
      title: "仍用原方程",
      lines: ["a₁X+b₁Y=c₁", "a₂X+b₂Y=c₂", "目标：消去 X"],
    },
    lines: [
      { math: "a_2(a_1X+b_1Y)=a_2c_1" },
      { math: "a_1a_2X+a_2b_1Y=a_2c_1" },
      { math: "a_1(a_2X+b_2Y)=a_1c_2" },
      { math: "a_1a_2X+a_1b_2Y=a_1c_2" },
    ],
    groups: [equals(2), equals(2)],
    holdAfterSeconds: 5,
    note: "每个括号逐项展开；两个 X 项现在完全相同",
  },
  "228-ysubtract": {
    title: "这次用第二条新等式减第一条",
    mode: "仍把同一个减法等式分成三行",
    panel: {
      title: "选择相减次序",
      lines: ["第二式减第一式", "让 Y 的系数也成为 Δ", "等式两边使用相同次序"],
    },
    lines: [
      { math: "(a_1a_2X+a_1b_2Y)" },
      { math: "{}-(a_1a_2X+a_2b_1Y)" },
      { math: "{}=a_1c_2-a_2c_1" },
    ],
    groups: [left(3)],
    holdAfterSeconds: 5,
    note: "减法有次序；不能只在等式的一边交换先后",
  },
  "228-ycancel": {
    title: "两个 X 项抵消，留下 Y",
    mode: "先展开减号，再提取共同的 Y",
    panel: {
      title: "相同项相减",
      lines: ["a₁a₂X−a₁a₂X=0", "留下两个 Y 项", "Y 的系数仍然是 Δ"],
    },
    lines: [
      { math: "a_1a_2X-a_1a_2X" },
      { math: "{}+a_1b_2Y-a_2b_1Y" },
      { math: "{}=a_1c_2-a_2c_1" },
      { math: "(a_1b_2-a_2b_1)Y=a_1c_2-a_2c_1" },
    ],
    groups: [left(3), left(1)],
    holdAfterSeconds: 5,
    note: "前三行是同一个等式；最后一行合并剩下的同类项",
  },
  "228-ydivide": {
    title: "同除以 Δ，纵坐标也求出来了",
    mode: "同一个非零除数，出现在两个坐标中",
    panel: {
      title: "两个坐标",
      lines: ["先消 Y，得到 X", "再消 X，得到 Y", "两次除法都以 Δ≠0 为依据"],
    },
    lines: [
      { math: "\\Delta Y=a_1c_2-a_2c_1" },
      { math: "Y=\\frac{a_1c_2-a_2c_1}{\\Delta}" },
      { math: "X=\\frac{c_1b_2-c_2b_1}{\\Delta}" },
    ],
    groups: [equals(2), left(1)],
    holdAfterSeconds: 5,
    note: "下一段将估计 |Δ|，再讨论转正与约分",
  },
  "228-segments": {
    title: "直线交点，还不一定在线段上",
    mode: "本段求的是两条直线的唯一公共点",
    panel: {
      title: "别混淆范围",
      lines: [
        "直线向两端无限延伸",
        "线段只保留两个端点之间",
        "延长线相交不等于线段相交",
      ],
    },
    lines: [
      { text: "先求两条直线的交点坐标" },
      { text: "再判断它是否同时位于两条线段内" },
      { text: "只有同时位于两段内，才是线段交点" },
      { text: "平行、重合时不能套用唯一交点公式" },
    ],
    groups: [left(4)],
    note: "接下来只估计这些坐标的分母，不展开求交算法",
  },
};

export const shots228: Shot[] = [
  {
    id: "228-01",
    page: "228-system",
    step: 2,
    caption:
      "一般情况下，把两条直线写成这两个方程。下标 1、2 只是直线的编号，不是乘法，也不是平方。",
  },
  {
    id: "228-02",
    page: "228-system",
    step: 4,
    caption:
      "每组 a 乘横坐标，b 乘纵坐标，c 在等号右边。X、Y 是同一个交点的坐标。每条直线的 a、b 不能同时为零，六个系数按前集约定取整数。",
  },
  {
    id: "228-03",
    page: "228-delta",
    step: 2,
    caption:
      "先把 a₁ 与 b₂ 相乘，再把 a₂ 与 b₁ 相乘。用前一个乘积减去后一个，把得到的差记作 Δ，读作德尔塔。稍后，它会成为除数。",
  },
  {
    id: "228-04",
    page: "228-delta",
    step: 4,
    caption:
      "我们只讨论不平行、也不重合的两条直线。先分情况证明 Δ 不等于零，再进行除法。",
  },
  {
    id: "228-05",
    page: "228-slopes",
    step: 2,
    caption:
      "先假设两个 b 都不为零。方程两边减去 aX，再除以非零的 b。先用 −a 除以 b，得到的商再乘以 X；然后加上 c 除以 b 得到的商，结果就是 Y。",
  },
  {
    id: "228-06",
    page: "228-slopes",
    step: 4,
    caption:
      "横坐标增加 1，纵坐标的改变量叫斜率。因此，第一条直线的斜率是 −a₁/b₁，第二条直线的斜率是 −a₂/b₂。",
  },
  {
    id: "228-07",
    page: "228-contradiction",
    step: 1,
    caption: "假如 Δ 等于零，两个乘积就相等，也就是 a₁b₂=a₂b₁。",
  },
  {
    id: "228-08",
    page: "228-contradiction",
    step: 3,
    caption:
      "b₁ 与 b₂ 的乘积不为零，两边同除以这个乘积，得到 a₁/b₁=a₂/b₂。两边再取相反数，两条直线的斜率就相同了。",
  },
  {
    id: "228-09",
    page: "228-contradiction",
    step: 4,
    caption:
      "相同斜率下，纵轴截距不同就平行，相同就重合。都与选定条件矛盾，所以 Δ 不等于零。",
  },
  {
    id: "228-10",
    page: "228-vertical1",
    step: 2,
    caption:
      "如果 b₁ 等于零，a₁ 就不能为零。第一条直线成为 X=c₁/a₁，横坐标固定，因此是一条竖直直线。",
  },
  {
    id: "228-11",
    page: "228-vertical1",
    step: 4,
    caption:
      "另一条不能也竖直，否则只会平行或重合。因此 b₂ 非零，Δ=a₁b₂，两个非零数相乘仍然非零。",
  },
  {
    id: "228-12",
    page: "228-vertical2",
    step: 2,
    caption:
      "如果 b₂ 等于零，则 a₂ 非零，第二条直线是 X=c₂/a₂。第一条不能也竖直，所以 b₁ 非零。",
  },
  {
    id: "228-13",
    page: "228-vertical2",
    step: 4,
    caption:
      "此时 Δ=−a₂b₁，也不等于零。三个情况都已覆盖，现在可以放心使用这个非零除数。",
  },
  {
    id: "228-14",
    page: "228-xmultiply",
    step: 2,
    caption:
      "先消去 Y。第一式两边乘 b₂，左边每一项都乘这个倍数。展开后，第一项是 a₁、b₂ 与 X 的乘积；第二项是 b₁、b₂ 与 Y 的乘积。两项的和，等于右边 c₁ 与 b₂ 的乘积。",
  },
  {
    id: "228-15",
    page: "228-xmultiply",
    step: 4,
    caption:
      "用 b₁ 乘第二式的两边，同样逐项展开。左边第一项是 a₂、b₁ 与 X 的乘积；第二项是 b₂、b₁ 与 Y 的乘积。它们的和，等于右边 c₂ 与 b₁ 的乘积。两个 Y 项的系数相同。",
  },
  {
    id: "228-16",
    page: "228-xsubtract",
    step: 2,
    caption:
      "用第一条新等式减去第二条。左边先保留第一组，再减去整个第二组，不能只减其中一项。",
  },
  {
    id: "228-17",
    page: "228-xsubtract",
    step: 3,
    caption:
      "右边也按照相同次序相减，先计算 c₁b₂，再减去 c₂ 与 b₁ 的乘积。这三行合起来，表示同一个完整等式。",
  },
  {
    id: "228-18",
    page: "228-xcancel",
    step: 3,
    caption:
      "展开减号，第二组的两项都变成减去。把两个 X 项放一起，两个 Y 项放一起，右边不变。",
  },
  {
    id: "228-19",
    page: "228-xcancel",
    step: 4,
    caption:
      "b₁b₂ 与 b₂b₁ 相等，两个 Y 项抵消。剩下的 X 项提取共同的 X，系数是两个乘积的差：a₁ 与 b₂ 的乘积，减去 a₂ 与 b₁ 的乘积。",
  },
  {
    id: "228-20",
    page: "228-xdivide",
    step: 1,
    caption:
      "用 Δ 代替这个系数。左边是 Δ 与 X 的乘积；右边是两个乘积的差：c₁ 与 b₂ 的乘积，减去 c₂ 与 b₁ 的乘积。两边相等。",
  },
  {
    id: "228-21",
    page: "228-xdivide",
    step: 3,
    caption:
      "已经证明 Δ 非零，两边同除以 Δ，就得到横坐标公式。分子是刚才得到的差，分母是 Δ。",
  },
  {
    id: "228-22",
    page: "228-ymultiply",
    step: 2,
    caption:
      "求 Y 时，重新使用原方程。第一式两边乘 a₂。展开后，左边第一项是 a₁、a₂ 与 X 的乘积；第二项是 a₂、b₁ 与 Y 的乘积。它们的和，等于右边 a₂ 与 c₁ 的乘积。",
  },
  {
    id: "228-23",
    page: "228-ymultiply",
    step: 4,
    caption:
      "第二式两边乘 a₁。展开后，左边第一项是 a₁、a₂ 与 X 的乘积；第二项是 a₁、b₂ 与 Y 的乘积。它们的和，等于右边 a₁ 与 c₂ 的乘积。这次，两个 X 项完全相同。",
  },
  {
    id: "228-24",
    page: "228-ysubtract",
    step: 2,
    caption:
      "这次用第二条新等式减第一条，让 Y 的系数仍然是 Δ。左边要减去的是第一条新等式左边的整个和，其中两项都要减去。",
  },
  {
    id: "228-25",
    page: "228-ysubtract",
    step: 3,
    caption:
      "右边也用第二项减第一项，用 a₁ 与 c₂ 的乘积，减去 a₂ 与 c₁ 的乘积。减法次序必须在两边保持一致。",
  },
  {
    id: "228-26",
    page: "228-ycancel",
    step: 3,
    caption:
      "展开括号前的减号，再按同类项排列。两个完全相同的 X 项相减，正好抵消。",
  },
  {
    id: "228-27",
    page: "228-ycancel",
    step: 4,
    caption:
      "剩下两个含 Y 的项。前一项是 a₁、b₂ 与 Y 的乘积；后一项是 a₂、b₁ 与 Y 的乘积。前一项减去后一项。提取共同的 Y，计算系数时先把 a₁ 与 b₂ 相乘，再减去 a₂ 与 b₁ 的乘积，也就是 Δ。",
  },
  {
    id: "228-28",
    page: "228-ydivide",
    step: 2,
    caption:
      "因此，Δ 与 Y 的乘积，等于右边刚才得到的差。两边同除以非零的 Δ，纵坐标的分子是这个差，分母也是 Δ。",
  },
  {
    id: "228-29",
    page: "228-ydivide",
    step: 3,
    caption:
      "先消 Y 求 X，再消 X 求 Y。两次计算都要除以 Δ，所以接下来要估计 Δ 的绝对值。",
  },
  {
    id: "228-30",
    page: "228-segments",
    step: 2,
    caption:
      "还要分清直线和线段。公式求的是直线的交点，还需判断这个点是否同时位于两条线段内。",
  },
  {
    id: "228-31",
    page: "228-segments",
    step: 4,
    caption:
      "只有同时位于两段内，才是线段交点。平行、重合的直线不能套用唯一交点公式。下面继续讨论分母。",
  },
];
