/** Chapter 2 upper episode: subtitle-first teaching source (CNB #298/#299).
 * Each page accumulates its lines; state records persist throughout the scan.
 * `state` identifies the illustrated teaching snapshot, not an execution trace.
 */
export const pages = {
  opening: {
    title: "扫描过程与三类事件",
    holdAfterSeconds: 1,
    lines: [
      "求交结果仍按原始无序输入对记录",
      "只检查当前邻居，会漏掉后来相交的一对吗？",
    ],
  },
  conditions: {
    title: "先限定本章讨论的情形",
    holdAfterSeconds: 2,
    lines: [
      "每条线段有长度，而且不竖直",
      "没有重叠、端点接触或三条线段共点",
      "所有端点和交点的横坐标互不相同",
      "教学简化条件，不是完整算法的输入限制",
    ],
  },
  inputs: {
    title: "四份输入，保留四个身份",
    holdAfterSeconds: 2,
    lines: [
      "A：(0,1) 到 (10,1)",
      "B：(1,3) 到 (3,3)",
      "C：(2,6) 到 (9,-1)",
      "D：(4,0) 到 (8,4)",
    ],
  },
  records: {
    title: "扫描时保留三份记录",
    holdAfterSeconds: 2,
    lines: [
      "活动顺序：从下到上",
      "邻居：顺序中直接相邻的两条线段",
      "待处理清单：按横坐标从小到大",
      "已报告结果：到达交点才记录输入对",
    ],
  },
  sides: {
    title: "事件前后，分别看左右两侧",
    holdAfterSeconds: 2,
    lines: [
      "处理前：紧靠事件左侧的顺序",
      "处理后：紧靠事件右侧的顺序",
      "交点处等高，不代表左右两侧没有顺序",
    ],
  },
  startA: {
    title: "开始事件：先把线段放入顺序",
    holdAfterSeconds: 1,
    lines: [
      "x=0：A 开始，没有邻居",
      "x=1：B 开始，新检查 A 与 B",
      "A 与 B 不相交，清单不增加交叉",
    ],
  },
  startC: {
    title: "延长线相交，不等于线段相交",
    holdAfterSeconds: 2,
    lines: [
      "x=2：C 开始，顺序 A,B,C",
      "新检查 B 与 C：直线交点 (5,3)",
      "B 在 x=3 结束，候选不在 B 上",
      "开始：只检查新线段的上下邻居",
    ],
  },
  endB: {
    title: "中间线段结束，产生新邻居",
    holdAfterSeconds: 2,
    lines: [
      "x=3：移去 B，A 与 C 成为邻居",
      "检查 A 与 C，得到 P=(7,1)",
      "P 在两段范围内，并且 7>3",
      "登记 P，先处理 x=4；尚不报告",
    ],
  },
  endRule: {
    title: "结束为什么只检查这一对",
    holdAfterSeconds: 2,
    lines: [
      "其他线段在这里没有开始、结束或交叉",
      "只连接原先被移走线段隔开的两侧",
      "缺少任意一侧，就没有新的邻接对",
    ],
  },
  startD: {
    title: "后发现的交点，可能先到达",
    holdAfterSeconds: 2,
    lines: [
      "x=4：D 开始，顺序 D,A,C",
      "新检查 D 与 A，得到 Q=(5,1)",
      "Q 在两段范围内，并且 5>4",
      "清单按位置排序：Q 在 P 前面",
    ],
  },
  crossQ: {
    title: "到达 Q，才报告并换序",
    holdAfterSeconds: 2,
    lines: [
      "x=5：报告 A 与 D 的交点 Q=(5,1)",
      "处理前 D,A,C；处理后 A,D,C",
      "新检查 D 与 C，得到 R=(6,2)",
      "R 在范围内，且 6>5：登记 R",
    ],
  },
  preserve: {
    title: "暂时失去邻接，清单怎样处理？",
    holdAfterSeconds: 2,
    lines: [
      "A 与 C 之间暂时隔着 D",
      "已经登记的 P 仍然保留",
      "接下来按位置处理 R，再处理 P",
    ],
  },
  crossRule: {
    title: "交叉只改变交换块的外侧邻接",
    holdAfterSeconds: 2,
    lines: [
      "交叉的两条线段交换上下位置",
      "两条线段互相仍是邻居",
      "其他线段顺序不变，只检查新的外侧邻居",
      "两条不同直线至多相交一次",
    ],
  },
  crossR: {
    title: "再次发现，不重复登记",
    holdAfterSeconds: 2,
    lines: [
      "x=6：报告 C 与 D 的交点 R=(6,2)",
      "处理前 A,D,C；处理后 A,C,D",
      "新检查 A 与 C，仍得到 P=(7,1)",
      "P 已在清单中，只保留一份",
    ],
  },
  crossP: {
    title: "过去的交点，不再作为未来事件",
    holdAfterSeconds: 2,
    lines: [
      "x=7：报告 A 与 C 的交点 P=(7,1)",
      "处理前 A,C,D；处理后 C,A,D",
      "新检查 A 与 D，得到 Q=(5,1)",
      "5<7：Q 已在左侧，不再入队",
    ],
  },
  finish: {
    title: "直到活动顺序与清单都为空",
    holdAfterSeconds: 2,
    lines: [
      "x=8：D 结束，留下 C,A",
      "x=9：C 结束，只剩 A",
      "x=10：A 结束，扫描状态清空",
      "结果保留：A 与 D、C 与 D、A 与 C",
    ],
  },
  closing: {
    title: "从完整案例走向一般证明",
    holdAfterSeconds: 2,
    lines: [
      "开始、结束、交叉都可能带来新邻居",
      "发现时登记，到达时报告",
      "案例不是一般证明：下一集解释为什么不会漏",
    ],
  },
};
export type PageId = keyof typeof pages;
export type Shot = {
  id: string;
  page: PageId;
  step: number;
  state: string;
  caption: string;
  action: string;
  introduces?: string;
  pauseAfter?: number;
};
export const shots: Shot[] = [
  {
    id: "S01",
    page: "opening",
    step: 1,
    state: "blank",
    caption:
      "上一章用逐对检查建立了基准：求交结果按原始无序输入对记录。这一章改变检查方法，结果的含义不变。",
    action: "保留输出契约",
  },
  {
    id: "S02",
    page: "opening",
    step: 2,
    state: "blank",
    caption:
      "如果只检查当前上下紧挨着的线段，会不会漏掉原本隔得很远、后来才相交的一对线段？先带着这个问题看完整过程。",
    action: "提出问题，不揭示证明",
    pauseAfter: 5,
  },
  {
    id: "S03",
    page: "conditions",
    step: 1,
    state: "blank",
    caption:
      "先说清本章的简化条件。每条线段都有长度，而且不竖直，水平线段仍然允许。",
    action: "逐行介绍条件",
  },
  {
    id: "S04",
    page: "conditions",
    step: 2,
    state: "blank",
    caption:
      "没有两条线段重叠，没有端点落在另一条线段上，也没有三条或更多线段经过同一个点。",
    action: "保留上一行",
  },
  {
    id: "S05",
    page: "conditions",
    step: 3,
    state: "blank",
    caption:
      "所有端点和交点的横坐标互不相同。因此每次只处理一条线段开始、结束，或者两条线段交叉。",
    action: "说明每次事件的范围",
  },
  {
    id: "S06",
    page: "conditions",
    step: 4,
    state: "blank",
    caption:
      "这些只是为了先看清机制的教学条件，不是完整算法拒绝复杂输入的理由。这里每个非空交集都是一个点，仍按原始输入对记录。",
    action: "澄清适用边界",
  },
  {
    id: "S07",
    page: "inputs",
    step: 1,
    state: "inputA",
    caption:
      "给四份输入分别保留身份，线段都包含两端。先看 A 的两个端点，从 (0,1) 到 (10,1)。横轴与纵轴每格都是一个单位，O 表示原点。",
    action: "显示 A、端点与等比例坐标轴",
    introduces: "身份、闭线段、坐标轴",
  },
  {
    id: "S08",
    page: "inputs",
    step: 2,
    state: "inputB",
    caption: "B 从 (1,3) 到 (3,3)，是一条较短的水平线段。A 和 B 的身份不同。",
    action: "先提示 B 左端、右端，再描亮整段",
    introduces: "B",
  },
  {
    id: "S09",
    page: "inputs",
    step: 3,
    state: "inputC",
    caption:
      "C 从 (2,6) 到 (9,-1)，向右下方延伸。注意它只包含两个端点之间的部分。",
    action: "提示 C 两端及整段",
    introduces: "C",
  },
  {
    id: "S10",
    page: "inputs",
    step: 4,
    state: "inputD",
    caption:
      "输入 D 的左端点是 (4,0)，右端点是 (8,4)，线段向右上方延伸。现在只显示完整输入，图上看见的交叉还不是已经算出的结果，所以暂时不标交点。",
    action: "显示 D，禁止 P/Q/R 标记",
    introduces: "D",
  },
  {
    id: "S11",
    page: "records",
    step: 1,
    state: "activeIntro",
    caption:
      "让一条竖直辅助线从左向右移动，这就是扫描线。与它相交的输入叫活动线段，按相交位置从下到上排列。第一份记录保存这个活动顺序。",
    action: "介绍扫描线与活动顺序区",
    introduces: "扫描线、活动线段、活动顺序",
  },
  {
    id: "S12",
    page: "records",
    step: 2,
    state: "neighborIntro",
    caption:
      "在这份顺序里，直接相邻的两条线段叫邻居。例如，最下面是 A 这条线段，中间是 B 这条线段，最上面是 C 这条线段。A 与 B 是一对邻居，B 与 C 是另一对邻居。A 与 C 之间还隔着 B 这条线段，所以不是邻居。这里先用一个位置说明顺序，正式扫描马上从最左端开始。",
    action: "x=2.5 的定义示意，依次提示两对邻居",
    introduces: "邻居",
  },
  {
    id: "S13",
    page: "records",
    step: 3,
    state: "queueIntro",
    caption:
      "开始、结束和交叉叫扫描事件。第二份记录是待处理清单，按横坐标从小到大排序。所有端点一开始就已知，先把八个端点放进去；目前没有交叉事件。",
    action: "扫描线回到起点左侧，介绍初始端点清单",
    introduces: "事件、清单",
  },
  {
    id: "S14",
    page: "records",
    step: 4,
    state: "resultIntro",
    caption:
      "第三份记录保存已报告结果。检查发现未来交点时，只登记到清单；扫描线真正到达那里时，才报告对应输入对的交集。三份记录介绍完后，一直保留供我们对照。",
    action: "介绍空结果区；三份记录此后同屏保留",
    introduces: "登记与报告",
  },
  {
    id: "S15",
    page: "sides",
    step: 1,
    state: "initial",
    caption:
      "到达事件时，处理前的活动顺序，取紧靠事件左侧的顺序。紧靠是指还没有跨过别的事件。",
    action: "说明左侧次序",
  },
  {
    id: "S16",
    page: "sides",
    step: 2,
    state: "initial",
    caption:
      "处理后的顺序，取紧靠事件右侧的顺序。我们会把前后两份顺序并排写清楚。",
    action: "说明右侧次序",
  },
  {
    id: "S17",
    page: "sides",
    step: 3,
    state: "initial",
    caption:
      "两条线段在交点处高度相等，但左右两侧的高低顺序各自明确。不要用交点处的等高来替代前后顺序。",
    action: "保留前后定义",
  },
  {
    id: "S18",
    page: "startA",
    step: 1,
    state: "aStart",
    caption:
      "扫描到横坐标零，A 开始。把 A 放入活动顺序，清单移去这个端点；现在只有一条线段，没有邻居需要检查。",
    action: "取出 A 开始，插入 A",
  },
  {
    id: "S19",
    page: "startA",
    step: 2,
    state: "bStart",
    caption:
      "扫描线来到横坐标一的位置，B 从这里开始。B 在 A 上方，从下到上的顺序是 A 在下面，B 在上面。这时 A 与 B 成为一对新邻居，检查这一对。",
    action: "插入 B，提示 A/B",
  },
  {
    id: "S20",
    page: "startA",
    step: 3,
    state: "bStart",
    caption:
      "检查结果是没有交点：两条水平线段高度不同。清单没有增加交叉事件，结果记录也仍为空。",
    action: "展示不相交结果",
  },
  {
    id: "S21",
    page: "startC",
    step: 1,
    state: "cStart",
    caption:
      "扫描线来到横坐标为二的位置，线段 C 开始，它在 B 上方。现在最下面是 A 这条线段，中间是 B 这条线段，最上面是 C 这条线段，新出现的邻居是 B 与 C。",
    action: "插入 C",
  },
  {
    id: "S22",
    page: "startC",
    step: 2,
    state: "candidate",
    caption:
      "检查 B 与 C，两条直线相交于点 (5,3)。这里不展开求交运算，先看这个候选位置是否在两条线段上。",
    action: "延长 B 的虚线和候选点出现",
    introduces: "直线候选点",
  },
  {
    id: "S23",
    page: "startC",
    step: 3,
    state: "candidate",
    caption:
      "线段 B 在横坐标为三的位置结束，候选点的横坐标五超过三，不在 B 上。因此不登记这个位置。线段 A 和线段 C 之间还隔着 B，暂时不检查。",
    action: "提示 B 右端与候选，排除候选",
  },
  {
    id: "S24",
    page: "startC",
    step: 4,
    state: "cStart",
    caption:
      "开始事件把新线段放进正确位置，只检查它与上下邻居。其他线段在这里没有交叉，相对顺序不变，新增邻接只可能在新线段两侧。",
    action: "解释插入的局部理由",
  },
  {
    id: "S25",
    page: "endB",
    step: 1,
    state: "bEnd",
    caption:
      "扫描线来到横坐标为三的位置，B 在这里结束。移去中间的 B，原来隔开的 A 与 C 成为邻居，从下到上依次是线段 A 和线段 C。现在该检查这一对了。",
    action: "移去 B，连接 A/C",
  },
  {
    id: "S26",
    page: "endB",
    step: 2,
    state: "pFound",
    caption:
      "检查 A 与 C，得到交点 (7,1)，把它记作 P。空心圆表示已经发现、还没有到达的交点。",
    action: "首次标注 P 空心圆",
    introduces: "P、空心标记",
  },
  {
    id: "S27",
    page: "endB",
    step: 3,
    state: "pFound",
    caption:
      "P 在 A 的两端之间，也在 C 的两端之间，确实属于两条线段。横坐标七大于当前的三，是严格位于右侧的未来交点。",
    action: "依次提示范围与当前位置",
  },
  {
    id: "S28",
    page: "endB",
    step: 4,
    state: "pQueued",
    caption:
      "把 P 按横坐标七放入清单。接下来先处理横坐标四的端点，不能因为发现了 P 就立刻跳过去。此时还没有报告结果。",
    action: "登记 P；清单 4,7,8,9,10",
  },
  {
    id: "S29",
    page: "endRule",
    step: 1,
    state: "pQueued",
    caption:
      "结束事件为什么只检查这一对？这里没有其他线段开始、结束或交叉，其余线段的相对高低没有改变。",
    action: "解释结束的局部理由",
  },
  {
    id: "S30",
    page: "endRule",
    step: 2,
    state: "pQueued",
    caption:
      "只有原来被 B 隔开的上下两条，才会因为移去 B 而接到一起。所以只检查这两个新邻居。",
    action: "提示新邻接 A/C",
  },
  {
    id: "S31",
    page: "endRule",
    step: 3,
    state: "pQueued",
    caption:
      "如果被移走的线段缺少上侧或下侧邻居，就不会连接出一对新邻居，也不需要新增检查。",
    action: "说明边界情形",
  },
  {
    id: "S32",
    page: "startD",
    step: 1,
    state: "dStart",
    caption:
      "扫描线来到横坐标为四的位置，线段 D 从 (4,0) 开始，插在 A 下方。现在最下面是 D 这条线段，中间是 A 这条线段，最上面是 C 这条线段，D 下方没有线段，此时只有线段 D 和线段 A 成为新的邻居。",
    action: "插入 D，P 留在清单",
  },
  {
    id: "S33",
    page: "startD",
    step: 2,
    state: "qFound",
    caption: "检查 D 与 A，得到交点 (5,1)，记作 Q。先标空心圆，还不报告。",
    action: "首次标注 Q",
    introduces: "Q",
  },
  {
    id: "S34",
    page: "startD",
    step: 3,
    state: "qFound",
    caption:
      "Q 在 A 和 D 的范围内，横坐标五大于当前的四，是一个真实的未来交点。",
    action: "范围与未来判断",
  },
  {
    id: "S35",
    page: "startD",
    step: 4,
    state: "qQueued",
    caption:
      "把 Q 加入清单。虽然 P 先发现，但五小于七，所以 Q 排在 P 前面。下一次先到 Q，清单按位置排序，不按发现时间排序。",
    action: "清单变为 5,7,8,9,10",
  },
  {
    id: "S36",
    page: "crossQ",
    step: 1,
    state: "qArrive",
    caption:
      "扫描线来到横坐标为五的位置，扫描线到达 Q 点。现在才报告线段 A 与线段 D 的交集，交集是点 (5,1)。实心圆表示已经报告。",
    action: "Q 出队、填实；新增 A/D 结果",
    introduces: "实心标记",
  },
  {
    id: "S37",
    page: "crossQ",
    step: 2,
    state: "qSwap",
    caption:
      "在 Q 左侧，D 位于 A 下方；到右侧，D 升到 A 上方。因此交换后，A 位于 D 下方，C 仍在它们上方。",
    action: "依次提示交点两侧、交换 A/D",
  },
  {
    id: "S38",
    page: "crossQ",
    step: 3,
    state: "rFound",
    caption:
      "A 与 D 仍互相相邻，新的邻居是 D 与 C。检查得到交点 (6,2)，这个交点的名称是 R 点。",
    action: "新检查 C/D，首次标注 R",
    introduces: "R",
  },
  {
    id: "S39",
    page: "crossQ",
    step: 4,
    state: "rQueued",
    caption:
      "R 在 C 和 D 的范围内，横坐标六大于当前的五，把 R 登记到清单。结果区仍然只有已经到达的 Q。",
    action: "登记 R，结果不提前增加",
  },
  {
    id: "S40",
    page: "preserve",
    step: 1,
    state: "rQueued",
    caption:
      "此时 A 与 C 之间暂时隔着 D，它们不再是邻居。先想一想：先前登记的 P，要不要删掉？",
    action: "突出暂时失邻，不泄露答案",
    pauseAfter: 5,
  },
  {
    id: "S41",
    page: "preserve",
    step: 2,
    state: "rQueued",
    caption:
      "不删除。P 已经确认是两条线段的真实未来交点，暂时失去邻接不会改变这个事实，所以清单里继续保留 P。",
    action: "提示清单中的 P",
  },
  {
    id: "S42",
    page: "preserve",
    step: 3,
    state: "rQueued",
    caption:
      "清单接下来的交点是横坐标六的 R，再是横坐标七的 P。发现时登记，到达时报告。这是两个不同的阶段。",
    action: "提示清单次序",
  },
  {
    id: "S43",
    page: "crossRule",
    step: 1,
    state: "rQueued",
    caption:
      "总结交叉事件：交换两条交叉线段的上下位置。在 Q 处，交换的就是 A 与 D。",
    action: "回顾 Q 的换序块",
  },
  {
    id: "S44",
    page: "crossRule",
    step: 2,
    state: "rQueued",
    caption:
      "这两条线段互相仍是邻居，只是上下颠倒。需要寻找的是交换之后新出现的外侧邻接。",
    action: "区分内部邻接与外侧",
  },
  {
    id: "S45",
    page: "crossRule",
    step: 3,
    state: "rQueued",
    caption:
      "本章没有第三条线段经过这个交点，外面的线段顺序不变。所以只检查交换块两侧的新邻居；不存在的外侧邻居跳过。交叉前为什么必定相邻，下一集会证明。",
    action: "局部理由与一般证明分界",
  },
  {
    id: "S46",
    page: "crossRule",
    step: 4,
    state: "rQueued",
    caption:
      "两条不同直线至多有一个交点。刚交叉的这一对，不需要再寻找第二次交叉。",
    action: "解释不重新检查内部对",
  },
  {
    id: "S47",
    page: "crossR",
    step: 1,
    state: "rArrive",
    caption:
      "扫描线来到横坐标为六的位置，报告 C 与 D 这对输入，交集是点 (6,2)。交点 R 从清单移去，图中改成实心圆。",
    action: "报告 R",
  },
  {
    id: "S48",
    page: "crossR",
    step: 2,
    state: "rSwap",
    caption:
      "在 R 左侧，D 低于 C；在右侧，D 高于 C。因此交换后，C 位于 D 下方，A 仍在它们下方。",
    action: "交换 C/D",
  },
  {
    id: "S49",
    page: "crossR",
    step: 3,
    state: "rSwap",
    caption:
      "换序后新的邻居是 A 与 C。再次检查，得到的仍是 P，也就是点 (7,1)。新检查不一定是第一次检查这对输入。",
    action: "提示 A/C 与 P",
  },
  {
    id: "S50",
    page: "crossR",
    step: 4,
    state: "rSwap",
    caption:
      "P 已经在清单中，只保留一份，不再重复登记。现在还没有到 P，结果区也不能提前增加它。",
    action: "去重，P 仍空心",
  },
  {
    id: "S51",
    page: "crossP",
    step: 1,
    state: "pArrive",
    caption:
      "扫描线来到横坐标为七的位置，此时才报告线段 A 与线段 C 的交集，交集是点 (7,1)。交点 P 也变成实心圆。",
    action: "报告 P",
  },
  {
    id: "S52",
    page: "crossP",
    step: 2,
    state: "pSwap",
    caption:
      "在 P 左侧，C 在 A 上方；到右侧，C 降到 A 下方。因此交换后，C 位于 A 下方，D 仍在它们上方。",
    action: "交换 A/C",
  },
  {
    id: "S53",
    page: "crossP",
    step: 3,
    state: "pSwap",
    caption:
      "新的邻居是 A 与 D 这两条线段。这对邻居的交点是 Q，也就是点 (5,1)，但不能只看它是交点就再放进清单。",
    action: "提示新邻接 A/D 与过去 Q",
  },
  {
    id: "S54",
    page: "crossP",
    step: 4,
    state: "pSwap",
    caption:
      "五小于当前的七，Q 已经位于扫描线左侧，不是未来事件，所以不再入队，也不再报告一次。",
    action: "排除过去事件",
  },
  {
    id: "S55",
    page: "finish",
    step: 1,
    state: "dEnd",
    caption:
      "继续到横坐标八，D 在这里结束。D 原来在最上方，移去后只剩两条线段，C 在下面，A 在上面，没有新邻接需要检查。",
    action: "移去 D",
  },
  {
    id: "S56",
    page: "finish",
    step: 2,
    state: "cEnd",
    caption:
      "扫描线来到横坐标为九的位置，线段 C 在这里结束。移去最下方的 C 这条线段，只剩 A 这条线段，仍然没有一对新的邻居。",
    action: "移去 C",
  },
  {
    id: "S57",
    page: "finish",
    step: 3,
    state: "aEnd",
    caption:
      "扫描线来到横坐标为十的位置，线段 A 也结束。活动顺序和待处理清单都变空，扫描过程结束。",
    action: "清空状态",
  },
  {
    id: "S58",
    page: "finish",
    step: 4,
    state: "aEnd",
    caption:
      "已经报告的结果继续保留：A 与 D 对应 Q，C 与 D 对应 R，A 与 C 对应 P。每一条都按原始无序输入对记录。",
    action: "保留三条最终结果",
  },
  {
    id: "S59",
    page: "closing",
    step: 1,
    state: "aEnd",
    caption:
      "完整过程里，开始、结束和交叉都可能带来新邻居。只检查最初的邻居不够，邻接必须随事件更新。",
    action: "回顾三类事件",
  },
  {
    id: "S60",
    page: "closing",
    step: 2,
    state: "aEnd",
    caption:
      "检查先确认线段范围，再判断严格未来，最后避免重复登记。发现时登记，到达时报告，不能把这两个时刻混在一起。",
    action: "回顾检查与报告顺序",
  },
  {
    id: "S61",
    page: "closing",
    step: 3,
    state: "aEnd",
    caption:
      "这个案例说明规则怎样配合，还不是一般证明。下一集解释为什么交叉前必成为邻居，以及为什么不会出现第一个漏掉的交点。",
    action: "衔接下集，不把案例当证明",
  },
];
