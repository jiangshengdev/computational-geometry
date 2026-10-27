import type { TeachingGroup } from "../../../shared/math/math-lines.ts";
export type Line = { text?: string; math?: string };
export type Page = {
  title: string;
  diagram: string | null;
  lines: Line[];
  groups: TeachingGroup[];
  holdAfterSeconds: number;
};
export type Shot = {
  id: string;
  page: string;
  step: number;
  caption: string;
  pauseAfter?: number;
  motion?: { start: string; end: string };
};
export const pages: Record<string, Page> = {
  recap: {
    title: "先回顾：剪切改变什么？",
    diagram: null,
    lines: [
      {
        text: "横坐标加上 s 倍纵坐标，纵坐标不变",
      },
      {
        math: "X'=X+sY,\\qquad Y'=Y",
      },
      {
        math: "s=\\frac1{256(M+1)^5}>0",
      },
      {
        text: "M：1 与放大后全部端点坐标绝对值的最大值",
      },
    ],
    groups: [
      {
        count: 4,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
  points: {
    title: "同横坐标，先看两个具体位置",
    diagram: "points",
    lines: [
      {
        math: "P=(1,\\tfrac12),\\quad Q=(1,\\tfrac52)",
      },
      {
        math: "s=\\frac12",
      },
    ],
    groups: [
      {
        count: 2,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
  "question-order": {
    title: "先想一想：剪切后谁在左？",
    diagram: "points",
    lines: [
      {
        text: "先想一想：P、Q 谁在左？",
      },
      {
        math: "X'_P=1+\\frac12\\times\\frac12=\\frac54",
      },
      {
        math: "X'_Q=1+\\frac12\\times\\frac52=\\frac94",
      },
      {
        math: "\\frac54<\\frac94",
      },
    ],
    groups: [
      {
        count: 4,
        align: "left",
      },
    ],
    holdAfterSeconds: 5,
  },
  difference: {
    title: "为什么较低的点在左？",
    diagram: null,
    lines: [
      {
        math: "X_P=X_Q,\\quad Y_P<Y_Q,\\quad s>0",
      },
      {
        math: "X'_Q-X'_P=(X_Q+sY_Q)-(X_P+sY_P)",
      },
      {
        math: "=X_Q-X_P+sY_Q-sY_P",
      },
      {
        math: "=s(Y_Q-Y_P)>0",
      },
    ],
    groups: [
      {
        count: 1,
        align: "left",
      },
      {
        count: 3,
        align: "equals",
      },
    ],
    holdAfterSeconds: 5,
  },
  vertical: {
    title: "非零竖直线段变斜",
    diagram: "vertical",
    lines: [
      {
        text: "用线段连接刚才的 P、Q",
      },
      {
        math: "P'=(\\tfrac54,\\tfrac12),\\quad Q'=(\\tfrac94,\\tfrac52)",
      },
    ],
    groups: [
      {
        count: 2,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
  nonvertical: {
    title: "其他非零线段会不会变竖直？",
    diagram: null,
    lines: [
      {
        text: "以下使用算法的正安全系数",
      },
      {
        math: "X_P\\ne X_Q\\ \\Longrightarrow\\ X'_P\\ne X'_Q",
      },
      {
        text: "横坐标相同：非零保证纵坐标不同",
      },
      {
        text: "两种情况：非零线段剪切后均不竖直",
      },
    ],
    groups: [
      {
        count: 4,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
  coincident: {
    title: "同一个位置，不会被拆开",
    diagram: "coincident",
    lines: [
      {
        math: "P=Q=(1,1)",
      },
      {
        math: "P'=Q'=(\\tfrac32,1)",
      },
      {
        text: "同一位置 ≠ 同一原始输入",
      },
    ],
    groups: [
      {
        count: 3,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
  parallel: {
    title: "分母为零，先分清几何关系",
    diagram: "parallel",
    lines: [
      {
        text: "平行但不共线：没有交点",
      },
      {
        math: "\\Delta=a_1b_2-a_2b_1=0",
      },
      {
        text: "共线：同一条直线，仍要比较线段范围",
      },
    ],
    groups: [
      {
        count: 3,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
  disjoint: {
    title: "共线的第一种：相离",
    diagram: "disjoint",
    lines: [
      {
        math: "[0,1]\\cap[2,3]=\\varnothing",
      },
      {
        text: "图上区分两条输入，并标出完整交集",
      },
    ],
    groups: [
      {
        count: 2,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
  touch: {
    title: "共线的第二种：接触一点",
    diagram: "touch",
    lines: [
      {
        math: "[0,2]\\cap[2,3]=\\{2\\}",
      },
      {
        text: "图上区分两条输入，并标出完整交集",
      },
    ],
    groups: [
      {
        count: 2,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
  overlap: {
    title: "共线的第三种：重叠区间",
    diagram: "overlap",
    lines: [
      {
        math: "[0,3]\\cap[1,4]=[1,3]",
      },
      {
        text: "边界来自输入端点，输入身份仍保留",
      },
    ],
    groups: [
      {
        count: 2,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
  crossing: {
    title: "第三条线段，穿过重叠区间",
    diagram: "crossing",
    lines: [
      {
        text: "第三条线段：从 (1,0) 到 (3,2)",
      },
      {
        math: "R=(2,1)\\ \\longmapsto\\ R'=(\\tfrac52,1)",
      },
      {
        text: "穿越位置是实际交点，仍在估计覆盖内",
      },
    ],
    groups: [
      {
        count: 3,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
  "question-point": {
    title: "先想一想：一个点会被拉长吗？",
    diagram: "point",
    lines: [
      {
        text: "端点同为 (1,1)，会被拉长吗？",
      },
      {
        math: "A=B=(1,1)",
      },
      {
        math: "A'=B'=(\\tfrac32,1)",
      },
    ],
    groups: [
      {
        count: 3,
        align: "left",
      },
    ],
    holdAfterSeconds: 5,
  },
  "point-line": {
    title: "点输入，没有唯一支撑直线",
    diagram: "point-lines",
    lines: [
      {
        text: "经过一个点，可以画出多条直线",
      },
      {
        text: "按端点位置考虑，不套非零线段公式",
      },
    ],
    groups: [
      {
        count: 2,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
  branch: {
    title: "算法并非每次都剪切",
    diagram: null,
    lines: [
      {
        text: "存在非零竖直线段：选择正安全系数",
      },
      {
        math: "\\text{否则}\\quad s=0",
      },
      {
        text: "同横坐标被分开，只描述正系数分支",
      },
    ],
    groups: [
      {
        count: 3,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
  scale: {
    title: "回到原坐标：先介绍两套坐标",
    diagram: null,
    lines: [
      {
        math: "D>0,\\qquad X=Dx,\\quad Y=Dy",
      },
      {
        math: "(x,y)=(\\tfrac12,\\tfrac32),\\quad D=2,\\quad s=\\tfrac12",
      },
    ],
    groups: [
      {
        count: 2,
        align: "left",
      },
    ],
    holdAfterSeconds: 5,
  },
  "shear-first": {
    title: "路径一：先剪切，再放大",
    diagram: null,
    lines: [
      {
        math: "x'=\\frac12+\\frac12\\times\\frac32=\\frac54",
      },
      {
        math: "y'=\\frac32",
      },
      {
        math: "(Dx',Dy')=(\\tfrac52,3)",
      },
    ],
    groups: [
      {
        count: 3,
        align: "left",
      },
    ],
    holdAfterSeconds: 5,
  },
  "scale-first": {
    title: "路径二：先放大，再剪切",
    diagram: null,
    lines: [
      {
        math: "(X,Y)=(2\\times\\tfrac12,2\\times\\tfrac32)=(1,3)",
      },
      {
        math: "X'=1+\\frac12\\times3=\\frac52",
      },
      {
        math: "(X',Y')=(\\tfrac52,3)=(Dx',Dy')",
      },
    ],
    groups: [
      {
        count: 3,
        align: "left",
      },
    ],
    holdAfterSeconds: 5,
  },
  distribution: {
    title: "分配律说明：同一个系数就够了",
    diagram: null,
    lines: [
      {
        math: "D(x+sy)",
      },
      {
        math: "=Dx+Dsy",
      },
      {
        math: "=Dx+s(Dy)",
      },
      {
        math: "=X+sY",
      },
      {
        text: "纵坐标均为 Dy；s 无须再乘除 D",
      },
    ],
    groups: [
      {
        count: 1,
        align: "left",
      },
      {
        count: 3,
        align: "equals",
      },
      {
        count: 1,
        align: "left",
      },
    ],
    holdAfterSeconds: 5,
  },
  summary: {
    title: "特殊情况分清楚，同一个系数走到底",
    diagram: null,
    lines: [
      {
        text: "正安全系数：分开同横坐标的不同位置",
      },
      {
        text: "完整交集可能是点，也可能是重叠区间",
      },
      {
        text: "缩放与剪切交换顺序，s 保持不变",
      },
    ],
    groups: [
      {
        count: 3,
        align: "left",
      },
    ],
    holdAfterSeconds: 3,
  },
};
export const shots: Shot[] = [
  {
    id: "237-01",
    page: "recap",
    step: 1,
    caption: "沿用前集的剪切公式，横坐标加上 s 倍纵坐标。纵坐标保持不变。",
  },
  {
    id: "237-02",
    page: "recap",
    step: 2,
    caption: "X、Y 是剪切前的坐标，带撇号的是剪切后的坐标。",
  },
  {
    id: "237-03",
    page: "recap",
    step: 3,
    caption: "前集的正安全系数是，二百五十六乘以 M 加一的五次方的倒数。",
  },
  {
    id: "237-04",
    page: "recap",
    step: 4,
    caption:
      "沿用前集定义，这里用 M 表示一与放大后全部端点坐标绝对值的最大值。这个系数保持原横坐标不同事件的左右顺序。",
  },
  {
    id: "237-05",
    page: "points",
    step: 1,
    caption:
      "选取点 P 和点 Q，P 的坐标是一、二分之一。Q 的坐标是一、二分之五。P 较低，Q 较高。",
  },
  {
    id: "237-06",
    page: "points",
    step: 2,
    caption:
      "为看清变化，这里取演示系数二分之一。它不是算法安全系数，不能保证任意事件全局保序。",
  },
  {
    id: "237-07",
    page: "question-order",
    step: 1,
    caption:
      "同样使用正的演示系数，剪切后谁在左？是较低的 P，还是较高的 Q？请先想一想。",
    pauseAfter: 4,
  },
  {
    id: "237-08",
    page: "question-order",
    step: 2,
    caption:
      "先计算 P 的新横坐标，一加二分之一乘以二分之一。等于一加四分之一，也就是四分之五。",
  },
  {
    id: "237-09",
    page: "question-order",
    step: 3,
    caption: "再计算 Q 的新横坐标，一加二分之一乘以二分之五。等于四分之九。",
  },
  {
    id: "237-10",
    page: "question-order",
    step: 4,
    caption: "四分之五小于四分之九，所以较低的 P 在左。纵坐标仍然不变。",
  },
  {
    id: "237-11",
    page: "difference",
    step: 1,
    caption:
      "现在看一般情形，P 与 Q 的横坐标相同。点 P 的纵坐标小于点 Q 的纵坐标，剪切系数 s 大于零。",
  },
  {
    id: "237-12",
    page: "difference",
    step: 2,
    caption:
      "用 Q 的新横坐标减去 P 的新横坐标，把两点各自的剪切公式代入。注意减去的是整个和。",
  },
  {
    id: "237-13",
    page: "difference",
    step: 3,
    caption: "去掉括号后，被减去的两项都带负号。再把原横坐标的两项放在一起。",
  },
  {
    id: "237-14",
    page: "difference",
    step: 4,
    caption:
      "原横坐标相等，相减为零。剩下 s 乘以纵坐标之差，两个因子都为正。因此较低的点在左。",
  },
  {
    id: "237-15",
    page: "vertical",
    step: 1,
    caption:
      "把刚才的 P 与 Q 连接成线段，它是非零竖直线段。两个端点的纵坐标不同。",
  },
  {
    id: "237-16",
    motion: { start: "剪切后", end: "倾斜" },
    page: "vertical",
    step: 2,
    caption:
      "剪切后两个端点的新横坐标不同，线段从竖直变成倾斜。图中仍用二分之一作演示。",
  },
  {
    id: "238-01",
    page: "nonvertical",
    step: 1,
    caption: "接下来回到算法的正安全系数，不能把演示系数用于这个全局结论。",
  },
  {
    id: "238-02",
    page: "nonvertical",
    step: 2,
    caption:
      "若非零线段的两个端点原横坐标不同，前集的保序结论保证它们剪切后仍然不同。",
  },
  {
    id: "238-03",
    page: "nonvertical",
    step: 3,
    caption:
      "若原横坐标相同，非零就保证两个端点的纵坐标不同。刚才的正系数推导保证新横坐标不同。",
  },
  {
    id: "238-04",
    page: "nonvertical",
    step: 4,
    caption:
      "这两种情况覆盖所有非零线段，因此正安全系数既消除竖直线段。也不会把其他非零线段变竖直。",
  },
  {
    id: "238-05",
    page: "coincident",
    step: 1,
    caption:
      "现在令两个带不同标记的位置完全重合，都在坐标一、一处。标记可以来自不同原始输入。",
  },
  {
    id: "238-06",
    page: "coincident",
    step: 2,
    caption:
      "仍取二分之一演示，两者的新横坐标都等于二分之三。纵坐标仍为一，位置仍重合。",
  },
  {
    id: "238-07",
    page: "coincident",
    step: 3,
    caption:
      "剪切不能把同一点上的参与线段拆成不同事件位置，也不会把不同原始输入合并成一个输入。",
  },
  {
    id: "238-08",
    page: "parallel",
    step: 1,
    caption: "图中两条水平线平行，但不在同一条直线上。它们没有交点。",
  },
  {
    id: "238-09",
    page: "parallel",
    step: 2,
    caption:
      "沿用第四集的直线系数与消元分母，平行时这个分母等于零。不能用唯一交点公式，因为不能除以零。",
  },
  {
    id: "238-10",
    page: "parallel",
    step: 3,
    caption:
      "共线则表示位于同一条直线上，但有限线段的交集还要比较范围。下面分三种情况。",
  },
  {
    id: "238-11",
    page: "disjoint",
    step: 1,
    caption:
      "先看纵坐标为一的同一直线，两条线段的横坐标范围分别是零到一和二到三。中间有空隙，交集为空。",
  },
  {
    id: "238-12",
    page: "disjoint",
    step: 2,
    caption:
      "图中用两种标记保留原始输入身份，剪切后的交集保持将在第七集完整证明。",
  },
  {
    id: "238-13",
    page: "touch",
    step: 1,
    caption:
      "再看范围零到二与二到三，两条线段只在横坐标二处接触。完整交集是一个点。",
  },
  {
    id: "238-14",
    page: "touch",
    step: 2,
    caption:
      "图中用两种标记保留原始输入身份，剪切后的交集保持将在第七集完整证明。",
  },
  {
    id: "238-15",
    page: "overlap",
    step: 1,
    caption:
      "最后看范围零到三与一到四，公共部分是从一到三的整个区间。交集不只是两个边界点。",
  },
  {
    id: "238-16",
    page: "overlap",
    step: 2,
    caption:
      "重叠区间的两个边界来自输入端点，已包含在事件位置中。不必把区间内无限多个点都当成事件。",
  },
  {
    id: "238-17",
    page: "crossing",
    step: 1,
    caption:
      "在刚才的重叠例子中，再加入从一、零到三、二的第三条线段。它与水平线段不平行。",
  },
  {
    id: "238-18",
    page: "crossing",
    step: 2,
    caption:
      "它穿过重叠区间的位置是 R，坐标二、一。演示剪切后横坐标变成二分之五，纵坐标仍是一。",
  },
  {
    id: "238-19",
    page: "crossing",
    step: 3,
    caption:
      "这个穿越位置是实际线段交点，仍在前面交点估计的覆盖范围内。同一位置可以对应多个相交输入对。",
  },
  {
    id: "238-20",
    page: "question-point",
    step: 1,
    caption:
      "现在一条输入的两个端点都在一、一处，它的长度为零。使用二分之一演示剪切，它会被拉长吗？请先想一想。",
    pauseAfter: 4,
  },
  {
    id: "238-21",
    page: "question-point",
    step: 2,
    caption: "用 A 和 B 分别标记这条输入的两个端点，它们的位置完全相同。",
  },
  {
    id: "238-22",
    page: "question-point",
    step: 3,
    caption:
      "两个端点经过相同计算，新横坐标都是二分之三。纵坐标仍是一，因此剪切后还是一个点。",
  },
  {
    id: "238-23",
    page: "point-line",
    step: 1,
    caption:
      "经过这个点，可以画出多条方向不同的直线。因此点输入没有唯一支撑直线。",
  },
  {
    id: "238-24",
    page: "point-line",
    step: 2,
    caption:
      "它的位置作为端点被包含，不能把它当成有确定斜率的非零线段。也不能直接套用两条支撑直线的唯一交点公式。",
  },
  {
    id: "239-01",
    page: "branch",
    step: 1,
    caption:
      "当前算法先检查是否存在非零竖直线段，存在时才选择前集的正安全系数。",
  },
  {
    id: "239-02",
    page: "branch",
    step: 2,
    caption:
      "否则取 s 等于零，保持原坐标。零长度点输入本身不会触发正系数分支。",
  },
  {
    id: "239-03",
    page: "branch",
    step: 3,
    caption:
      "所以同横坐标的不同位置被分开，只描述正系数分支。并不是每次计算都发生的变化。",
  },
  {
    id: "239-04",
    page: "scale",
    step: 1,
    caption:
      "用正整数公共分母 D，把全部输入端点放大到整数坐标。小写 x、y 表示原坐标，大写 X、Y 表示放大后的坐标。",
  },
  {
    id: "239-05",
    page: "scale",
    step: 2,
    caption:
      "选取原坐标二分之一、二分之三，放大倍数取二。仍用二分之一演示系数，只比较两种操作顺序。",
  },
  {
    id: "239-06",
    page: "shear-first",
    step: 1,
    caption:
      "先在原坐标中剪切，二分之一加二分之一乘以二分之三。得到新横坐标四分之五。",
  },
  {
    id: "239-07",
    page: "shear-first",
    step: 2,
    caption: "纵坐标不变，仍然是二分之三。",
  },
  {
    id: "239-08",
    page: "shear-first",
    step: 3,
    caption: "再把两个坐标都放大二倍，横坐标是二分之五。纵坐标是三。",
  },
  {
    id: "239-09",
    page: "scale-first",
    step: 1,
    caption: "换一个顺序，先把原来的两个坐标都放大二倍。得到一、三。",
  },
  {
    id: "239-10",
    page: "scale-first",
    step: 2,
    caption:
      "仍用同一个二分之一作系数，新横坐标是一加二分之一乘以三。结果也是二分之五。",
  },
  {
    id: "239-11",
    page: "scale-first",
    step: 3,
    caption:
      "纵坐标保持为三，两条路径得到完全相同的坐标。系数没有额外乘二或除以二。",
  },
  {
    id: "239-12",
    page: "distribution",
    step: 1,
    caption:
      "一般情况下，先剪切再放大后的横坐标。就是 D 乘以 x 与 s 乘以 y 的和。",
  },
  {
    id: "239-13",
    page: "distribution",
    step: 2,
    caption:
      "用乘法分配律，D 分别乘括号内的两项。得到 D 乘以 x，加上 D、s、y 的乘积。",
  },
  {
    id: "239-14",
    page: "distribution",
    step: 3,
    caption: "交换乘法顺序并分组，第二项写成 s 乘以 D 与 y 的乘积。",
  },
  {
    id: "239-15",
    page: "distribution",
    step: 4,
    caption:
      "把 D 乘以 x 换成大写 X，把 D 乘以 y 换成大写 Y。这正是先放大再剪切的横坐标。",
  },
  {
    id: "239-16",
    page: "distribution",
    step: 5,
    caption:
      "两条路径的纵坐标也都等于 D 乘以 y，因此原坐标与放大坐标使用同一个 s。无须再乘或除一次 D。",
  },
  {
    id: "240-01",
    page: "summary",
    step: 1,
    caption:
      "总结本集，正安全系数分开同横坐标的不同位置。完全重合的位置仍然重合，输入身份仍然保留。",
  },
  {
    id: "240-02",
    page: "summary",
    step: 2,
    caption:
      "共线线段可能相离、接触或重叠，点输入仍是点。第三条线段穿越重叠区间产生的实际交点，也包含在考虑范围内。",
  },
  {
    id: "240-03",
    page: "summary",
    step: 3,
    caption:
      "缩放与剪切可以交换顺序，两套坐标使用同一个系数。第七集再完整证明，为什么剪切保持交集。",
  },
];
