import { equals, left, type TeachingGroup } from "./math-lines.ts";

export type Shot = {
  id: string;
  page: string;
  step: number;
  caption: string;
  pauseAfter?: number;
  motion?: { start: string; end: string };
  reveal?: string;
  diagramStep?: number;
};

export type Page = {
  title: string;
  mode: string;
  diagram:
    | "scan"
    | "positive"
    | "formula"
    | "negative-question"
    | "negative"
    | "coordinates"
    | "read-original"
    | "comparison"
    | "horizontal-axis"
    | "vertical-axis";
  lines: { math?: string; text?: string }[];
  note: string;
  groups: TeachingGroup[];
  noteFromStep?: number;
  holdAfterSeconds?: 5;
};

export const pages: Record<string, Page> = {
  readOriginal: {
    groups: [left(2), left(2)], // 横坐标读法；纵坐标读法
    title: "先回想：直角坐标怎样读数？",
    mode: "模式二 · 点 P 相对原点保持不动",
    diagram: "read-original",
    lines: [
      { text: "读横坐标：沿纵轴的平行方向" },
      { math: "x=2" },
      { text: "读纵坐标：沿横轴的平行方向" },
      { math: "y=2" },
    ],
    note: "看辅助线与哪条轴平行，再看它落在哪条轴上",
  },
  horizontalExample: {
    groups: [left(1), equals(2), left(1)], // 条件；计算；坐标结论
    title: "先看新横轴刻度 2 对应的点",
    mode: "模式二 · 用具体数值核对同一个位置",
    diagram: "horizontal-axis",
    lines: [
      { math: "x'=2,\\quad y'=0" },
      { math: "y=y'=0" },
      { math: "x=2-s\\times0=2" },
      { math: "(x,y)=(2,0)=(x',y')" },
    ],
    note: "在两套坐标中，这个点都位于横轴刻度 2",
    noteFromStep: 4,
  },
  question2: {
    groups: [left(2), left(1)], // 已知读数；问题
    title: "暂停思考：位置变了，还是读数方法变了？",
    mode: "已知条件 · 点 P 相对原点始终不动",
    diagram: "coordinates",
    lines: [
      { math: "[P]_{(x,y)}=(2,2)" },
      { math: "[P]_{(x',y')}=(3,2)" },
      { text: "这是移动点，还是更换坐标系？" },
    ],
    note: "请结合画面条件判断；问题讲完后思考 4 秒",
  },
  compareMove: {
    groups: [left(2), left(2)], // 新旧点；操作解释
    title: "对照一：坐标轴不动，画出新点",
    mode: "模式一 · 固定原来的直角坐标轴",
    diagram: "positive",
    lines: [
      { math: "P=(2,2)" },
      { math: "P'=(3,2)" },
      { text: "横坐标增加 1，点向右移动 1" },
      { text: "两组数都用原来的坐标轴画点" },
    ],
    note: "P 和 P′ 是不同的位置",
  },
  compareRead: {
    groups: [left(2), left(2)], // 两套读数；判断结论
    title: "对照二：点不动，更换读数所用的轴",
    mode: "模式二 · 固定原来的 P",
    diagram: "coordinates",
    lines: [
      { math: "[P]_{(x,y)}=(2,2)" },
      { math: "[P]_{(x',y')}=(3,2)" },
      { text: "位置相同，读数所用的坐标系不同" },
      { text: "所以思考题的答案是：换坐标系" },
    ],
    note: "不要把同一位置的新读数，当成移动后的新位置",
  },
  ending: {
    groups: [left(1), left(2), left(1)], // 共同公式；两种操作；下一集问题
    title: "同一个公式，两种不同操作",
    mode: "同一公式：x′=x+sy，y′=y · 先明确固定的对象",
    diagram: "comparison",
    lines: [
      { math: "x'=x+sy,\\quad y'=y" },
      { text: "固定坐标轴：点移动" },
      { text: "固定几何点：读数方式改变" },
      { text: "下一集：系数能随便选吗？" },
    ],
    note: "本集只建立坐标直觉，系数大小留到下一集",
  },
  inverse: {
    holdAfterSeconds: 5,
    groups: [left(2), equals(3), left(1)], // 原始关系；代入与抵消；逆变换结论
    title: "从新坐标，求回原坐标",
    mode: "模式二 · 同一个点，两套坐标读数",
    diagram: "coordinates",
    lines: [
      { math: "y'=y\\quad\\Longrightarrow\\quad y=y'" },
      { math: "x'=x+sy" },
      { math: "x'=x+sy'" },
      { math: "x'-sy'=x+sy'-sy'" },
      { math: "x'-sy'=x" },
      { math: "x=x'-sy',\\quad y=y'" },
    ],
    note: "代入 → 两边减去同一个数 → 抵消 → 交换等式左右两边",
  },
  horizontal: {
    groups: [left(1), equals(2), left(1)], // 横轴条件；计算；结论
    title: "新横轴的位置和刻度，为什么都不变？",
    mode: "模式二 · 新横轴上的点满足 y′ = 0",
    diagram: "horizontal-axis",
    lines: [
      { math: "y'=0\\quad\\Longrightarrow\\quad y=0" },
      { math: "x=x'-s\\times0" },
      { math: "x=x'-0=x'" },
      { text: "每个位置相同，每个刻度也相同" },
    ],
    note: "灰色原横轴与紫色虚线新横轴重合",
  },
  vertical: {
    holdAfterSeconds: 5,
    groups: [left(2), equals(3), left(1)], // 条件；连续推导；原坐标结论
    title: "新纵轴刻度 2，究竟在哪里？",
    mode: "模式二 · 跟踪同一个固定点",
    diagram: "vertical-axis",
    lines: [
      { math: "s=\\frac12,\\quad y'=2" },
      { math: "x'=0,\\quad (x',y')=(0,2)" },
      { math: "y=y'=2" },
      { math: "x=0-\\frac12\\times2" },
      { math: "x=0-1=-1" },
      { math: "(x,y)=(-1,2)" },
    ],
    note: "新坐标 (0,2) 与原坐标 (−1,2)，描述同一个位置",
    noteFromStep: 6,
  },
  oblique: {
    groups: [left(2), left(2)], // 条件与符号判断；几何解释
    title: "向左倾斜的纵轴，不是旋转出来的直角坐标系",
    mode: "模式二 · 位置固定，坐标读数改变",
    diagram: "vertical-axis",
    lines: [
      { math: "x'=0\\quad\\Longrightarrow\\quad x=-sy'" },
      { math: "s>0,\\ y'>0\\quad\\Longrightarrow\\quad x<0" },
      { text: "纵轴朝左上方倾斜，横轴仍不变" },
      { text: "刻度 2 是读数，不是沿轴长度" },
    ],
    note: "两条轴不再垂直；不是把整套直角坐标系旋转",
  },
  coordinates: {
    groups: [left(1), left(2), left(1)], // 原读数；新横坐标读法；完整新读数
    title: "换一种操作：点不动，换坐标系",
    mode: "模式二 · 固定点 P，只改变读数方法",
    diagram: "coordinates",
    lines: [
      { math: "[P]_{(x,y)}=(2,2)" },
      { text: "过 P 沿新纵轴方向，读横坐标" },
      { math: "x'=3" },
      { math: "y'=2,\\quad [P]_{(x',y')}=(3,2)" },
    ],
    note: "下标说明使用哪套坐标系；点 P 相对原点的位置不变",
  },
  opening: {
    groups: [left(2), left(1)], // 扫描情境；引入问题
    title: "剪切如何改变坐标",
    mode: "开场示意 · 只看几何动机",
    diagram: "scan",
    lines: [
      { text: "扫描线从左向右移动" },
      { text: "竖直线段上的点，横坐标相同" },
      { text: "能不能把线段稍微推斜？" },
    ],
    note: "固定示意，不是算法执行轨迹",
  },
  positive: {
    groups: [left(1), equals(2), left(1)], // 条件；位移和横坐标计算；新点结论
    title: "先固定坐标轴，让点水平移动",
    mode: "模式一 · 坐标轴固定，点移动",
    diagram: "positive",
    lines: [
      { math: "s=\\frac12,\\quad P=(2,2)" },
      { math: "\\frac12\\times2=1" },
      { math: "x'=2+1=3" },
      { math: "y'=2,\\quad P'=(3,2)" },
    ],
    note: "这里的系数只用于图解，不是算法最终选用的小系数",
  },
  formula: {
    groups: [left(2), left(2)], // 变换公式；乘法与撇号解释
    title: "把刚才的计算写成一般公式",
    mode: "模式一 · 坐标轴固定，点移动",
    diagram: "formula",
    lines: [
      { math: "x'=x+sy" },
      { math: "y'=y" },
      { math: "sy=s\\times y" },
      { text: "撇号：用来区分新旧坐标" },
    ],
    note: "先算纵坐标乘系数，再加到原横坐标上",
  },
  question1: {
    groups: [left(1), left(2)], // 条件；思考问题
    title: "暂停思考：负高度的点往哪边走？",
    mode: "模式一 · 坐标轴仍然固定",
    diagram: "negative-question",
    lines: [
      { math: "s=\\frac12,\\quad Q=(-1,-1)" },
      { text: "向左移动，还是向右移动？" },
      { text: "新横坐标是多少？" },
    ],
    note: "问题讲完后，留 4 秒独立思考",
  },
  negative: {
    holdAfterSeconds: 5,
    groups: [equals(3), left(1)], // 连续计算；新点结论
    title: "负高度：加上一个负数，就向左移动",
    mode: "模式一 · 坐标轴固定，点移动",
    diagram: "negative",
    lines: [
      { math: "x'=-1+\\frac12\\times(-1)" },
      { math: "x'=-1-\\frac12" },
      { math: "x'=-\\frac22-\\frac12=-\\frac32" },
      { math: "y'=-1,\\quad Q'=(-\\frac32,-1)" },
    ],
    note: "不是每个点都加同一个常数：位移由高度决定",
  },
};

export const shots: Shot[] = [
  {
    id: "204-01",
    page: "opening",
    step: 1,
    caption: "想象一条扫描线，从左向右移动。",
    motion: { start: "从左", end: "移动" },
  },
  {
    id: "204-02",
    page: "opening",
    step: 2,
    caption: "遇到竖直线段时，线段上的点有相同的横坐标。",
  },
  {
    id: "204-03",
    page: "opening",
    step: 3,
    caption: "能不能把它稍微推斜？这一集，先理解剪切怎样改变坐标。",
    motion: { start: "稍微", end: "推斜" },
  },
  {
    id: "204-04",
    reveal: "取系数",
    page: "positive",
    step: 1,
    caption: "固定坐标轴。取系数二分之一，点 P 的横、纵坐标都是 2。",
  },
  {
    id: "204-05",
    reveal: "先把纵坐标",
    page: "positive",
    step: 2,
    caption: "先把纵坐标乘以系数：二分之一乘 2，得到 1。",
  },
  {
    id: "204-06",
    reveal: "把一加到",
    page: "positive",
    step: 3,
    caption: "把 1 加到原横坐标 2 上，新横坐标就是 3。",
  },
  {
    id: "204-07",
    reveal: "纵坐标仍为二",
    page: "positive",
    step: 4,
    caption: "纵坐标仍为 2。向右移动 1，得到新点 P′。",
    motion: { start: "向右", end: "新点" },
  },
  {
    id: "204-08",
    reveal: "新横坐标等于",
    page: "formula",
    step: 1,
    caption: "一般地，新横坐标等于原横坐标，加上系数乘原纵坐标。",
  },
  {
    id: "204-09",
    reveal: "新纵坐标等于",
    page: "formula",
    step: 2,
    caption: "新纵坐标等于原纵坐标，所以点只沿水平方向移动。",
  },
  {
    id: "204-10",
    reveal: "s、乘、y",
    page: "formula",
    step: 3,
    caption: "s 叫剪切系数。sy 表示 s 乘 y，这次取二分之一只为图解。",
  },
  {
    id: "204-11",
    reveal: "撇号",
    page: "formula",
    step: 4,
    caption: "字母右上方的撇号，只是区分新旧的记号，不是新的运算。",
  },
  {
    id: "204-12",
    page: "question1",
    step: 3,
    caption: "点 Q 的横、纵坐标都是负 1。它往哪边走？新横坐标是多少？",
    pauseAfter: 4,
  },
  {
    id: "204-13",
    reveal: "先算",
    page: "negative",
    step: 1,
    caption: "把负 1 代入公式，先算二分之一乘负 1。",
  },
  {
    id: "204-14",
    reveal: "乘积",
    page: "negative",
    step: 2,
    caption: "乘积是负二分之一，所以要从负 1 再减去二分之一。",
  },
  {
    id: "204-15",
    reveal: "负一写成",
    page: "negative",
    step: 3,
    caption: "负 1 写成负二分之二，相减得到负二分之三。",
  },
  {
    id: "204-16",
    reveal: "纵坐标仍为负一",
    page: "negative",
    step: 4,
    caption: "纵坐标仍为负 1。点向左移动二分之一，得到 Q′。",
    motion: { start: "向左", end: "得到" },
  },
  {
    id: "205-01",
    page: "readOriginal",
    step: 0,
    caption: "现在换一种操作。回到原来的 P，固定它的位置，不再移动点。",
  },
  {
    id: "205-01a",
    reveal: "落在横轴刻度二",
    page: "readOriginal",
    step: 2,
    caption: "先读原横坐标。过 P 画平行于原纵轴的竖直线，落在横轴刻度 2。",
    motion: { start: "过、P", end: "刻度二" },
  },
  {
    id: "205-01b",
    reveal: "落在纵轴刻度二",
    page: "readOriginal",
    step: 4,
    caption: "再读原纵坐标。过 P 画平行于原横轴的水平线，落在纵轴刻度 2。",
    motion: { start: "过、P", end: "刻度二" },
  },
  {
    id: "205-02",
    page: "coordinates",
    step: 1,
    caption: "保留水平横轴，改用向左倾斜的纵轴。点 P 与原点都不动。",
  },
  {
    id: "205-03",
    page: "coordinates",
    step: 2,
    caption: "过 P 画平行于新纵轴的线，找到它与横轴的交点。",
    motion: { start: "过、P", end: "交点" },
  },
  {
    id: "205-04",
    reveal: "交点在刻度三",
    page: "coordinates",
    step: 3,
    caption: "交点在刻度 3，所以新横坐标是 3，不能一律作垂线。",
  },
  {
    id: "205-05",
    reveal: "读出新纵坐标二",
    page: "coordinates",
    step: 4,
    caption: "再沿新横轴的平行方向，读出新纵坐标 2。",
    motion: { start: "再沿", end: "纵坐标二" },
  },
  {
    id: "205-06",
    page: "coordinates",
    step: 4,
    caption:
      "同一个 P，原横坐标是 2，原纵坐标是 2。新横坐标是 3，新纵坐标是 2。点没有移动。",
  },
  {
    id: "205-07",
    page: "coordinates",
    step: 4,
    caption: "坐标下方的标记，说明用哪套轴读数。斜轴刻度不等于沿轴长度。",
  },
  {
    id: "206-01",
    reveal: "原纵坐标等于",
    page: "inverse",
    step: 1,
    caption: "新旧纵坐标相等，所以把等式反过来写，原纵坐标等于新纵坐标。",
  },
  {
    id: "206-02",
    reveal: "再看横坐标公式",
    page: "inverse",
    step: 2,
    caption: "再看横坐标公式。现在已知新坐标，要反过来求原坐标。",
  },
  {
    id: "206-03",
    reveal: "换成、y、撇",
    page: "inverse",
    step: 3,
    caption: "因为 y 等于 y′，把右边的 y 换成 y′。",
  },
  {
    id: "206-04",
    reveal: "两边同时减去",
    page: "inverse",
    step: 4,
    caption: "要单独留下 x，就在等式两边同时减去 s 乘 y′。",
  },
  {
    id: "206-05",
    reveal: "只剩下、x",
    page: "inverse",
    step: 5,
    caption: "右边加上和减去的是同一个数，它们抵消，只剩下 x。",
  },
  {
    id: "206-06",
    reveal: "得到逆变换",
    page: "inverse",
    step: 6,
    caption: "交换等式左右两边，就得到逆变换；纵坐标的等式也一起保留。",
  },
  {
    id: "206-06a",
    reveal: "新横坐标是二",
    page: "horizontalExample",
    step: 1,
    caption: "先看新横轴刻度 2 的点。它的新横坐标是 2，新纵坐标是零。",
  },
  {
    id: "206-06b",
    reveal: "原纵坐标也是零",
    page: "horizontalExample",
    step: 2,
    caption: "新旧纵坐标相等，所以原纵坐标也是零。它也在原横轴上。",
  },
  {
    id: "206-06c",
    reveal: "原横坐标等于",
    page: "horizontalExample",
    step: 3,
    caption: "原横坐标等于 2 减去 s 乘零。乘零得到零，所以原横坐标仍是 2。",
  },
  {
    id: "206-06d",
    reveal: "两套坐标",
    page: "horizontalExample",
    step: 4,
    caption: "两套坐标都读成 (2,0)。这个点的位置和刻度都没有变。",
  },
  {
    id: "206-07",
    reveal: "新纵坐标为零",
    page: "horizontal",
    step: 1,
    caption:
      "把刚才的 2 换成任意横坐标。新横轴上的点，新纵坐标为零。因此原纵坐标也为零。",
  },
  {
    id: "206-08",
    reveal: "原横坐标等于",
    page: "horizontal",
    step: 2,
    caption: "把新纵坐标零代入，原横坐标等于新横坐标，减去 s 乘零。",
  },
  {
    id: "206-09",
    reveal: "原横坐标等于",
    page: "horizontal",
    step: 3,
    caption: "任何数乘零都是零，所以原横坐标等于新横坐标。",
  },
  {
    id: "206-10",
    reveal: "全都不变",
    page: "horizontal",
    step: 4,
    caption: "这对任意横坐标都成立。新横轴的位置、方向和刻度，全都不变。",
  },
  {
    id: "206-11",
    reveal: "新纵坐标是二",
    page: "vertical",
    step: 1,
    caption:
      "取系数二分之一。选中新纵轴刻度 2 的点，它的新纵坐标是 2。先只看这个读数。",
  },
  {
    id: "206-11a",
    reveal: "所以新横坐标是零",
    page: "vertical",
    step: 2,
    caption: "沿新纵轴的方向回到横轴，落点是原点。所以新横坐标是零。",
    motion: { start: "沿新纵轴", end: "原点" },
  },
  {
    id: "206-12",
    reveal: "原纵坐标也为二",
    page: "vertical",
    step: 3,
    caption: "新纵坐标是 2，所以原纵坐标也为 2。水平辅助线标出了这个高度。",
    motion: { start: "水平辅助线", end: "高度" },
  },
  {
    id: "206-13",
    reveal: "代入逆变换",
    page: "vertical",
    step: 4,
    caption: "把新横坐标零、新纵坐标 2 和系数二分之一，代入逆变换。",
  },
  {
    id: "206-14",
    reveal: "原横坐标就是负一",
    page: "vertical",
    step: 5,
    caption: "先乘得到 1，再从零减去 1，原横坐标就是负 1。",
    motion: { start: "再从零", end: "负一" },
  },
  {
    id: "206-15",
    reveal: "到达这个固定点",
    page: "vertical",
    step: 6,
    caption: "从原点向左走 1，再向上走 2，正好到达这个固定点。",
    motion: { start: "向左", end: "固定点" },
  },
  {
    id: "206-16",
    reveal: "所以、x、等于",
    page: "oblique",
    step: 1,
    caption: "更一般地，新纵轴上的点满足新横坐标为零，所以 x 等于负 s 乘 y′。",
  },
  {
    id: "206-17",
    reveal: "原横坐标为负",
    page: "oblique",
    step: 2,
    caption: "当系数和新纵坐标都为正数时，原横坐标为负，点在原纵轴左侧。",
  },
  {
    id: "206-18",
    reveal: "纵轴朝左上方",
    page: "oblique",
    step: 3,
    caption: "因此新纵轴朝左上方倾斜，横轴却没有变。这不是整体旋转。",
  },
  {
    id: "206-19",
    reveal: "不代表",
    page: "oblique",
    step: 4,
    caption: "刻度 2 代表新纵坐标。它不代表从原点沿斜轴量出的长度为 2。",
  },
  {
    id: "207-01",
    page: "question2",
    step: 3,
    caption:
      "P 相对原点一直不动。原横坐标是 2，原纵坐标是 2。新横坐标是 3，新纵坐标是 2。这是哪种操作？",
    pauseAfter: 4,
  },
  {
    id: "207-02",
    page: "compareMove",
    step: 4,
    caption: "先对照点移动：坐标轴不变，从 P 向右移动 1，画出新点 P′。",
    motion: { start: "向右", end: "新点" },
  },
  {
    id: "207-03",
    page: "compareRead",
    step: 4,
    caption:
      "再对照换坐标系：P 留在原位，沿新轴方向读出新横坐标 3，新纵坐标 2。",
    motion: { start: "沿新轴", end: "纵坐标二" },
  },
  {
    id: "207-04",
    page: "compareRead",
    step: 4,
    caption: "题目说 P 始终不动，所以改变的是读取坐标的方式。",
  },
  {
    id: "207-05",
    page: "ending",
    step: 3,
    caption:
      "左右都从原坐标 (2,2) 出发。左边固定坐标轴，画出新点。右边固定 P，更换读数所用的轴。",
  },
  {
    id: "207-05a",
    page: "ending",
    step: 3,
    caption:
      "同样算出 (3,2)。左边表示新点的位置，右边表示原来这个点的新读数。先问固定的是坐标轴，还是几何点。",
  },
  {
    id: "207-06",
    page: "ending",
    step: 4,
    caption: "最后留下一个问题：剪切系数能随便选吗？我们下一集继续。",
  },
];
