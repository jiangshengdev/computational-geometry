import type { Page, Shot } from "./storyboard.ts";

// This episode's teaching content; page rendering and timing remain shared.
export const continuationPages: Record<string, Page> = {
  opening: {
    title: "图形推斜了，交点会变吗？",
    basis: [],
    holdAfterSeconds: 3,
    groups: [{ count: 2, align: "left" }],
    lines: [
      { text: "位置可以改变，公共部分怎样对应？" },
      { text: "先推导分点公式，再证明不丢、不添" },
    ],
  },
  whole: {
    title: "同一个比例，覆盖整条新线段",
    basis: [
      { from: "242-33", math: "A'=(a_x+sa_y,a_y)" },
      { from: "242-34", math: "B'=(b_x+sb_y,b_y)" },
      { from: "242-32", math: "x'=(1-u)(a_x+sa_y)+u(b_x+sb_y)" },
      { from: "242-29", math: "y'=(1-u)a_y+ub_y,\\quad 0\\le u\\le1" },
    ],
    holdAfterSeconds: 5,
    groups: [{ count: 3, align: "left" }],
    lines: [
      { text: "回顾：新点仍按同一个 u 组合新端点" },
      { text: "原线段任意一点，变到新线段上" },
      { text: "新线段任意一点，都有原线段上的来源" },
    ],
  },
  inverse: {
    title: "从剪切公式，逐步求出撤销公式",
    basis: [{ from: "242-26", math: "x'=x+sy,\\quad y'=y" }],
    holdAfterSeconds: 5,
    groups: [{ count: 4, align: "left" }],
    lines: [
      { math: "y=y'" },
      { math: "x'=x+sy'" },
      { math: "x'-sy'=x" },
      { math: "x=x'-sy',\\quad y=y'" },
    ],
  },
  unique: {
    title: "每个新位置，只有一个原位置",
    basis: [
      { from: "242-26", math: "x'=x+sy,\\quad y'=y" },
      { from: "243-07", math: "x=x'-sy',\\quad y=y'" },
    ],
    holdAfterSeconds: 5,
    groups: [{ count: 3, align: "left" }],
    lines: [
      { math: "x'-sy'=(x+sy)-sy=x" },
      { text: "固定 s 和新坐标，原坐标唯一确定" },
      { text: "不同原来的点，不会被挤成同一个新点" },
    ],
  },
  noLoss: {
    title: "第一方向：原公共点不会丢失",
    proofDiagram: "cross",
    basis: [
      {
        from: "243-02",
        math: "\\text{原线段全部点}\\longrightarrow\\text{新线段全部点}",
      },
    ],
    holdAfterSeconds: 5,
    groups: [{ count: 3, align: "left" }],
    lines: [
      { text: "两条线段 AB、CD，共用点 P" },
      { text: "同步剪切：P′ 同时落在两条新线段上" },
      { text: "每个原公共点，都得到一个新公共点" },
    ],
  },
  noGain: {
    title: "第二方向：新公共点不是凭空出现",
    basis: [
      {
        from: "243-03",
        math: "AB\\longleftrightarrow A'B',\\quad CD\\longleftrightarrow C'D'",
      },
      { from: "243-07", math: "x=x'-sy',\\quad y=y'" },
    ],
    holdAfterSeconds: 5,
    groups: [{ count: 4, align: "left" }],
    lines: [
      { text: "任选新公共点 Q′，新坐标记作 x′、y′" },
      { text: "从第一条原线段找来源，记作 R" },
      { text: "从第二条原线段找来源，记作 S" },
      { math: "R=(x'-sy',y')=S" },
    ],
  },
  overlap: {
    title: "重叠时，保持的是完整区间",
    proofDiagram: "overlap",
    basis: [{ from: "243-07", math: "x=x'-sy',\\quad y=y'" }],
    holdAfterSeconds: 5,
    groups: [{ count: 4, align: "left" }],
    lines: [
      { text: "输入 AB 与 CD 的公共部分是整段 CB" },
      { math: "s=\\tfrac12:\\quad CB\\longrightarrow C'B'" },
      { math: "x=x'-\\tfrac12y',\\quad y=y'" },
      { text: "完整交集对应，两个输入身份都保留" },
    ],
  },
  coordinates: {
    title: "交集保持，不是坐标原地不动",
    basis: [{ from: "242-26", math: "x'=x+sy,\\quad y'=y" }],
    holdAfterSeconds: 5,
    groups: [{ count: 3, align: "left" }],
    lines: [
      { math: "P=(3,2),\\quad s=\\tfrac12" },
      { math: "P'=(3+\\tfrac12\\cdot2,2)=(4,2)" },
      { text: "示意系数用于观察，不保证事件保序" },
    ],
  },
  pointInput: {
    title: "两个端点重合时，输入仍是一个点",
    basis: [
      { from: "242-17", math: "x=(1-u)a_x+ub_x" },
      { from: "242-20", math: "y=(1-u)a_y+ub_y,\\quad 0\\le u\\le1" },
    ],
    holdAfterSeconds: 5,
    groups: [{ count: 3, align: "left" }],
    lines: [
      { math: "A=B:\\quad a_x=b_x,\\quad a_y=b_y" },
      { math: "x=a_x,\\quad y=a_y\\quad(0\\le u\\le1)" },
      { text: "所有 u 对应同一点，不指定唯一支撑直线" },
    ],
  },
  pointImage: {
    title: "点输入也能唯一还原",
    basis: [
      { from: "244-02", math: "A=B:\\quad (x,y)=(a_x,a_y)" },
      { from: "242-26", math: "x'=x+sy,\\quad y'=y" },
      { from: "243-07", math: "x=x'-sy',\\quad y=y'" },
    ],
    holdAfterSeconds: 5,
    groups: [{ count: 2, align: "left" }],
    lines: [
      { math: "A'=B'=(a_x+sa_y,a_y)" },
      { text: "点与线段、点与点，仍按公共点双向对应" },
    ],
  },
  wholeLine: {
    title: "让比例超出零到一，走到延长线上",
    basis: [
      { from: "242-17", math: "x=a_x+u(b_x-a_x)" },
      { from: "242-20", math: "y=a_y+u(b_y-a_y)" },
    ],
    holdAfterSeconds: 5,
    groups: [{ count: 4, align: "left" }],
    lines: [
      { text: "先设 A≠B；u 是带方向的比例参数" },
      { text: "u 小于零：从 A 反向走" },
      { text: "u 大于一：越过 B 继续走" },
      { text: "u 取任意实数，恰好覆盖整条直线" },
    ],
  },
  collinear: {
    title: "同一条直线上的点，变换后仍共线",
    basis: [
      { from: "243-01", math: "x'=(1-u)(a_x+sa_y)+u(b_x+sb_y)" },
      { from: "243-01", math: "y'=(1-u)a_y+ub_y" },
      { from: "244-09", math: "\\text{任意实数 }u,\\quad A\\ne B" },
      { from: "243-10", math: "A\\ne B \\Longrightarrow A'\\ne B'" },
    ],
    holdAfterSeconds: 5,
    groups: [{ count: 2, align: "left" }],
    lines: [
      { text: "代入、展开不限制 u 的大小" },
      { text: "整条直线对应整条新直线，共线关系保持" },
    ],
  },
  parallel: {
    title: "两条不同的平行线，会不会新增交点？",
    basis: [
      {
        from: "244-11",
        math: "\\text{直线上的全部点}\\longleftrightarrow\\text{新直线上的全部点}",
      },
      { from: "243-07", math: "x=x'-sy',\\quad y=y'" },
    ],
    holdAfterSeconds: 5,
    groups: [{ count: 3, align: "left" }],
    lines: [
      { text: "假设两条新直线有公共点" },
      { text: "唯一还原后，它同时属于两条原直线" },
      { text: "与原直线平行矛盾：新直线仍不同且平行" },
    ],
  },
  exact: {
    title: "精确分数计算，与几何可逆性分开看",
    basis: [],
    holdAfterSeconds: 5,
    groups: [{ count: 3, align: "left" }],
    lines: [
      { math: "\\tfrac13+\\tfrac16=\\tfrac26+\\tfrac16=\\tfrac36=\\tfrac12" },
      { math: "0.333+0.167=0.500,\\quad 0.333\\ne\\tfrac13" },
      { text: "保留分子和分母，不先截成有限位小数" },
    ],
  },
  roles: {
    title: "三件事，各自解决不同问题",
    basis: [
      { from: "243-07", math: "x=x'-sy',\\quad y=y'" },
      { from: "244-15", math: "\\tfrac13+\\tfrac16=\\tfrac12" },
    ],
    holdAfterSeconds: 3,
    groups: [{ count: 3, align: "left" }],
    lines: [
      { text: "可逆性：唯一还原，不靠系数足够小" },
      { text: "有理数精确运算：避免浮点舍入" },
      { text: "算法安全小系数：额外保证事件顺序" },
    ],
  },
  conclusion: {
    title: "从整条线段对应，到完整交集对应",
    basis: [],
    holdAfterSeconds: 5,
    groups: [{ count: 4, align: "left" }],
    lines: [
      { text: "分点公式与剪切代入，覆盖全部点" },
      { text: "原公共点不丢，新公共点有唯一来源" },
      { text: "点和完整重叠区间保持对应，输入身份保留" },
      { text: "共线、平行仍成立；精确计算与保序各有职责" },
    ],
  },
};

export const openingShots: Shot[] = [
  {
    id: "245-01",
    page: "opening",
    step: 1,
    caption:
      "把图形推斜以后，交点的位置可以改变。我们要证明的是，原来的公共部分与新的公共部分怎样对应。",
  },
  {
    id: "245-02",
    page: "opening",
    step: 2,
    caption:
      "先从具体位置推导分点公式，再把它代入剪切公式。证明整条线段的对应以后，分别说明为什么不丢交点，也不添交点。",
  },
];
export const proofShots: Shot[] = [
  {
    id: "243-01",
    page: "whole",
    step: 1,
    caption:
      "回顾上方已经推导的结果，A′ 和 B′ 是两个新端点。新点的横纵坐标，仍按同一个 u 组合这两个端点。",
  },
  {
    id: "243-02",
    page: "whole",
    step: 2,
    caption:
      "任取原线段上的一点，它都有零到一之间的比例 u。剪切后仍使用这个比例，所以它一定落在两个新端点之间，包括端点。",
  },
  {
    id: "243-03",
    page: "whole",
    step: 3,
    caption:
      "反过来，任取新线段上的一点。用它在新线段上的比例 u，去原线段取点，代入就得到这个新点。因此既没有跑到新线段之外，也没有漏掉新线段上的点，不只是几个采样位置。",
  },
  {
    id: "243-04",
    page: "inverse",
    step: 1,
    caption:
      "接着从剪切公式求原坐标，因为纵坐标不变，所以原纵坐标 y 就等于新纵坐标 y′。",
  },
  {
    id: "243-05",
    page: "inverse",
    step: 2,
    caption:
      "把原公式中的 y 换成 y′，新横坐标就等于原横坐标，加上 s 乘以新纵坐标。",
  },
  {
    id: "243-06",
    page: "inverse",
    step: 3,
    caption:
      "等式两边同时减去 s 与 y′ 的乘积，右边只剩下 x。左边是 x′ 减去这个乘积。",
  },
  {
    id: "243-07",
    page: "inverse",
    step: 4,
    caption:
      "把原横坐标写在左边，就得到撤销公式。原横坐标等于新横坐标，减去 s 乘以新纵坐标，原纵坐标仍等于新纵坐标。",
  },
  {
    id: "243-08",
    page: "unique",
    step: 1,
    caption:
      "再代回原来的剪切公式核对，新增的 s 乘以 y，与减去的同一个乘积抵消。横坐标确实恢复成 x，纵坐标本来就没有变化。",
  },
  {
    id: "243-09",
    page: "unique",
    step: 2,
    caption:
      "系数 s 固定以后，给定一个新位置的横纵坐标。撤销公式只能算出一组原坐标，所以原位置唯一确定。",
  },
  {
    id: "243-10",
    page: "unique",
    step: 3,
    caption:
      "如果两个不同的原来的点变成同一个新点，撤销这个新点却只能得到一个原位置。这就矛盾了，所以不同点不会被挤在一起。",
  },
  {
    id: "243-11",
    page: "noLoss",
    step: 1,
    caption:
      "现在取两条线段，蓝色的是 AB，绿色的是 CD。它们的原公共点记作 P，两条线段都使用刚才证明的整条线段对应。",
  },
  {
    id: "243-12",
    page: "noLoss",
    step: 2,
    motion: { start: "现在同步剪切", end: "两条新线段上" },
    caption:
      "现在同步剪切两条线段和公共点，P 变成 P′。因为原来同时属于两条线段，变换后就同时落在两条新线段上。",
  },
  {
    id: "243-13",
    page: "noLoss",
    step: 3,
    caption:
      "对每个原公共点都能这样说明，所以已有的公共点不会丢失。这里只证明了一个方向，接下来还要排除新增公共点。",
  },
  {
    id: "243-14",
    page: "noGain",
    step: 1,
    caption:
      "任取两条新线段的一个公共点，记作 Q′，它的新坐标记作 x′ 和 y′。这次从新图形出发，不能先假定它已经有共同的原来的点。",
  },
  {
    id: "243-15",
    page: "noGain",
    step: 2,
    caption:
      "由于整条新线段都有原线段上的来源，从第一条新线段反向找。必能在第一条原线段上找到一个点，记作 R，它剪切后就是 Q′。",
  },
  {
    id: "243-16",
    page: "noGain",
    step: 3,
    caption:
      "同样，从第二条新线段反向找，能在第二条原线段上找到一个点，记作 S。它剪切后也等于 Q′。",
  },
  {
    id: "243-17",
    page: "noGain",
    step: 4,
    caption:
      "对同一个 Q′ 使用撤销公式，R 和 S 的坐标都只能是 x′ 减 s 与 y′ 的乘积，以及 y′。所以它们是同一个原来的点，同时属于两条原线段。原来已经有这个公共点，不会凭空新增。",
  },
  {
    id: "243-18",
    page: "overlap",
    step: 1,
    caption:
      "再看重叠的情况，蓝色输入的两端是 A 和 B，绿色输入的两端是 C 和 D。沿直线，从 A 开始，接着是 C，然后是 B，最后是 D。公共部分是从 C 到 B 的完整线段，图中用橙色标出。",
  },
  {
    id: "243-19",
    page: "overlap",
    step: 2,
    motion: { start: "同步剪切", end: "一起移动" },
    caption:
      "取二分之一作为演示系数，同步剪切两条输入。重叠段上的所有点也一起移动，得到从 C′ 到 B′ 的整条线段，不是只保留两个端点。",
  },
  {
    id: "243-20",
    page: "overlap",
    step: 3,
    motion: { start: "现在按撤销公式", end: "完整重叠段" },
    caption:
      "现在按撤销公式，把新横坐标减去新纵坐标的一半。两条输入和公共部分同步还原，就恢复原来的完整重叠段。双向证明还保证，这段之外不会凭空多出公共点。",
  },
  {
    id: "243-21",
    page: "overlap",
    step: 4,
    caption:
      "因此重叠区间整体对应，不能把它拆成若干孤立交点。AB 和 CD 仍然是两条有各自身份的输入，即使位置重合，也不合并输入记录。",
  },
  {
    id: "243-22",
    page: "coordinates",
    step: 1,
    caption:
      "保持交集，并不表示坐标原地不动。例如取原公共点 P 的坐标为三、二，演示系数仍取二分之一。",
  },
  {
    id: "243-23",
    page: "coordinates",
    step: 2,
    caption:
      "新横坐标等于三，加上二分之一乘以二，得到四。纵坐标仍为二，所以 P′ 的坐标是四、二，公共点的位置已经改变。",
  },
  {
    id: "243-24",
    page: "coordinates",
    step: 3,
    caption:
      "这里的二分之一只是便于观察的演示系数，不是算法已经选好的安全系数。系数不必很小，也能保持交集对应，事件顺序是否保持是另一个问题。",
  },
];
export const specialShots: Shot[] = [
  {
    id: "244-01",
    page: "pointInput",
    step: 1,
    caption:
      "接着检查特殊情况，先回顾上方的两个分点公式。如果两个端点 A 和 B 重合，它们的横坐标相等，纵坐标也相等。",
  },
  {
    id: "244-02",
    page: "pointInput",
    step: 2,
    caption:
      "把相等的坐标代入，一减去 u，再加上 u，等于一。所以不论 u 取零到一之间的哪个值，横纵坐标始终都是 A 的坐标。",
  },
  {
    id: "244-03",
    page: "pointInput",
    step: 3,
    caption:
      "这时所有比例都对应同一个点，输入的长度为零。通过一个点可以画出许多直线，不能给这个输入指定唯一的支撑直线。",
  },
  {
    id: "244-04",
    page: "pointImage",
    step: 1,
    caption:
      "对这个点应用剪切公式，新横坐标是 a_x 加 s 乘以 a_y，新纵坐标是 a_y。两个新端点仍然重合，剪切以后仍是一个点。",
  },
  {
    id: "244-05",
    page: "pointImage",
    step: 2,
    caption:
      "上方的撤销公式仍然有效，所以点与线段、点与点之间的公共点，也能按同样两个方向证明，既不丢失，也不新增。",
  },
  {
    id: "244-06",
    page: "wholeLine",
    step: 1,
    caption:
      "下面讨论直线，先要求 A 和 B 不同。把 u 扩展为带方向的比例参数，不再把它限制为零到一之间的长度比。",
  },
  {
    id: "244-07",
    page: "wholeLine",
    step: 2,
    caption:
      "当 u 小于零时，横向和纵向的全程变化都乘以负数。因此从 A 出发，沿着原来的直线反向走。",
  },
  {
    id: "244-08",
    page: "wholeLine",
    step: 3,
    caption:
      "当 u 大于一时，两个方向都走过完整变化量。点越过 B，继续沿直线向前。",
  },
  {
    id: "244-09",
    page: "wholeLine",
    step: 4,
    caption:
      "任意实数都可以作为 u，而直线上任意位置都有相应的带方向比例。因此这两个公式恰好描述整条直线，包括原线段两端的延长部分。",
  },
  {
    id: "244-10",
    page: "collinear",
    step: 1,
    caption:
      "前面代入剪切、展开并合并的每一步，对任意实数 u 都成立。并没有用到 u 必须介于零和一之间，所以整理后的公式仍然有效。",
  },
  {
    id: "244-11",
    page: "collinear",
    step: 2,
    caption:
      "不同端点不会被挤在一起，因此两个新端点仍能确定直线。让 u 取遍实数，恰好得到整条新直线，所以同一直线上的点变换后仍然共线。",
  },
  {
    id: "244-12",
    page: "parallel",
    step: 1,
    caption:
      "现在取两条不同的平行线，假设它们剪切后的新直线有公共点。这里也包括两条新直线重合的可能，因为重合就一定有公共点。",
  },
  {
    id: "244-13",
    page: "parallel",
    step: 2,
    caption:
      "沿两条新直线分别找原来的来源，再用撤销公式。公共点只能还原到一个原位置，这个位置就必须同时属于两条原直线。",
  },
  {
    id: "244-14",
    page: "parallel",
    step: 3,
    caption:
      "可是原来两条不同的平行线没有公共点，出现了矛盾。所以两条新直线不相交，也不重合，仍是两条不同的平行线。",
  },
  {
    id: "244-15",
    page: "exact",
    step: 1,
    caption:
      "最后区分精确计算与几何结论，例如三分之一加六分之一。先通分，把三分之一写成六分之二，相加得到六分之三，约分就是二分之一。",
  },
  {
    id: "244-16",
    page: "exact",
    step: 2,
    caption:
      "如果先用零点三三三和零点一六七近似，这两个近似值相加，这次恰巧得到零点五。但零点三三三本身并不等于三分之一，中间的精确值已经丢失，其他运算未必恰巧抵消误差。",
  },
  {
    id: "244-17",
    page: "exact",
    step: 3,
    caption:
      "精确有理数运算保留分子和分母，直接做分数加法和乘法，不先截成有限位小数。因此有理坐标和有理系数下，剪切与撤销都可以保持精确。",
  },
  {
    id: "244-18",
    page: "roles",
    step: 1,
    caption:
      "可逆性保证每个位置唯一还原，对任意有理系数都成立。不需要系数足够小，再结合线段的完整对应，才得到交集保持。",
  },
  {
    id: "244-19",
    page: "roles",
    step: 2,
    caption:
      "精确有理数运算负责避免浮点舍入，这是计算方式的作用。不能把精确性归功于系数很小。",
  },
  {
    id: "244-20",
    page: "roles",
    step: 3,
    caption:
      "算法另外选择安全的小系数，是为了保证事件顺序。这个条件在前面几集讨论过，本集的交集证明没有使用它。",
  },
];
export const closingShots: Shot[] = [
  {
    id: "245-03",
    page: "conclusion",
    step: 1,
    caption:
      "回顾完整证明，先用相似三角形推导分点公式，再代入剪切。比例取遍需要的范围，就覆盖全部点，而不只是少数样本。",
  },
  {
    id: "245-04",
    page: "conclusion",
    step: 2,
    caption:
      "原公共点变换后仍是公共点，新公共点又能唯一还原为原公共点。两个方向合起来，才说明不丢交点，也不添交点。",
  },
  {
    id: "245-05",
    page: "conclusion",
    step: 3,
    caption:
      "交集可以是一个点，也可以是完整的重叠区间。它们都按变换对应，坐标可以改变，原始输入的身份始终保留。",
  },
  {
    id: "245-06",
    page: "conclusion",
    step: 4,
    caption:
      "点输入、共线和平行情况也已说明，可逆性保证唯一还原，精确分数运算避免舍入。小系数另外负责保序，这三件事各有自己的职责。",
  },
];
