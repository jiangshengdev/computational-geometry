/** #306–#312: subtitle-first visual master. Timing is provisional, never audio timing. */
export type Reference = {
  number?: number;
  name: string;
  math?: string;
  text?: string;
};
export const references = {
  conditions: {
    name: "条件",
    text: "有限条非竖直有长度线段；无重叠、端点接触、三线共点；事件横坐标各异",
  },
  example: { name: "上集案例", math: "y_A(x)=1,\\quad y_C(x)=8-x" },
  ca: { number: 1, name: "案例高度差", math: "d_{CA}(x)=y_C(x)-y_A(x)=7-x" },
  lines: {
    number: 2,
    name: "两条直线",
    math: "y_U(x)=m_Ux+b_U,\\quad y_V(x)=m_Vx+b_V",
  },
  difference: { number: 3, name: "固定高度差", math: "d(x)=y_V(x)-y_U(x)" },
  coefficients: {
    number: 4,
    name: "系数差",
    math: "\\alpha=m_V-m_U,\\quad \\beta=b_V-b_U",
  },
  affine: { number: 5, name: "高度差式", math: "d(x)=\\alpha x+\\beta" },
  interval: { name: "共同区间", text: "u<v；两条线段覆盖从 u 到 v，包含两端" },
  ends: {
    number: 6,
    name: "两端高度差",
    math: "d(u)=\\alpha u+\\beta,\\quad d(v)=\\alpha v+\\beta",
  },
  reverseSigns: { name: "负变正条件", math: "d(u)<0,\\quad d(v)>0" },
  lastEvent: {
    name: "最后事件的定义",
    text: "e 是 p 左边全部实际事件中的最大横坐标",
  },
  signs: { name: "正变负条件", math: "d(u)>0,\\quad d(v)<0" },
  position: { number: 7, name: "位置表达式", math: "x=u+t(v-u)" },
  inside: {
    number: 8,
    name: "位置范围",
    math: "0<t<1\\ \\Longrightarrow\\ u<u+t(v-u)<v",
  },
  expanded: {
    number: 9,
    name: "展开结果",
    math: "d(u+t(v-u))=(\\alpha u+\\beta)+t(\\alpha v-\\alpha u)",
  },
  endDifference: {
    number: 10,
    name: "两端之差",
    math: "d(v)-d(u)=\\alpha v-\\alpha u",
  },
  interpolation: {
    number: 11,
    name: "中间高度差",
    math: "d(u+t(v-u))=d(u)+t(d(v)-d(u))",
  },
  equation: { number: 12, name: "零差方程", math: "d(u)=t(d(u)-d(v))" },
  ratio: { number: 13, name: "零差比例", math: "t=\\frac{d(u)}{d(u)-d(v)}" },
  crossing: {
    number: 14,
    name: "变号结论",
    text: "两段覆盖整个区间，固定相减的高度差两端异号，则内部必有交点",
  },
  stable: {
    number: 15,
    name: "无事件不换序",
    text: "没有端点和交点的区间，活动成员和上下顺序不变",
  },
  equal: { number: 16, name: "交点等高", math: "y_U(p)=y_V(p)" },
  gap: {
    number: 17,
    name: "交点前区间",
    text: "e<r<p；从 r 到 p 之前无事件；U、V 覆盖到 p",
  },
  sandwich: { number: 18, name: "夹层假设", math: "y_U(r)<y_W(r)<y_V(r)" },
  wExists: {
    name: "夹层的存在范围",
    text: "W 从 r 到 p 都存在；此前顺序保持不变",
  },
  lower: { number: 19, name: "下侧限制", math: "y_U(p)\\le y_W(p)" },
  upper: { number: 20, name: "上侧限制", math: "y_W(p)\\le y_V(p)" },
  adjacent: {
    number: 21,
    name: "交叉前必相邻",
    text: "任意两条交叉线段，在交点前一小段范围里已经相邻",
  },
  checked: {
    number: 22,
    name: "新邻接必检查",
    text: "此前事件正确处理时，每对新邻居形成时都接受检查",
  },
  queue: {
    name: "上集清单规则",
    text: "端点初始登记；真实未来交点只留一份，保留到按位置取出并报告",
  },
  earliest: {
    name: "最早漏点假设",
    text: "p_* 是最早漏点横坐标；对应输入为 U_*、V_*；左侧没有漏点",
  },
  prior: {
    number: 23,
    name: "左侧过程正确",
    text: "p_* 左边的事件均正确处理，活动顺序与几何顺序一致",
  },
  formed: {
    number: 24,
    name: "最后形成邻接",
    text: "在 s<p_* 检查 U_*、V_*；这次邻接一直保持到交点前",
  },
} satisfies Record<string, Reference>;
export type ReferenceId = keyof typeof references;
export type Step = {
  text?: string;
  math?: string;
  caption: string;
  seconds: number;
  publish?: ReferenceId;
  use?: ReferenceId[];
  /** Exact subexpression shared by source and current transformation. */
  focus?: string[];
};
export type StoryPage = {
  id: string;
  chapter: number;
  title: string;
  basis: ReferenceId[];
  steps: Step[];
  diagram?:
    | "height"
    | "numeric"
    | "position"
    | "interval"
    | "sandwich"
    | "triple"
    | "start"
    | "end"
    | "swap"
    | "missed";
  hold: number;
};
const t = (
  text: string,
  caption: string,
  use: ReferenceId[] = [],
  seconds = 9,
): Step => ({ text, caption, use, seconds });
const m = (
  math: string,
  caption: string,
  use: ReferenceId[] = [],
  focus?: string,
  seconds = 12,
): Step => ({
  math,
  caption,
  use,
  focus: focus ? [focus] : undefined,
  seconds,
});
const ref = (
  id: ReferenceId,
  caption: string,
  use: ReferenceId[] = [],
  seconds = 12,
  focus?: string[],
): Step => ({ ...references[id], caption, use, publish: id, seconds, focus });
const p = (
  id: string,
  chapter: number,
  title: string,
  basis: ReferenceId[],
  steps: Step[],
  diagram?: StoryPage["diagram"],
  hold = 3,
): StoryPage => ({ id, chapter, title, basis, steps, diagram, hold });
export const storyboard: StoryPage[] = [
  p(
    "opening",
    1,
    "为什么只检查邻居也不会漏点",
    [],
    [
      t(
        "案例成功，还需要一般证明",
        "上集跟完一个案例，这次要说明每一组满足条件的输入为什么都成立。",
      ),
      t(
        "高度差 → 稳定顺序 → 交叉前相邻",
        "前三步先建立几何事实，再把它与扫描规则连接起来。",
      ),
      t(
        "新邻接检查 → 排除最早漏点",
        "后面用反证排除第一个漏点，最后说明不多报、不重复和工作量边界。",
      ),
    ],
  ),
  p(
    "conditions",
    1,
    "先明确证明的适用范围",
    [],
    [
      t(
        "有限条线段；有长度、不竖直",
        "本章只讨论有限条有长度、不竖直的线段，水平线段可以出现。",
      ),
      t(
        "无重叠、端点接触、三线共点",
        "不允许线段重叠、端点落在另一段上，或三条以上线段共点。",
      ),
      t(
        "所有端点和交点的横坐标各不相同",
        "因此一次只处理一个开始、结束或两线交叉。完整算法还要处理更复杂的输入。",
      ),
      ref("conditions", "把这些条件保留下来，后面的排除步骤会明确引用它们。"),
    ],
  ),
  p(
    "recall",
    1,
    "回顾活动顺序与清单",
    ["conditions"],
    [
      t(
        "扫描线从左向右，活动线段从下到上排列",
        "当前与扫描线相交的线段叫活动线段，高度从下到上的排列叫活动顺序。",
      ),
      t(
        "直接相邻的两条才是邻居",
        "邻居中间没有其他活动线段。端点和交点的位置叫扫描事件。",
      ),
      ref(
        "queue",
        "端点一开始就已知；检查发现真实未来交点后登记，到达时再报告。",
      ),
    ],
  ),
  p(
    "heights",
    1,
    "先从上集会算的高度开始",
    [],
    [
      ref("example", "仍用上集的 A 和 C：A 的高度为 1，C 的高度为 8 减 x。"),
      t(
        "下标指出线段，括号指出计算位置",
        "y_C(x) 表示 C 在横坐标 x 处的高度；括号不是乘法。",
      ),
      m(
        "y_C(6)=8-6=2>y_A(6)=1",
        "把 6 代入，C 比 A 高。接下来把这种比较写成一个差。",
      ),
    ],
    "height",
  ),
  p(
    "define-ca",
    1,
    "固定按 C 的高度减 A 的高度",
    ["example"],
    [
      m(
        "d_{CA}(x)=y_C(x)-y_A(x)",
        "给差取名 d_CA；下标 CA 提醒相减次序是 C 减 A。",
        ["example"],
      ),
      m(
        "d_{CA}(x)=(8-x)-1=8-x-1",
        "分别代入两个高度，再去括号，仍是同一个差。",
        ["example"],
      ),
      ref("ca", "合并常数 8 减 1，得到编号(1)；之后用它判断上下关系。"),
    ],
  ),
  p(
    "signs-example",
    1,
    "正、零、负分别表示什么",
    ["ca"],
    [
      m("d_{CA}(6)=2-1=1>0", "在 6 处，差为正，C 在 A 上方。", ["ca"]),
      m("d_{CA}(7)=1-1=0", "在 7 处，两者等高，交点是 P=(7,1)。", ["ca"]),
      m("d_{CA}(8)=0-1=-1<0", "在 8 处仍用 C 减 A，差为负，C 到了 A 下方。", [
        "ca",
      ]),
      t(
        "高度差不是永远非负的距离",
        "不能临时改成上面减下面，否则会丢掉顺序颠倒的信息。",
      ),
    ],
    "height",
  ),
  p(
    "general-lines",
    2,
    "第二章：任意两条线段怎样比较",
    ["conditions"],
    [
      t(
        "选定 U、V，分别用下标标明对象",
        "现在离开具体案例，选定任意两条不竖直的线段 U、V。",
      ),
      ref(
        "lines",
        "两条所在直线分别有自己的斜率和常数项；四个系数固定，x 可以变化。",
      ),
      ref(
        "difference",
        "始终用 V 减 U；d(x) 只指这一对的差，案例仍用 d_CA(x)。",
      ),
      t(
        "正：V 在上；零：等高；负：V 在下",
        "先把符号与高低关系连起来，再研究这个差怎样随位置变化。",
      ),
    ],
  ),
  p(
    "subtract",
    2,
    "代入两条直线，说明系数从哪里来",
    ["lines", "difference"],
    [
      m(
        "d(x)=(m_Vx+b_V)-(m_Ux+b_U)",
        "把(2)的两个高度代入(3)，减号后是整个 U 的表达式。",
        ["lines", "difference"],
        "m_Ux+b_U",
      ),
      m(
        "d(x)=m_Vx+b_V-m_Ux-b_U",
        "去掉减号后的括号，两项都要变号，不能只改第一项。",
        ["lines"],
        "m_Ux",
      ),
      m(
        "d(x)=(m_Vx-m_Ux)+(b_V-b_U)",
        "把含 x 的项放在一起，常数项放在一起，为提取共同因子作准备。",
      ),
      m(
        "d(x)=(m_V-m_U)x+(b_V-b_U)",
        "用分配律反向提取共同的 x，两个系数差现在都看清了。",
      ),
    ],
  ),
  p(
    "abbreviate",
    2,
    "给两个系数差取简写",
    ["lines", "difference"],
    [
      ref(
        "coefficients",
        "希腊字母 \\alpha 和 \\beta 分别记作这两个系数差，不是新增的直线系数。",
      ),
      ref(
        "affine",
        "把刚才的两个差替换为简写，得到(5)。后面只需研究这一条高度差式。",
        ["coefficients"],
        12,
        ["\\alpha", "\\beta"],
      ),
      t(
        "\\beta 是常数项的差，不是任一条直线的常数项",
        "\\beta 与 b_U、b_V 是不同的量。符号不会换页后重新赋义。",
      ),
    ],
  ),
  p(
    "constant",
    2,
    "先处理高度差不变的情况",
    ["affine", "coefficients"],
    [
      m(
        "\\alpha=0\\ \\Longrightarrow\\ d(x)=0\\times x+\\beta=\\beta",
        "若 \\alpha 为零，位置怎样变，差都是 \\beta。",
        ["affine"],
      ),
      m("\\beta>0:\\ y_V(x)>y_U(x)", "\\beta 为正，V 始终在 U 上方。"),
      m(
        "\\beta<0:\\ y_V(x)<y_U(x)",
        "\\beta 为负，V 始终在 U 下方。这两种都不会换序。",
      ),
    ],
  ),
  p(
    "coincident",
    2,
    "常数差也为零，为什么要排除",
    ["coefficients", "affine", "conditions"],
    [
      m(
        "\\alpha=0,\\ \\beta=0\\ \\Longrightarrow\\ m_V=m_U,\\ b_V=b_U",
        "两个系数差都为零，两条所在直线的斜率、常数项分别相同。",
        ["coefficients"],
      ),
      t("两条所在直线完全重合", "此时在相同横坐标处高度都相同。"),
      t(
        "若共同覆盖一段非零长度区间，就发生重叠",
        "本章已排除重叠，所以接下来共同区间内的变号不会来自常数差。",
        ["conditions"],
      ),
      t(
        "真正变号时，\\alpha 不为零",
        "常数情形已经处理完；下面要找变化中的差何时等于零。",
      ),
    ],
  ),
  p(
    "common-interval",
    3,
    "第三章：把中间位置表示出来",
    ["affine"],
    [
      ref(
        "interval",
        "用 u、v 表示左右两个位置。要求两条线段覆盖从 u 到 v，连同两端。",
      ),
      ref(
        "ends",
        "把 u、v 分别代入(5)，就是两个端点位置的高度差，括号不是乘法。",
        ["affine"],
      ),
      ref(
        "signs",
        "先研究左端差为正、右端差为负。目标是找到中间差为零的位置。",
      ),
    ],
  ),
  p(
    "numeric-distance",
    3,
    "先在数轴上算全程和已走部分",
    [],
    [
      m("10-2=8", "先看独立的数值例子：从 2 走到 10，全程为 8。"),
      m(
        "\\frac14\\times8=2",
        "走了全程的四分之一，已走部分是 2；图中两段长度从同一起点量起。",
      ),
      m("2+2=4", "当前位置要把起点加回来，得到 4，不能只把路程当作坐标。"),
    ],
    "numeric",
  ),
  p(
    "position",
    3,
    "再换成一般位置和比例",
    ["interval"],
    [
      m("v-u>0", "从 u 到 v 的全程是 v 减 u，因为右端较大，所以全程为正。", [
        "interval",
      ]),
      t(
        "t 表示已走部分占全程的比例",
        "例如四分之一，就是走了全程的四分之一；这是引入 t 的用途。",
      ),
      m("t(v-u)", "全程乘以比例，得到已经走过的部分。"),
      ref(
        "position",
        "再加起点 u，就得到当前位置(7)。下一页检查它何时在两端之间。",
      ),
    ],
    "position",
  ),
  p(
    "position-range",
    3,
    "为什么零到一的比例对应内部位置",
    ["position", "interval"],
    [
      m(
        "t=0:\\ x=u;\\qquad t=1:\\ x=u+(v-u)=v",
        "比例为零时没出发，为一时到达右端。",
        ["position"],
      ),
      m(
        "0<t<1\\ \\Longrightarrow\\ 0<t(v-u)<v-u",
        "比例严格在零与一之间时，乘上正数全程，不等号方向不变。",
        ["interval"],
      ),
      m("u<u+t(v-u)<u+(v-u)=v", "三部分都加上起点 u，就变成位置的大小关系。", [
        "position",
      ]),
      ref("inside", "记住(8)：只需找到零与一之间的比例，就能找到内部位置。"),
    ],
  ),
  p(
    "substitution",
    3,
    "把中间位置代入高度差",
    ["affine", "position", "ends", "signs"],
    [
      t(
        "目的：把中间的差写成两端的差",
        "已知两端的正负，变形是为了用上这些条件，而不是只做计算。",
        ["ends", "signs"],
      ),
      m(
        "d(u+t(v-u))=\\alpha(u+t(v-u))+\\beta",
        "把(7)的完整位置代入(5)中的 x；左右两处表示同一个位置。",
        ["affine", "position"],
        "u+t(v-u)",
      ),
      m(
        "d(u+t(v-u))=\\alpha u+\\alpha t(v-u)+\\beta",
        "按分配律展开外层括号，\\alpha 分别乘两项。",
        ["affine"],
      ),
    ],
  ),
  p(
    "grouping",
    3,
    "分组，为辨认两端的差作准备",
    ["affine", "position", "ends"],
    [
      m(
        "d(u+t(v-u))=\\alpha u+\\alpha t(v-u)+\\beta",
        "接上前页的展开式，下面只重新分组，不改变数值。",
        ["affine", "position"],
      ),
      m(
        "d(u+t(v-u))=(\\alpha u+\\beta)+t\\alpha(v-u)",
        "把 \\alpha 乘 u 与 \\beta 放在一起；交换乘积因子，把 t 放前面。",
        ["ends"],
        "\\alpha u+\\beta",
      ),
      ref(
        "expanded",
        "再展开 \\alpha 乘以全程，得到(9)。第一个括号就是左端的差。",
        ["ends"],
      ),
    ],
  ),
  p(
    "end-difference",
    3,
    "单独辨认第二个括号",
    ["ends", "expanded"],
    [
      m(
        "d(v)-d(u)=(\\alpha v+\\beta)-(\\alpha u+\\beta)",
        "用(6)写出两端高度差之差，减去左端的整个括号。",
        ["ends"],
        "\\alpha u+\\beta",
      ),
      m(
        "d(v)-d(u)=\\alpha v+\\beta-\\alpha u-\\beta",
        "去括号时把后面两项都变号。",
        ["ends"],
      ),
      m(
        "d(v)-d(u)=(\\alpha v-\\alpha u)+(\\beta-\\beta)",
        "把常数移到一起，它们相减为零。",
      ),
      ref(
        "endDifference",
        "消去相同的常数项，得到(10)；它恰好对应(9)的第二个括号。",
        ["expanded"],
      ),
    ],
  ),
  p(
    "replace",
    3,
    "把两处对应关系代回展开式",
    ["expanded", "ends", "endDifference"],
    [
      m(
        "\\alpha u+\\beta=d(u)",
        "用(6)，把第一个括号辨认为左端高度差。",
        ["ends"],
        "\\alpha u+\\beta",
      ),
      m(
        "\\alpha v-\\alpha u=d(v)-d(u)",
        "用(10)，把第二个括号辨认为两端高度差之差。",
        ["endDifference"],
        "\\alpha v-\\alpha u",
      ),
      ref(
        "interpolation",
        "把两处同时代回(9)，得到(11)。这是推导出的恒等式，对每个比例 t 都成立。",
        ["expanded", "ends", "endDifference"],
        12,
        ["d(u)", "d(v)"],
      ),
    ],
  ),
  p(
    "zero-equation",
    3,
    "令高度差为零，逐步移项",
    ["interpolation", "difference"],
    [
      m(
        "0=d(u)+t(d(v)-d(u))",
        "两个高度相等，固定相减的结果就是零，所以令(11)右边等于零。",
        ["interpolation", "difference"],
        "d(u)+t(d(v)-d(u))",
      ),
      m("-d(u)=t(d(v)-d(u))", "方程两边都减去 d(u)，把与 t 无关的项移到左边。"),
      m("d(u)=t(-d(v)+d(u))", "两边乘负一，右侧括号内两项都变号。"),
      ref(
        "equation",
        "交换括号内两项的位置，得到(12)，为除去 t 的系数作准备。",
      ),
    ],
  ),
  p(
    "division",
    3,
    "先说明除法为什么合法",
    ["equation", "signs"],
    [
      m(
        "d(v)<0\\ \\Longrightarrow\\ -d(v)>0",
        "右端的差是负数，取相反数得到正数。",
        ["signs"],
      ),
      m(
        "d(u)-d(v)=d(u)+(-d(v))>d(u)>0",
        "左端的正数再加一个正数，因此 t 的系数比左端的差更大，也不为零。",
        ["signs"],
      ),
      m("\\frac{d(u)}{d(u)-d(v)}=t", "现在才能把(12)两边同除以这个非零系数。", [
        "equation",
      ]),
      ref("ratio", "把 t 写在左侧，得到(13)；还需要检查比例是否在零与一之间。"),
    ],
  ),
  p(
    "positive-range",
    3,
    "求出的比例会不会超出两端",
    ["ratio", "signs", "inside"],
    [
      m("0<d(u)<d(u)-d(v)", "由正变负条件，分子是正数，分母更大且为正。", [
        "signs",
      ]),
      m(
        "0<\\frac{d(u)}{d(u)-d(v)}<\\frac{d(u)-d(v)}{d(u)-d(v)}=1",
        "三部分同除以正的分母，方向不变；右端自己除自己为一。",
        ["ratio"],
      ),
      m(
        "0<t<1\\ \\Longrightarrow\\ u<u+t(v-u)<v",
        "所以解出的 t 满足(8)，中间位置确实严格落在两端之间。",
        ["inside", "ratio"],
      ),
    ],
  ),
  p(
    "verify-zero",
    3,
    "代回检查：得到的是线段交点",
    ["ratio", "interpolation", "interval", "inside"],
    [
      m(
        "d(u)+\\frac{d(u)}{d(u)-d(v)}(d(v)-d(u))",
        "把(13)代回(11)右边，确认求出的比例真让高度差为零。",
        ["ratio", "interpolation"],
      ),
      m(
        "d(v)-d(u)=-(d(u)-d(v))",
        "两个相反次序的差互为相反数，乘积因此变成负的 d(u)。",
      ),
      m("d(u)-d(u)=0", "相同两项抵消，得零，所以两条线段在这个横坐标处等高。"),
      t(
        "两段覆盖整个共同区间，交点不在延长线上",
        "位置在内部，而且两条线段在那里都存在，因此是线段交点。",
        ["interval"],
      ),
    ],
  ),
  p(
    "negative-direction",
    3,
    "从负变正：不改变相减次序",
    ["difference", "equation"],
    [
      ref(
        "reverseSigns",
        "现在只换两端的正负条件，d 仍是 V 减 U。代入和移项仍然成立。",
        ["difference"],
      ),
      m("d(u)-d(v)<0", "负数减正数仍为负，因此分母依旧不为零。"),
      ref("ratio", "仍可用(12)两边同除以非零系数，得到同一个(13)。", [
        "equation",
      ]),
    ],
  ),
  p(
    "negative-range",
    3,
    "把负分子和负分母同时变正",
    ["ratio", "reverseSigns"],
    [
      m(
        "t=\\frac{d(u)}{d(u)-d(v)}=\\frac{-d(u)}{-(d(u)-d(v))}",
        "分子分母同时乘非零的负一，不改变这个比例。条件仍是左负右正。",
        ["ratio"],
      ),
      m(
        "-(d(u)-d(v))=-d(u)+d(v)=d(v)-d(u)",
        "去掉分母前的负号，再交换两项次序，说明每个符号从哪里来。",
      ),
      m(
        "0<-d(u)<d(v)+(-d(u))=d(v)-d(u)",
        "新的分子是正数，分母还多了正数 d(v)，所以分母更大。",
      ),
      m(
        "0<\\frac{-d(u)}{d(v)-d(u)}<1\\ \\Longrightarrow\\ 0<t<1",
        "三部分同除以正的分母，仍得到零与一之间的比例。",
      ),
    ],
  ),
  p(
    "sign-change-result",
    3,
    "把代数结论还原为几何事实",
    ["inside", "interpolation", "interval"],
    [
      t(
        "两种变号方向，都得到内部等高位置",
        "正变负、负变正都找到了合法比例。代回零差方程成立，且两段都覆盖这个位置。",
        ["inside", "interpolation", "interval"],
      ),
      t(
        "某端的差为零，那一端已经是交点",
        "两种变号讨论的是两端都非零的情形。常数差不变号的情况也已处理。",
      ),
      ref(
        "crossing",
        "将结果记作(14)。它适用于任意两条满足共同区间条件的线段。",
      ),
    ],
  ),
  p(
    "no-events",
    4,
    "第四章：没有事件，为什么顺序不变",
    ["crossing"],
    [
      t(
        "没有端点，活动成员不变",
        "先看一段没有任何端点或交点的范围，线段不会中途开始或结束。",
      ),
      t(
        "若某一对颠倒，固定高度差在两处变号",
        "假设这一对换了高低，就能在范围中取前后两个位置，让差异号。",
      ),
      t(
        "由变号结论，中间必有交点：矛盾",
        "两段在这整段都存在，(14)保证交点出现，与没有交点相矛盾。",
        ["crossing"],
      ),
      ref(
        "stable",
        "因此每一对关系都不变，整个顺序不变。接下来用(15)研究交叉前的邻居。",
      ),
    ],
  ),
  p(
    "choose-crossing",
    4,
    "选定交点，先解释 p 的含义",
    ["conditions"],
    [
      t(
        "p 是 U、V 交点的横坐标",
        "p 是一个数值，不是平面上的点。y_U(p)、y_V(p) 是两条线段在这里的高度。",
      ),
      ref(
        "equal",
        "相交意味着同一横坐标处等高，记作(16)。目标是证明交叉前已经相邻。",
      ),
      t(
        "全部几何事件有限，不要求算法已经找到它们",
        "每段两个端点，每对不重叠线段至多一个交点，所以可以讨论有限个实际事件。",
        ["conditions"],
      ),
    ],
    "interval",
  ),
  p(
    "last-event",
    4,
    "找出交点左边最后一个事件",
    ["conditions", "equal"],
    [
      ref(
        "lastEvent",
        "U、V 的左端点都在 p 左边，所以左侧事件集合非空；有限集合能选出最大者。",
      ),
      m("e<p", "所有事件横坐标各不相同，最大左侧位置 e 严格小于 p。", [
        "conditions",
      ]),
      m(
        "r=\\frac{e+p}{2}",
        "取两者的平均值，命名为 r；下面证明它严格处在二者之间。",
      ),
    ],
    "interval",
  ),
  p(
    "midpoint",
    4,
    "逐步核对 r 确实位于中间",
    ["lastEvent"],
    [
      m(
        "e<p,\\qquad r=\\frac{e+p}{2}",
        "沿用刚选定的最后事件 e、交点 p 和中间位置 r。",
      ),
      m(
        "r-e=\\frac{e+p-2e}{2}=\\frac{p-e}{2}>0",
        "相减后分子是正数 p 减 e，分母 2 为正，所以 r 大于 e。",
      ),
      m(
        "p-r=\\frac{2p-e-p}{2}=\\frac{p-e}{2}>0",
        "另一侧相减也为正，所以 r 小于 p。",
      ),
      m("e<r<p", "因此从 r 到 p 之前没有别的事件，这正是选最后事件 e 的用途。"),
    ],
  ),
  p(
    "stable-interval",
    4,
    "交叉线段在这段范围一直存在",
    ["conditions", "stable", "equal"],
    [
      t(
        "U、V 的左端点不晚于 e",
        "因为 e 是 p 左边最后一个事件，它不会早于这两段的左端点。",
      ),
      t("右端点都在 p 右边", "交点在两段内部：端点接触已被条件排除。", [
        "conditions",
      ]),
      ref("gap", "所以 U、V 覆盖 r 到 p；其中到 p 之前没有事件，记为(17)。"),
      t(
        "到 p 之前的成员和上下顺序稳定",
        "把(15)用于这一段；现在可以问，两条交叉线段中间是否还能夹着别人。",
        ["stable"],
      ),
    ],
    "interval",
  ),
  p(
    "assume-between",
    4,
    "反证：暂时假设夹着 W",
    ["gap", "stable"],
    [
      t(
        "反证：接受待排除的假设，看是否违反条件",
        "这是一种证明方法。图是待排除的假设，不是已确认合法的输入。",
      ),
      t(
        "y_W(x) 表示 W 在 x 处的高度",
        "先讨论 U 在下、V 在上；W 是临时假设的第三条活动线段。",
      ),
      ref("sandwich", "在 r 处，W 高于 U、低于 V，得到夹层假设(18)。"),
      t(
        "先思考：W 能在到达 p 前消失吗",
        "保留假设图，下一页分别检查中途结束与恰在 p 结束。",
        [],
        12,
      ),
    ],
    "sandwich",
    5,
  ),
  p(
    "w-exists",
    4,
    "W 为什么不能提前消失",
    ["gap", "sandwich", "conditions", "stable"],
    [
      t("若在 r 与 p 中间结束，就出现端点事件", "这与(17)的无事件区间矛盾。", [
        "gap",
      ]),
      t(
        "若恰在 p 结束，端点与交点横坐标相同",
        "这与所有事件横坐标各异的条件矛盾。",
        ["conditions"],
      ),
      ref("wExists", "W 从 r 到 p 都存在；由(15)，到 p 之前仍夹在两者中间。", [
        "stable",
      ]),
      t(
        "只剩边界问题：在 p 能突然到外侧吗",
        "不能仅凭图猜结论，下面用已证明的变号结论排除两个方向。",
      ),
    ],
  ),
  p(
    "lower-bound",
    4,
    "排除 W 在 p 处低于 U",
    ["sandwich", "wExists", "gap", "crossing"],
    [
      m("y_W(p)<y_U(p)", "暂时假设在边界 p 处，W 已经低于 U。"),
      m(
        "y_W(r)-y_U(r)>0,\\quad y_W(p)-y_U(p)<0",
        "固定用 W 减 U：由(18)，左边为正；由临时假设，右边为负。",
        ["sandwich"],
      ),
      t(
        "两段都覆盖 r 到 p，内部必有交点：矛盾",
        "(14)适用于这对线段，却会在(17)的无事件区间产生交点。",
        ["wExists", "gap", "crossing"],
      ),
      ref(
        "lower",
        "所以不能严格低于 U，只能得到不小于的限制(19)；暂时还不是等号。",
      ),
    ],
  ),
  p(
    "upper-bound",
    4,
    "排除 W 在 p 处高于 V",
    ["sandwich", "wExists", "gap", "crossing"],
    [
      m("y_W(p)>y_V(p)", "再假设另一方向：W 在 p 处已经高于 V。"),
      m(
        "y_W(r)-y_V(r)<0,\\quad y_W(p)-y_V(p)>0",
        "固定用 W 减 V：左边为负，右边为正，用的是另一种变号方向。",
        ["sandwich"],
      ),
      t(
        "内部必有 W 与 V 的交点：仍然矛盾",
        "两段覆盖整个区间，(14)又与(17)冲突，所以这一方向也不可能。",
        ["wExists", "gap", "crossing"],
      ),
      ref("upper", "因此得到不大于的限制(20)；下一页把两侧限制连起来。"),
    ],
  ),
  p(
    "squeeze",
    4,
    "两侧限制和等高，共同逼出矛盾",
    ["lower", "upper", "equal", "conditions"],
    [
      m(
        "y_U(p)\\le y_W(p)\\le y_V(p)",
        "把(19)、(20)连起来，W 的高度夹在两个外侧高度之间。",
        ["lower", "upper"],
      ),
      m("y_U(p)=y_V(p)", "但(16)说明这两个外侧高度本来相等。", ["equal"]),
      m("y_U(p)=y_W(p)=y_V(p)", "既不能更小，也不能更大，W 只能等于共同高度。"),
      t(
        "同一横坐标、同一高度：三线共点，违反条件",
        "图展示假设被迫导出的矛盾，不能把它当作允许输入。",
        ["conditions"],
      ),
    ],
    "triple",
  ),
  p(
    "reverse-between",
    4,
    "若交点前 V 在下、U 在上呢",
    ["gap", "wExists", "crossing", "equal"],
    [
      m("y_V(r)<y_W(r)<y_U(r)", "改为另一种上下顺序，固定两对各自的相减次序。"),
      m(
        "y_W(r)-y_V(r)>0,\\quad y_W(r)-y_U(r)<0",
        "W 减 V 在左边为正，W 减 U 在左边为负。",
      ),
      t(
        "到 p 时，前者不能为负，后者不能为正",
        "否则各自变号，在无事件区间内产生交点；两侧排除理由相同。",
        ["crossing", "gap", "wExists"],
      ),
      m(
        "y_V(p)\\le y_W(p)\\le y_U(p)",
        "两端由(16)相等，仍逼出三线共点；反向顺序也不能夹着 W。",
        ["equal"],
      ),
    ],
  ),
  p(
    "adjacency-result",
    4,
    "交叉前必相邻，不是从开始就相邻",
    ["conditions"],
    [
      t(
        "两种顺序都排除了夹层假设",
        "应当否定的是最初假设存在的 W，而不是否定交点本身。",
      ),
      ref(
        "adjacent",
        "得到几何结论(21)：交叉前的一小段范围内，两条线段必定相邻。",
      ),
      t(
        "还需说明扫描过程确实检查了这对邻居",
        "几何上相邻还不是算法不漏点；下一章把它与三类规则接起来。",
      ),
    ],
  ),
  p(
    "new-neighbors",
    5,
    "第五章：新邻接从哪里来",
    ["stable", "adjacent"],
    [
      t(
        "最初活动顺序为空，没有邻接",
        "邻居不是从扫描开始前就存在的，必须在某个时候形成。",
      ),
      t(
        "无事件时，不能平白产生新邻接",
        "成员和上下顺序都保持不变，因而邻接也不变。",
        ["stable"],
      ),
      t(
        "只需逐类检查开始、结束、交叉的局部变化",
        "先解释几何变化，再说明规则恰好检查了哪些新邻居。",
      ),
    ],
  ),
  p(
    "insert",
    5,
    "开始：只在插入位置产生新邻接",
    ["stable"],
    [
      t(
        "L、H 是插入位置原来的上下邻居",
        "图中顺序始终从下到上；这些字母表示局部对象，不是新坐标。",
      ),
      m(
        "L,H\\ \\longrightarrow\\ L,U,H",
        "新线段 U 插入两者之间；原有线段的相对高低不变。",
      ),
      m("(L,U),\\quad(U,H)", "新的邻接只有 U 的两侧，开始规则正好检查这两对。"),
      t(
        "某侧不存在就跳过；外部邻接保持不变",
        "不把不存在的邻居补出来。开始最多带来两对检查。",
      ),
    ],
    "start",
  ),
  p(
    "remove",
    5,
    "结束：连接原来被隔开的两侧",
    ["stable"],
    [
      m(
        "L,U,H\\ \\longrightarrow\\ L,H",
        "移去结束的 U，其他线段没有在这里开始、结束或交叉。",
      ),
      m("(L,H)", "只有原来被 U 隔开的 L、H 接到一起，结束规则检查这一对。"),
      t(
        "若只剩一侧，就没有新的邻接对",
        "一侧不存在时，移去 U 不会让两条旧成员连接。最多检查一对。",
      ),
    ],
    "end",
  ),
  p(
    "swap-algebra",
    5,
    "交叉时为什么真的交换高低",
    ["affine", "equal", "coefficients", "conditions"],
    [
      m(
        "\\alpha p+\\beta=0\\ \\Longrightarrow\\ \\beta=-\\alpha p",
        "在 p 相交，差为零；两边减去 \\alpha 乘 p，解出 \\beta。",
        ["affine", "equal"],
      ),
      m(
        "d(x)=\\alpha x-\\alpha p=\\alpha(x-p)",
        "代回(5)，再提取共同因子 \\alpha，把与交点的左右关系显露出来。",
        ["affine"],
      ),
      t(
        "\\alpha 不为零，否则两条直线重合",
        "若 \\alpha 为零，\\beta 也为零；两段在交点附近重叠，与条件冲突。",
        ["coefficients", "conditions"],
      ),
      t(
        "x-p 在左右异号，乘固定非零数仍异号",
        "\\alpha 为正时不改正负，为负时同时反转；两侧依然异号，确实换序。",
      ),
    ],
  ),
  p(
    "swap",
    5,
    "交叉：检查交换块的新外侧邻接",
    ["adjacent", "stable"],
    [
      t(
        "L、H 分别是下方和上方的外侧邻居",
        "由(21)，U、V 交叉前相邻；只有这两条在事件处相交。",
        ["adjacent"],
      ),
      m(
        "L,U,V,H\\ \\longrightarrow\\ L,V,U,H",
        "换序后，外面的线段没有开始结束或参与交叉，其顺序不变。",
      ),
      m("(L,V),\\quad(U,H)", "新邻接恰好是交换块的两侧，交叉规则检查它们。"),
      t(
        "U、V 仍是同一输入对；缺少的外侧跳过",
        "两条不同直线至多一个交点，不需要寻找这一对的第二次交叉。",
      ),
    ],
    "swap",
  ),
  p(
    "conditional-check",
    5,
    "过程结论必须带上前提",
    ["stable", "adjacent"],
    [
      ref(
        "checked",
        "三类事件覆盖所有邻接变化；此前事件正确处理时，形成的新邻接一定被检查。",
      ),
      t(
        "不能提前假定所有交点已经处理",
        "否则就用不漏点来证明不漏点，形成循环解释。",
      ),
      t(
        "下一步只借助最早漏点左侧的事件",
        "把过程前提限制在已知正确的范围，才能继续反证。",
      ),
    ],
  ),
  p(
    "earliest",
    5,
    "假设有漏点，为什么选最早一个",
    ["queue"],
    [
      t(
        "漏点：结束后未报告某个真实输入对的交点",
        "暂时假设至少漏掉一个，图只展示这个假设和随后推得的关系。",
      ),
      ref(
        "earliest",
        "漏点有限，可以选横坐标最小者 p_*。星号是对象标记，不是乘法。",
      ),
      t(
        "U_*、V_* 与任意交点的 U、V 分开记",
        "这对输入参与选中的最早漏点；不能偷偷把它当成已经发现。",
      ),
      t(
        "严格位于 p_* 左侧的真实交点都没有漏掉",
        "这正是选最小者的作用。先思考如何用它核对左侧过程。",
        [],
        12,
      ),
    ],
    "missed",
    5,
  ),
  p(
    "prior-events",
    5,
    "只使用最早漏点左侧的正确性",
    ["earliest", "queue", "stable"],
    [
      t(
        "左侧端点不漏：一开始已全部登记",
        "这一点来自清单规则，不依赖交点发现。",
        ["queue"],
      ),
      t(
        "左侧交点不漏：来自最早漏点的选择",
        "逐个看这些事件，不对 p_* 及右侧作任何已处理假设。",
        ["earliest"],
      ),
      t(
        "从空顺序起：开始插入、结束移去、交叉换序",
        "按位置逐次应用三类正确更新，事件之间又由(15)保持顺序。",
        ["stable"],
      ),
      ref("prior", "得到(23)：到 p_* 左侧为止，维护的顺序和真实几何顺序一致。"),
    ],
  ),
  p(
    "last-adjacency",
    5,
    "找到最后一次形成邻接的位置",
    ["earliest", "adjacent", "prior", "checked"],
    [
      t(
        "U_*、V_* 在 p_* 前的一小段必相邻",
        "(21)是独立的几何结论，适用于任意交点，也适用于这个假定漏点。",
        ["adjacent"],
      ),
      t(
        "最初为空；邻接只能在事件处形成",
        "沿有限事件回看，找到形成并一直保持到交点前的最后一次邻接。",
      ),
      m(
        "s<p_*",
        "用 s 表示这次事件的位置。邻接在交叉前已经存在，所以 s 严格在左侧。",
      ),
      ref(
        "formed",
        "由(23)，s 已正确处理；由(22)，在 s 就检查了这对输入，得到(24)。",
        ["prior", "checked"],
      ),
    ],
    "missed",
  ),
  p(
    "valid-future",
    5,
    "检查为什么一定发现这个未来交点",
    ["formed", "earliest", "queue"],
    [
      t(
        "真实交点本来就在 U_*、V_* 两段范围内",
        "求两条直线的公共点，再检查线段范围，这个真实交点不会被排除。",
        ["earliest"],
      ),
      m("p_*>s", "检查发生在 s，而交点在右侧，满足严格位于未来的登记条件。", [
        "formed",
      ]),
      t(
        "尚未登记就加入，已登记则保留同一份",
        "两种情况都保证清单里有这条记录，不依赖此前有没有检查过它。",
        ["queue"],
      ),
    ],
    "missed",
  ),
  p(
    "retain-report",
    5,
    "从登记、保留，一直追到报告",
    ["queue", "formed", "earliest"],
    [
      t(
        "真实未来交点保留到取出",
        "即使对应线段暂时失去邻接，也不删除已经确认的交点记录。",
        ["queue"],
      ),
      t(
        "端点和真实交点有限，同一事件不重复登记",
        "所以左侧待处理记录不会永远耗不完。",
        ["queue"],
      ),
      t(
        "每次取最靠左者，最终必定取到 p_*",
        "不会停在左侧无限循环，也不可能跳过仍在清单里的 p_*。",
        ["queue"],
      ),
      t(
        "到达并报告 U_*、V_*：与漏点假设矛盾",
        "图中的报告是论证推得的结果，不是伪造一段实际执行轨迹。",
        ["earliest"],
      ),
    ],
    "missed",
  ),
  p(
    "no-missing",
    5,
    "第一个漏点不存在，所以没有漏点",
    ["earliest", "formed", "queue"],
    [
      t(
        "检查 → 合法未来点 → 登记或已登记",
        "最后形成邻接时的检查，把几何交点放入清单。",
        ["formed"],
      ),
      t(
        "保留 → 有限清单按序取出 → 报告",
        "记录不消失、左侧任务有限，因此必然报告，与漏点定义冲突。",
        ["queue"],
      ),
      t(
        "若有漏点，就能选最早者；最早者已被排除",
        "因此所有允许输入的交点都不会漏掉。下一章补齐结果和成本边界。",
      ),
    ],
  ),
  p(
    "soundness",
    6,
    "第六章：不多报，也不重复",
    ["conditions", "queue"],
    [
      t(
        "求交和范围检查，只允许真实线段交点登记",
        "所以报告的不是延长线交点，也不是凭图猜出的点，不会多报。",
      ),
      t(
        "同一交叉只登记一份，到达时才报告",
        "发现、登记、报告分开；清单规则避免重复报告同一交叉。",
        ["queue"],
      ),
      t(
        "结果绑定原始无序输入对",
        "U、V 与 V、U 是同一对身份，不能因换序当成新输入对。",
      ),
      t(
        "本章每对至多一个交点，不会再次报告该对",
        "没有重叠；不同直线至多一个交点，同一直线的非空交集也被简化条件限制。",
        ["conditions"],
      ),
    ],
  ),
  p(
    "local-work",
    6,
    "省下的是每次变化后的局部检查",
    [],
    [
      t(
        "开始最多两对；结束最多一对",
        "插入只看两侧，移去只连接原两侧，不存在的邻居跳过。",
      ),
      t(
        "普通交叉最多两对",
        "只检查换序块外侧的新邻接；交叉的一对没有变成另一对。",
      ),
      t(
        "无事件时，活动顺序无需更新",
        "省下的是每次变化都重查所有输入对的工作，不是让所有求交消失。",
      ),
    ],
  ),
  p(
    "cost-boundary",
    6,
    "局部少，不等于总成本固定",
    [],
    [
      t(
        "同一对线段可能再次成为邻居",
        "所以总检查数不固定，也不保证比两两检查的求交次数更少。",
      ),
      t(
        "交点多，必须输出的结果也多",
        "输出数量本身就是工作，不会因为使用邻居规则消失。",
      ),
      t(
        "维护活动顺序和待处理清单也有代价",
        "这里只证明局部检查边界，不扩展成总复杂度证明。",
      ),
    ],
  ),
  p(
    "closing",
    6,
    "回看整条证明链，接向精确判断",
    ["crossing", "stable", "adjacent", "checked"],
    [
      t(
        "高度差变号，得到内部交点",
        "从具体计算出发，经过完整代数推导，得到(14)。",
        ["crossing"],
      ),
      t(
        "无事件不换序，交叉前必相邻",
        "用(14)排除无事件时的换序，再排除夹层假设。",
        ["stable", "adjacent"],
      ),
      t(
        "新邻接被检查，最早漏点产生矛盾",
        "把几何事实接到三类规则与清单保留规则，排除所有漏点。",
        ["checked"],
      ),
      t(
        "下一章：怎样让这些几何判断保持精确",
        "完整一集到这里结束。下一章讨论计算如何忠实实现这些数学判断。",
      ),
    ],
  ),
];
