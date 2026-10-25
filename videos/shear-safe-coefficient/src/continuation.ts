import { left, equals } from "../../shared/math/math-lines.ts";
import type { Page, Shot, Line } from "./storyboard.ts";

const order: Line[] = [
  { math: "M\\ge1,\\quad s>0,\\quad X_P<X_Q" },
  { math: "X_Q-X_P\\ge\\frac1{64M^4}" },
  { math: "X'=X+sY,\\quad Y'=Y" },
];
const height: Line[] = [
  { text: "P、Q 是端点或实际线段交点" },
  { math: "|Y_Q-Y_P|\\le2M" },
];
const difference: Line = {
  math: "X'_Q-X'_P=(X_Q-X_P)+s(Y_Q-Y_P)",
};

export const continuationPages: Record<string, Page> = {
  growth: {
    title: "右边的点更高：间隔增大",
    mode: "示意，非最终系数 · 等比例坐标",
    context: [],
    shearDiagram: "growth",
    lines: [
      { math: "P=(0,0),\\ Q=(4,2),\\ s=\\frac12" },
      { math: "X'_P=0,\\quad X'_Q=4+\\frac12\\times2=5" },
      { math: "5-0=5>4-0=4" },
      { text: "右边的点更高，向右多移，间隔增大" },
    ],
    groups: [left(1), left(1), left(2)],
    holdAfterSeconds: 5,
    note: "本段用便于观察的数值；最终系数稍后严格推导",
  },
  same: {
    title: "高度相同：间隔不变",
    mode: "示意，非最终系数 · 等比例坐标",
    context: [],
    shearDiagram: "same",
    lines: [
      { math: "P=(0,2),\\ Q=(4,2),\\ s=\\frac12" },
      { math: "X'_P=1,\\quad X'_Q=5" },
      { math: "5-1=4-0=4" },
      { text: "两点向右移动一样多，间隔不变" },
    ],
    groups: [left(1), left(1), left(2)],
    holdAfterSeconds: 5,
    note: "改变间隔的是两点的高度差",
  },
  shrink: {
    title: "左边的点更高：间隔缩小",
    mode: "示意，非最终系数 · 等比例坐标",
    context: [],
    shearDiagram: "shrink",
    lines: [
      { math: "P=(0,2),\\ Q=(4,0),\\ s=\\frac12" },
      { math: "X'_P=1,\\quad X'_Q=4" },
      { math: "4-1=3>0,\\quad 1<4" },
      { text: "缩短量小于原间隔，就不会追上" },
    ],
    groups: [left(1), left(1), left(2)],
    holdAfterSeconds: 5,
    note: "要保持严格左右顺序，只需防住间隔缩小的情况",
  },
  height: {
    title: "高度差，最多是多少？",
    mode: "只讨论输入端点与实际线段交点",
    context: [],
    shearDiagram: "height",
    lines: [
      { text: "端点高度都在 −M 到 M 之间" },
      { text: "线段上的点，不超过两端高度范围" },
      { math: "-M\\le Y_P,Y_Q\\le M" },
      { math: "|Y_Q-Y_P|\\le M-(-M)=2M" },
      { text: "不能套用于任意延长线交点" },
      { math: "X_P<X_Q,\\quad s>0" },
      { math: "X_Q-X_P\\ge\\frac1{64M^4}" },
    ],
    groups: [left(2), left(2), left(3)],
    holdAfterSeconds: 5,
    note: "Y_P、Y_Q 分别表示 P、Q 的纵坐标；高度就是纵坐标",
  },
  difference: {
    title: "展开剪切后的横坐标差",
    mode: "右边减左边 · 差仍为正就保持左右顺序",
    context: [...order, ...height],
    lines: [
      { math: "X'_Q-X'_P=(X_Q+sY_Q)-(X_P+sY_P)" },
      { math: "=X_Q+sY_Q-X_P-sY_P" },
      { math: "=(X_Q-X_P)+s(Y_Q-Y_P)" },
      { text: "前项是原间隔，后项是间隔的变化量" },
      { math: "s|Y_Q-Y_P|\\le2Ms" },
    ],
    groups: [equals(3), left(1), left(1)],
    holdAfterSeconds: 5,
    note: "s>0；高度差为负时缩短，最大缩短量不超过 2Ms",
  },
  power: {
    title: "四次方，再乘高度差中的一次方",
    mode: "要求最大缩短量严格小于间距下界",
    context: [...order, ...height, { math: "s|Y_Q-Y_P|\\le2Ms" }],
    lines: [
      { math: "2Ms<\\frac1{64M^4}" },
      { math: "2M>0" },
      { math: "s<\\frac1{64M^4}\\div(2M)" },
      { math: "\\frac1{64M^4}\\times\\frac1{2M}=\\frac1{128M^5}" },
      { math: "64\\times2=128,\\quad M^4\\times M=M^5" },
    ],
    groups: [left(2), left(2), left(1)],
    holdAfterSeconds: 5,
    note: "同除以正数，不等号方向不变；得到 s<1/(128M⁵)",
  },
  "question-equality": {
    title: "缩短量等于原间隔，够不够？",
    mode: "示意，非最终系数 · 等比例坐标",
    context: [],
    shearDiagram: "equality",
    lines: [
      { text: "原间隔为 1，缩短量也为 1，先想一想" },
      { math: "X'_Q-X'_P=1-1=0" },
      { text: "横坐标相同，不能保证严格左右顺序" },
      { math: "2Ms<\\frac1{64M^4},\\quad s<\\frac1{128M^5}" },
    ],
    groups: [left(1), left(2), left(1)],
    holdAfterSeconds: 5,
    note: "等号边界可能追上，所以需要严格小于",
  },
  coefficient: {
    title: "为什么可以选带 256 的系数？",
    mode: "先比较正分母，再比较倒数",
    context: [...order, ...height, { math: "s<\\frac1{128M^5}" }],
    lines: [
      { math: "s=\\frac1{256(M+1)^5}" },
      { math: "M+1>M>0,\\quad (M+1)^5>M^5" },
      { math: "256(M+1)^5>256M^5>128M^5" },
      { math: "0<s<\\frac1{128M^5}" },
      { text: "256=2×128，M+1 再留额外余量" },
      { text: "是保守选择，不是唯一或最大选择" },
    ],
    groups: [left(1), left(2), left(1), left(2)],
    holdAfterSeconds: 5,
    note: "正分母越大，倒数越小；两处余量都让系数更小",
  },
  budget: {
    title: "把所选系数代回最大缩短量",
    mode: "重新核实严格小于，而不是只看公式形式",
    context: [
      ...order,
      ...height,
      { math: "s=\\frac1{256(M+1)^5}<\\frac1{128M^5}" },
    ],
    lines: [
      { math: "2M>0" },
      { math: "2Ms<\\frac{2M}{128M^5}" },
      { math: "\\frac{2M}{128M^5}=\\frac1{64M^4}" },
      { math: "2Ms<\\frac1{64M^4}" },
    ],
    groups: [left(1), left(2), left(1)],
    holdAfterSeconds: 5,
    note: "乘正数不改方向；分子、分母同除以 2M",
  },
  closure: {
    title: "代回横坐标差，闭合保序证明",
    mode: "每一步都有同屏可查的依据",
    context: [...order, ...height, { math: "2Ms<\\frac1{64M^4}" }],
    lines: [
      difference,
      { math: "\\ge(X_Q-X_P)-s|Y_Q-Y_P|" },
      { math: "\\ge\\frac1{64M^4}-2Ms" },
      { math: ">0" },
      { math: "X'_P<X'_Q" },
    ],
    groups: [left(4), left(1)],
    holdAfterSeconds: 5,
    note: "原来横坐标不同且靠左的事件，剪切后仍然靠左",
  },
  numbers: {
    title: "取 M=3，先算两个精确分数",
    mode: "不用小数近似 · 不放大最终系数的位移",
    context: [
      { text: "M：1 与全部端点坐标绝对值的最大值" },
      { math: "s=\\frac1{256(M+1)^5}" },
      { math: "s|Y_Q-Y_P|\\le2Ms" },
      { math: "X_Q-X_P\\ge\\frac1{64M^4}" },
    ],
    lines: [
      { math: "M=3,\\quad (3+1)^5=4^5=1024" },
      { math: "s=\\frac1{256\\times1024}=\\frac1{262144}" },
      { math: "2Ms=\\frac{2\\times3}{262144}=\\frac6{262144}" },
      { math: "\\frac1{64M^4}=\\frac1{64\\times81}=\\frac1{5184}" },
    ],
    groups: [left(2), left(1), left(1)],
    holdAfterSeconds: 5,
    note: "比较最大缩短量和保证下界，不把下界说成实际最小距离",
  },
  comparison: {
    title: "交叉相乘，完成精确验算",
    mode: "两个分母都是正数，所以比较方向不变",
    context: [
      { math: "M=3,\\quad s=\\frac1{262144}" },
      { text: "最大缩短量：6/262144" },
      { text: "间距保证下界：1/5184" },
      { math: "262144>0,\\quad 5184>0" },
    ],
    lines: [
      { text: "同乘正数 262144×5184，比较整数" },
      { math: "6\\times5184=31104<262144" },
      { math: "\\frac6{262144}<\\frac1{5184}" },
      { text: "最大缩短量更小，严格左右顺序保持" },
    ],
    groups: [left(1), left(2), left(1)],
    holdAfterSeconds: 5,
    note: "五次方来自间距与高度差；256 和 M+1 提供额外余量",
  },
};

// Reading copy comes first. Each new row has its own whole-sentence narration.
export const continuationShots: Shot[] = [
  {
    id: "233-01",
    page: "growth",
    step: 1,
    caption:
      "先用便于观察的数值示意，这不是最终系数。取 P=(0,0)，Q=(4,2)，系数 s=1/2。",
  },
  {
    id: "233-02",
    page: "growth",
    step: 2,
    caption:
      "按 X′=X+sY，点 P 的横坐标仍为 0。点 Q 的横坐标变成 4 加上 1/2 乘以 2，得到 5。",
  },
  {
    id: "233-03",
    page: "growth",
    step: 4,
    caption: "新间隔为 5，大于原间隔 4。右边的点更高，向右多移，所以间隔增大。",
  },
  {
    id: "233-04",
    page: "same",
    step: 1,
    caption:
      "保持示意系数 1/2，把 P 改成 (0,2)，Q 仍是 (4,2)。现在两点一样高。",
  },
  {
    id: "233-05",
    page: "same",
    step: 2,
    caption: "两点都向右移动 1，新的横坐标分别是 1 和 5。",
  },
  {
    id: "233-06",
    page: "same",
    step: 4,
    caption: "5 减 1 仍等于 4，和原间隔相同。两点移动一样多，间隔不变。",
  },
  {
    id: "233-07",
    page: "shrink",
    step: 1,
    caption: "再看 P=(0,2)，Q=(4,0)，示意系数仍是 1/2。这次左边的点更高。",
  },
  {
    id: "233-08",
    page: "shrink",
    step: 2,
    caption: "点 P 向右移动 1，点 Q 不移动。新的横坐标分别为 1 和 4。",
  },
  {
    id: "233-09",
    page: "shrink",
    step: 4,
    caption:
      "新间隔是 4 减 1 等于 3，仍然为正。缩短量 1 小于原间隔 4，所以不会追上。下面只需防住间隔缩小的情况。",
  },
  {
    id: "233-10",
    page: "height",
    step: 1,
    caption:
      "回到一般情形，M 至少为 1。按 M 的定义，所有输入端点的高度都在 −M 到 M 之间。",
  },
  {
    id: "233-11",
    page: "height",
    step: 2,
    caption:
      "线段上的点，不高于较高的端点，也不低于较低的端点。图中的实际交点同样处在这个范围内。",
  },
  {
    id: "233-12",
    page: "height",
    step: 3,
    caption:
      "Y_P 和 Y_Q 分别表示 P、Q 的纵坐标，也就是高度。P、Q 是输入端点或实际线段交点，所以它们的高度都在 −M 到 M 之间。",
  },
  {
    id: "233-13",
    page: "height",
    step: 4,
    caption:
      "最高高度是 M，最低高度是 −M。用最高减去最低，减去 −M 就是加上 M。因此高度差的绝对值最多是 2M。",
  },
  {
    id: "233-14",
    page: "height",
    step: 5,
    caption:
      "这个界只用于端点和实际线段交点，不能套用于任意延长线交点。延长线的交点可能在线段外很远的地方。",
  },
  {
    id: "233-order",
    page: "height",
    step: 7,
    caption:
      "接下来设 P 在 Q 左边，也就是 P 的横坐标小于 Q 的横坐标。选系数 s 大于零，前面证明的距离下界，现在就是右边横坐标减去左边横坐标的下界。",
  },
  {
    id: "233-15",
    page: "difference",
    step: 1,
    caption:
      "设 P 原先在 Q 左边，并选 s 大于零。撇号表示剪切后的坐标，用 Q 的新横坐标减去 P 的新横坐标。分别代入剪切公式，得到两个和相减。",
  },
  {
    id: "233-16",
    page: "difference",
    step: 2,
    caption: "去掉括号，第二个括号前是减号。因此里面的两项，都要变成相反数。",
  },
  {
    id: "233-17",
    page: "difference",
    step: 4,
    caption:
      "把两个原横坐标放在一起，再从两个高度项中提出 s。前项是 Q 的原横坐标减 P 的原横坐标，后项是 s 乘以 Q 的高度减 P 的高度所得的差。它们分别是原间隔和间隔的变化量。",
  },
  {
    id: "233-18",
    page: "difference",
    step: 5,
    caption:
      "s 为正，高度差的绝对值不超过 2M。变化量的绝对值就不超过 2Ms，所以最大缩短量不超过 2Ms。",
  },
  {
    id: "233-19",
    page: "power",
    step: 1,
    caption:
      "原间隔至少为 1/(64M⁴)，只要最大缩短量严格小于这个下界，就能保证新横坐标差为正。",
  },
  {
    id: "233-20",
    page: "power",
    step: 2,
    caption: "因为 M 至少为 1，所以 2M 大于零。",
  },
  {
    id: "233-21",
    page: "power",
    step: 3,
    caption:
      "两边同除以正数 2M，不等号方向不变。左边只剩下 s 这一项，右边是间距下界除以 2M。",
  },
  {
    id: "233-22",
    page: "power",
    step: 4,
    caption:
      "除以 2M，就是乘以它的倒数。把两个正分母相乘，得到 s 小于 1/(128M⁵)。",
  },
  {
    id: "233-23",
    page: "power",
    step: 5,
    caption:
      "这里 64 乘以 2 等于 128，M⁴ 乘以 M 等于 M⁵。五次方来自间距中的四次方，再乘高度差中的一次方。",
  },
  {
    id: "233-24",
    page: "question-equality",
    step: 1,
    caption:
      "如果原间隔是 1，缩短量也等于 1，还能保证严格左右顺序吗？保留图式，安静想四秒。",
    pauseAfter: 4,
  },
  {
    id: "233-25",
    page: "question-equality",
    step: 3,
    caption:
      "不能，新的横坐标差可能是 1 减 1 等于零。两个横坐标相同，就不能保证严格左右顺序。",
  },
  {
    id: "233-26",
    page: "question-equality",
    step: 4,
    caption:
      "所以最大缩短量必须严格小于间距下界，我们要求 s 严格小于 1/(128M⁵)。接下来选一个满足条件的系数。",
  },
  {
    id: "234-01",
    page: "coefficient",
    step: 1,
    caption:
      "我们选 s=1/[256(M+1)⁵]，也就是先算 M 加 1 的五次方，再乘以 256，最后取整个乘积的倒数。",
  },
  {
    id: "234-02",
    page: "coefficient",
    step: 2,
    caption:
      "M 至少为 1，因此 M 加 1 大于 M，而且都是正数。五个较大的正数相乘，得到的五次方也更大。",
  },
  {
    id: "234-03",
    page: "coefficient",
    step: 3,
    caption:
      "两边乘以正数 256，仍然保持大于关系。256 又大于 128，所以最左边的分母大于 128M⁵。",
  },
  {
    id: "234-04",
    page: "coefficient",
    step: 4,
    caption:
      "这些分母都为正，取倒数后不等号方向反过来。因此所选 s 为正，而且严格小于 1/(128M⁵)。",
  },
  {
    id: "234-05",
    page: "coefficient",
    step: 6,
    caption:
      "256 是 128 的两倍，再把 M 换成 M 加 1，两处都让分母更大，系数更小。这提供额外余量，是保守选择，并不是唯一正确或最大的可用系数。",
  },
  {
    id: "234-06",
    page: "budget",
    step: 1,
    caption: "再把所选系数代回最大缩短量，因为 M 至少为 1，所以 2M 大于零。",
  },
  {
    id: "234-07",
    page: "budget",
    step: 2,
    caption:
      "把系数上界两边同乘正数 2M，方向不变。得到 2Ms 小于 2M 除以 128M⁵。",
  },
  {
    id: "234-08",
    page: "budget",
    step: 3,
    caption: "右边的分子和分母同除以 2M，分子变成 1，分母变成 64M⁴。",
  },
  {
    id: "234-09",
    page: "budget",
    step: 4,
    caption: "因此最大缩短量严格小于 1/(64M⁴)，正好满足前面提出的要求。",
  },
  {
    id: "234-10",
    page: "closure",
    step: 1,
    caption:
      "最后回到新横坐标差，它等于原间隔加上变化量。所有条件和刚才的缩短量界，都保留在左边。",
  },
  {
    id: "234-11",
    page: "closure",
    step: 2,
    caption:
      "任何实数都不小于自身绝对值的相反数，s 又是正数。因此把变化量换成负的 s 乘以高度差的绝对值，得到一个下界。",
  },
  {
    id: "234-12",
    page: "closure",
    step: 3,
    caption:
      "原间隔至少为 1/(64M⁴)，扣掉的量不超过前面算出的最大缩短量。因此新横坐标差，至少为这个间距下界减去最大缩短量。",
  },
  {
    id: "234-13",
    page: "closure",
    step: 4,
    caption:
      "已经证明最大缩短量严格小于间距下界，较大的数减去较小的数，结果严格大于零。",
  },
  {
    id: "234-14",
    page: "closure",
    step: 5,
    caption:
      "于是 P 的新横坐标仍小于 Q 的新横坐标，原来靠左的事件仍然靠左。这就闭合了保序证明。",
  },
  {
    id: "234-15",
    page: "numbers",
    step: 1,
    caption: "最后取 M=3 验算，M 加 1 等于 4，4 的五次方等于 1024。",
  },
  {
    id: "234-16",
    page: "numbers",
    step: 2,
    caption: "256 乘以 1024 等于 262144，因此 s 等于这个正整数的倒数。",
  },
  {
    id: "234-17",
    page: "numbers",
    step: 3,
    caption: "2M 等于 6，所以最大缩短量是 6/262144。",
  },
  {
    id: "234-18",
    page: "numbers",
    step: 4,
    caption:
      "3 的四次方等于 81，64 乘以 81 等于 5184。因此间距的保证下界，是 1/5184。",
  },
  {
    id: "234-19",
    page: "comparison",
    step: 1,
    caption:
      "比较这两个分数，两边同乘正数 262144 与 5184 的乘积。不等号方向不变，只需比较约去分母后得到的整数。",
  },
  {
    id: "234-20",
    page: "comparison",
    step: 2,
    caption:
      "左边得到 6 乘以 5184，等于 31104。右边得到 262144，左边严格更小。",
  },
  {
    id: "234-21",
    page: "comparison",
    step: 3,
    caption: "所以 6/262144 严格小于 1/5184，不需要小数近似。",
  },
  {
    id: "234-22",
    page: "comparison",
    step: 4,
    caption:
      "最大缩短量小于保证下界，因此严格左右顺序保持。注意这个下界，不一定是实际最小间距。五次方来自间距与高度差，256 和 M 加 1 提供额外余量。",
  },
];
