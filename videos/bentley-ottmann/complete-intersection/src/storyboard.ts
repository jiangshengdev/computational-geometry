import { left } from "../../../shared/math/math-lines.ts";
import type { TeachingGroup } from "../../../shared/math/math-lines";

/** Subtitle master. CI IDs survive later audio production; no measured timings here. */
export type Step = {
  id: string;
  text?: string;
  math?: string;
  captions: string[];
  first: string;
  action: string;
  /** A subtitle may name successive semantic targets; null has no object operation. */
  targets?: (string | null | { phrase: string; target: string }[])[];
  thinkAfter?: number;
};
export type Page = {
  id: string;
  section: number;
  title: string;
  source: string;
  diagram?: string;
  steps: Step[];
  lines: Step[];
  groups: TeachingGroup[];
};
type PageInput = Omit<Page, "lines" | "groups">;
const page = (input: PageInput): Page => ({
  ...input,
  lines: input.steps,
  groups: [left(input.steps.length)],
});

export const pageList: Page[] = [
  page({
    id: "inputs",
    section: 1,
    title: "第一节：先辨认输入",
    source: "第一节：先确定输入是不是一个点",
    diagram: "inputs",
    steps: [
      {
        id: "CI01",
        text: "第三章上集：从任意端点求出完整交集",
        first: "本集目标",
        action: "只呈现当前两份输入，尚不展示完整分类图",
        captions: [
          "第一章留下了从任意端点求出完整交集的问题。",
          "本集把已有结论接成一条判断路径。",
          "这条路径接受点、水平、竖直、端点接触与重叠。",
        ],
      },
      {
        id: "CI02",
        math: "S_1:[A_1,B_1],\\quad S_2:[A_2,B_2]",
        first: "两份原始输入及四个端点",
        action: "先提示第一份，再提示第二份；几何位置固定",
        captions: [
          "取两份不同的原始输入，记作 S₁ 和 S₂。",
          "第一份的端点叫 A₁、B₁，第二份叫 A₂、B₂。",
          "下标区分输入，端点的书写次序不表示方向。",
        ],
        targets: ["s1", "s2", null],
      },
      {
        id: "CI03",
        text: "给定有理数坐标；全程保留精确值",
        first: "精确运算的输入边界",
        action: "标明精确值条件，不展开分数基础",
        captions: [
          "本集针对给定的有理数坐标，计算保留精确值。",
          "分数表示参见《剪切为什么保持交集》末尾。",
          "输入之前若已丢失精度，这里的计算不能找回。",
        ],
      },
    ],
  }),
  page({
    id: "point-gate",
    section: 1,
    title: "先比较端点，再写直线",
    source: "第一节：先确定输入是不是一个点",
    diagram: "point-gate",
    steps: [
      {
        id: "CI04",
        math: "A_i=B_i\\iff x_{A_i}=x_{B_i}\\text{ 且 }y_{A_i}=y_{B_i}",
        first: "端点坐标记号与相等条件",
        action: "完整显示坐标条件；对照重合端点与不同端点，不引入数值案例",
        captions: [
          "字母 x 和 y 分别表示横坐标和纵坐标。",
          "下标 Aᵢ 表示取端点 Aᵢ 的坐标，i 取一或二。",
          "两个端点的横坐标相等、纵坐标也相等，才是同一点。",
          "双向箭头表示左右条件互相等价。",
        ],
        targets: [null, "a", "same", null],
      },
      {
        id: "CI05",
        text: "两份都是点／恰好一份是点／两份都非点",
        first: "第一层分类",
        action: "增加两点、一点一段、两段三组输入示意，不提前展示后续判断",
        captions: [
          "分别检查两份输入，就得到这三类。",
          "每份输入的端点要么相同，要么不同，因此没有遗漏。",
        ],
      },
      {
        id: "CI06",
        text: "只有两个端点不同，才能确定唯一直线",
        first: "直线公式的使用门槛",
        action: "保留分类；示意同一点可经过多条直线，不同两点确定一条",
        captions: [
          "《由两个端点写出直线方程》要求端点不同。",
          "先辨认点输入，才有资格调用后面的直线公式。",
          "重合端点不能确定唯一直线。",
        ],
        targets: ["different", "unique-line", "same"],
      },
    ],
  }),
  page({
    id: "point-point",
    section: 2,
    title: "第二节：点属于哪里",
    source: "第二节：含有点输入时，检查这个点属于哪里",
    diagram: "point-point",
    steps: [
      {
        id: "CI07",
        text: "两份都是点：比较两个位置",
        first: "点与点分支",
        action: "先展示比较任务",
        captions: [
          "先走两份都是点的分支。",
          "此时只需比较这两个点的位置，不必解直线方程。",
        ],
        targets: ["same", "different-2"],
      },
      {
        id: "CI08",
        text: "两坐标分别相等：该点；否则：空",
        first: "点与点分支出口",
        action: "补上两个确定出口",
        captions: [
          "两个坐标分别相等，交集就是这个点。",
          "只要有一个坐标不同，两份输入就没有公共点。",
        ],
        targets: ["point-result", "different-2"],
      },
      {
        id: "CI09",
        math: "T=(x_T,y_T),\\quad E\\ne F",
        first: "恰好一份为点时的统一记号",
        action: "保留点与点对照；下方增加点 T 和另一份线段 EF，依次提示对象",
        captions: [
          "恰好一份为点时，把它叫作 T。",
          "另一份的两个不同端点叫作 E 和 F。",
          "这些名字指向原有输入，没有增加新的输入。",
          "无论点输入原来排第一还是第二，都用同一套检查。",
        ],
        targets: [
          "t",
          [
            { phrase: "两个不同端点", target: "e" },
            { phrase: "E 和 F", target: "f" },
          ],
          null,
          null,
        ],
      },
    ],
  }),
  page({
    id: "collinear-test",
    section: 2,
    title: "点归属的第一关：共线",
    source: "第二节：方向与共线结论",
    steps: [
      {
        id: "CI10",
        text: "用方向与共线专题的判断式检查 T",
        first: "共线判断任务",
        action: "引用已有结论，不重复方向证明",
        captions: [
          "引用《方向与共线》中的判断式。",
          "本次只使用它等于零的分支，不重做方向证明。",
        ],
      },
      {
        id: "CI11",
        math: "\\omega_{EF}(T)=(x_F-x_E)(y_T-y_E)-(y_F-y_E)(x_T-x_E)",
        first: "完整方向式及简写",
        action: "完整公式先显示，再解释两个乘积和相减顺序",
        captions: [
          "先取从 E 到 F 的横坐标差，乘从 E 到 T 的纵坐标差。",
          "再取从 E 到 F 的纵坐标差，乘从 E 到 T 的横坐标差。",
          "用前一个乘积减去后一个乘积，整个差记作 \\omega_{EF}(T)。",
          "括号里的 T 指正在检查的点。",
        ],
      },
      {
        id: "CI12",
        text: "在 E≠F 的前提下：判断式为零才共线",
        first: "共线判定出口",
        action: "引用结论及前提；不重推方向证明",
        captions: [
          "在 E 与 F 不同的条件下，算式为零当且仅当三点共线。",
          "不为零时，点不在这条直线上，交集为空。",
          "为零只通过了第一关，还没有通过线段范围检查。",
        ],
      },
    ],
  }),
  page({
    id: "range",
    section: 2,
    title: "点归属的第二关：闭范围",
    source: "第二节：线段范围结论",
    diagram: "range",
    steps: [
      {
        id: "CI13",
        text: "先确认共线，再选不恒定的坐标",
        first: "范围公式的条件",
        action: "完整显示门槛；用无数值的共线 E、T、F 示意，不代入案例",
        captions: [
          "以下范围检查引用《由两个端点写出直线方程》的结论。",
          "先确认共线，再看端点的横坐标是否不同。",
        ],
        targets: [null, "ef"],
      },
      {
        id: "CI14",
        math: "\\begin{aligned}x_E\\ne x_F:\\quad&\\min(x_E,x_F)\\le x_T,\\\\&x_T\\le\\max(x_E,x_F)\\end{aligned}",
        first: "非竖直范围及 min/max",
        action: "投影到横坐标轴，保留端点实心标记并提示闭范围",
        captions: [
          "横坐标不同时，点的横坐标必须夹在两个端点之间。",
          "min 取较小值，max 取较大值，所以不用猜端点顺序。",
          "两端都包含，小于或等于会保留端点接触。",
        ],
        targets: [
          "x-t",
          "x-range",
          [
            { phrase: "两端都包含", target: "x-e" },
            { phrase: "保留端点接触", target: "x-f" },
          ],
        ],
      },
      {
        id: "CI15",
        math: "\\begin{aligned}x_E=x_F:\\quad&\\min(y_E,y_F)\\le y_T,\\\\&y_T\\le\\max(y_E,y_F)\\end{aligned}",
        first: "竖直输入的范围",
        action: "保留横坐标投影；增加竖直输入及纵坐标投影，对应另一种条件",
        captions: [
          "横坐标相同时，非点线段竖直，就改查纵坐标。",
          "共线与闭范围必须同时通过，交集才是点 T。",
          "任意一关不通过，交集就是空。",
        ],
        targets: ["y-range", "vertical-t", null],
      },
    ],
  }),
  page({
    id: "point-cases",
    section: 2,
    title: "两关各排除什么",
    source: "第二节：共线与范围必须同时通过",
    diagram: "point-cases",
    steps: [
      {
        id: "CI16",
        text: "E=(0,0)，F=(4,0)；T_1=(2,1)",
        first: "局部案例及直线外点",
        action: "显示闭线段、端点及直线外点",
        captions: [
          "用一个局部案例辨认两关的作用。",
          "端点 E 是零、零，端点 F 是四、零。",
          "把这次待查点叫作 T₁，它是二、一，它不在这条水平直线上。",
          "即使横坐标在范围内，也要在共线这一关判空。",
        ],
        targets: [null, "ef", "off", null],
      },
      {
        id: "CI17",
        text: "改查 T_2=(5,0)：共线，但越过端点",
        first: "延长线上的点",
        action: "保留前例，新增并提示延长线点",
        captions: [
          "把第二次待查点叫作 T₂，它是五、零，它在同一条直线上。",
          "但横坐标五超过端点范围，共线仍不足以留下它。",
        ],
        targets: ["outside", "f"],
      },
      {
        id: "CI18",
        text: "改查 T_3=(4,0)：共线且在闭范围内",
        first: "端点接触案例",
        action: "提示端点，保留端点接触结果",
        captions: [
          "把第三次待查点叫作 T₃，它是四、零，它恰好就是端点 F。",
          "共线和闭范围都通过，所以交集是这个点。",
          "这些案例说明每关的作用，一般判定仍依据前面的结论。",
        ],
        targets: ["f", "f", null],
      },
    ],
  }),
  page({
    id: "coefficients",
    section: 3,
    title: "第三节：两条直线是什么关系",
    source: "第三节：端点确定系数的结论",
    steps: [
      {
        id: "CI19",
        math: "A_1\\ne B_1,\\quad A_2\\ne B_2",
        first: "非点分支的当前条件",
        action: "从第一层非点分支进入，不重讲点分支",
        captions: [
          "现在进入两份都不是点的分支。",
          "两个端点分别不同，才可以写出两条所在直线。",
        ],
      },
      {
        id: "CI20",
        math: "a_i=y_{B_i}-y_{A_i},\\quad b_i=x_{A_i}-x_{B_i}",
        first: "由端点取得 aᵢ、bᵢ",
        action: "引用系数取法，保持输入编号一致",
        captions: [
          "沿用《由两个端点写出直线方程》的系数取法。",
          "纵坐标用 Bᵢ 减 Aᵢ，所得的差叫 aᵢ。",
          "横坐标反过来用 Aᵢ 减 Bᵢ，所得的差叫 bᵢ。",
        ],
      },
      {
        id: "CI21",
        math: "c_i=a_i x_{A_i}+b_i y_{A_i},\\quad a_i x+b_i y=c_i",
        first: "cᵢ 与直线方程",
        action: "解释固定系数与可变坐标的区别",
        captions: [
          "用 aᵢ 乘端点 Aᵢ 的横坐标，再加 bᵢ 乘它的纵坐标。",
          "所得的和叫 cᵢ，便得到画面中的直线方程。",
          "每组系数由端点固定下来，x、y 才是线上点的坐标。",
          "每组 aᵢ、bᵢ 不会同时为零；本集直接使用原坐标，不作缩放。",
        ],
      },
    ],
  }),
  page({
    id: "delta",
    section: 3,
    title: "先判断能不能作除法",
    source: "第三节：Δ 的两种情况",
    steps: [
      {
        id: "CI22",
        math: "\\Delta=a_1b_2-a_2b_1",
        first: "Δ 的定义与读法",
        action: "完整显示两个乘积和减法",
        captions: [
          "先算 a₁ 与 b₂ 的乘积，再减去 a₂ 与 b₁ 的乘积。",
          "把所得的差记作 Δ，读作德尔塔。",
        ],
      },
      {
        id: "CI23",
        text: "Δ≠0：唯一交点；Δ=0：平行或重合",
        first: "直线关系分类",
        action: "引用消元专题条件，不重新消元",
        captions: [
          "《整数缩放与交点分母》的消元部分给出这个分类。",
          "德尔塔不为零，两条直线有唯一交点。",
          "德尔塔等于零，两条直线平行或重合，不能除以它。",
        ],
      },
      {
        id: "CI24",
        text: "分类只要求合法直线，不要求整数系数",
        first: "引用结论的适用范围",
        action: "区分公式条件与旧专题分母上界条件",
        captions: [
          "这个分类和求交公式只要求系数对应合法直线。",
          "旧专题的整数条件用于估计分母上界，本集不使用那个界。",
          "有理数输入也可以沿这条路径继续判断。",
        ],
      },
    ],
  }),
  page({
    id: "candidate",
    section: 3,
    title: "分母非零：先得到候选点",
    source: "第三节：分母不为零",
    steps: [
      {
        id: "CI25",
        math: "\\Delta\\ne0,\\quad P=(x_P,y_P)",
        first: "唯一候选点及坐标",
        action: "先给前提和点名",
        captions: [
          "确认德尔塔不为零后，把唯一交点叫作 P。",
          "它的横坐标、纵坐标分别记作 x_P、y_P。",
        ],
      },
      {
        id: "CI26",
        math: "x_P=\\frac{c_1b_2-c_2b_1}{\\Delta}",
        first: "横坐标公式",
        action: "引用已推导公式，讲清分子整体",
        captions: [
          "横坐标直接使用消元专题的公式。",
          "先算 c₁ 与 b₂ 的乘积，再减去 c₂ 与 b₁ 的乘积。",
          "把整个差除以非零的德尔塔，得到横坐标。",
        ],
      },
      {
        id: "CI27",
        math: "y_P=\\frac{a_1c_2-a_2c_1}{\\Delta}",
        first: "纵坐标公式",
        action: "保持横坐标行，显示纵坐标行",
        captions: [
          "纵坐标的分子先算 a₁ 与 c₂ 的乘积。",
          "再减去 a₂ 与 c₁ 的乘积，整个差除以德尔塔。",
          "公式保证 P 在两条直线上，还没有保证在线段范围内。",
        ],
      },
    ],
  }),
  page({
    id: "candidate-range",
    section: 3,
    title: "候选点必须通过两份范围",
    source: "第三节：唯一交点的必要充分论证",
    diagram: "candidate-range",
    steps: [
      {
        id: "CI28",
        text: "对 S₁、S₂ 分别使用闭范围检查",
        first: "把第二节的归属检查接到候选点",
        action: "实线输入、虚线所在直线与唯一候选 P；依次检查两份范围",
        captions: [
          "仍用第二节的范围检查，只是待查点换成算出的 P。",
          "每份不竖直的输入查横坐标，竖直的输入查纵坐标。",
          "公式已经保证共线，但两份闭范围都必须通过。",
        ],
        targets: [
          "p-0",
          [
            { phrase: "不竖直的输入", target: "s1-0" },
            { phrase: "竖直的输入", target: "s2-0" },
          ],
          "p-0",
        ],
      },
      {
        id: "CI29",
        text: "任意一份排除 P，就没有其他候选点",
        first: "判空为什么足够",
        action: "保留一般论证；下方对照 P 被一份范围排除，其他几何位置不移动",
        captions: [
          "如果两条线段有公共点，它也必须在两条所在直线上。",
          "两条直线只有 P 这一个公共点。",
          "若某条线段已排除 P，就不可能在别处找到另一个公共点。",
        ],
        targets: ["line-1-1", "p-1", "end-1"],
      },
      {
        id: "CI30",
        text: "两份都通过：交集恰好为点 P",
        first: "反向充分性",
        action:
          "补齐两个方向，保留此前论证；返回两份都包含 P 的上方示意并标出结果",
        captions: [
          "反过来，两份范围都通过，P 就同时属于两条线段。",
          "因此交集恰好是它；范围包含端点，所以接触也保留。",
        ],
        targets: ["p-0", "p-0"],
      },
    ],
  }),
  page({
    id: "axis-case",
    section: 3,
    title: "水平与竖直也沿同一条路径",
    source: "第三节：水平和竖直不被排除",
    diagram: "axis-case",
    steps: [
      {
        id: "CI31",
        text: "S₁：(0,0) 到 (4,0)；S₂：(2,−1) 到 (2,1)",
        first: "水平与竖直的局部案例",
        action: "按两份输入依次描亮，坐标等比例",
        captions: [
          "用水平和竖直输入核对这条路径。",
          "第一份从零、零到四、零。",
          "第二份从二、负一到二、一。",
        ],
        targets: [null, "s1", "s2"],
      },
      {
        id: "CI32",
        text: "第一组：(a₁,b₁,c₁)=(0,−4,0)；第二组：(a₂,b₂,c₂)=(2,0,4)",
        first: "案例系数",
        action: "将两组系数对应到输入",
        captions: [
          "第一份的 a₁ 为零，b₁ 为负四，c₁ 为零。",
          "第二份的 a₂ 为二，b₂ 为零，c₂ 为四。",
          "竖直输入使自己的 b 系数为零，却不一定使德尔塔为零。",
        ],
        targets: ["s1", "s2", null],
      },
      {
        id: "CI33",
        math: "\\Delta=8,\\quad P=(2,0)",
        first: "案例候选点及范围结果",
        action: "点结果仅在此步出现",
        captions: [
          "两乘积相减得到德尔塔等于八，可以用唯一交点公式。",
          "公式给出点二、零。",
          "横坐标二在零到四之间，纵坐标零在负一到一之间。",
          "两份范围都通过，所以交集是这个点。",
        ],
        targets: [null, "p", "p", "p"],
      },
    ],
  }),
  page({
    id: "outside-candidate",
    section: 3,
    title: "直线相交，线段仍可能不相交",
    source: "第三节：候选点的范围检查",
    diagram: "outside-candidate",
    steps: [
      {
        id: "CI34",
        text: "S₁：(0,0) 到 (4,0)；S₂：(5,−1) 到 (5,1)",
        first: "延长线候选案例",
        action: "只显示输入；之后才显示候选",
        captions: [
          "保留第一份水平输入，另取横坐标为五的竖直输入。",
          "竖直输入的纵坐标仍从负一到一。",
        ],
        targets: ["s1", "s2"],
      },
      {
        id: "CI35",
        math: "P=(5,0),\\quad 5>4",
        first: "被第一份范围排除的候选",
        action: "提示候选，再提示排除它的右端点",
        captions: [
          "两条所在直线的唯一交点是五、零。",
          "它在竖直输入的范围内，却超过第一份的右端点。",
          "一份不通过就必须判空，不能只检查其中一份。",
        ],
        targets: ["p", "b1", null],
      },
    ],
  }),
  page({
    id: "zero-delta",
    section: 3,
    title: "分母为零：先停止除法",
    source: "第三节：分母等于零",
    diagram: "zero-delta",
    steps: [
      {
        id: "CI36",
        math: "\\Delta=0",
        first: "零分母分支",
        action: "重申当前分支条件",
        captions: [
          "接着处理德尔塔等于零的分支。",
          "不再使用唯一交点分式，改为区分平行与共线。",
        ],
        targets: [null, "second-0"],
      },
      {
        id: "CI37",
        math: "a_1x_{A_2}+b_1y_{A_2}\\stackrel{?}{=}c_1",
        first: "单端点代入检查",
        action: "用原端点 A₂ 检查第一条直线",
        captions: [
          "取第二份输入的原端点 A₂，代入第一条直线。",
          "先算 a₁ 乘它的横坐标，再加 b₁ 乘它的纵坐标。",
          "检查所得的和是否等于 c₁。",
        ],
        targets: ["a2-1", "a2-1", "a2-0"],
      },
      {
        id: "CI38",
        text: "不成立：不同平行线；成立：同一直线",
        first: "代入结果的两个出口",
        action: "解释为何只需一个端点",
        captions: [
          "德尔塔为零已把关系限定为平行或重合。",
          "端点本来在第二条线上，若也在第一条上，就排除了不同平行线。",
          "等式成立便共线，不成立则平行，线段交集为空。",
        ],
        targets: [
          "second-0",
          "a2-1",
          [
            { phrase: "成立便共线", target: "second-1" },
            { phrase: "不成立则平行", target: "second-0" },
          ],
        ],
      },
      {
        id: "CI39",
        text: "一个公共点不能单独证明两条直线重合",
        first: "不能省略的前提",
        action:
          "保留 Δ=0 的两种关系；下方新增 Δ≠0 共享端点反例，明确不能丢掉前提",
        captions: [
          "这里不能省略德尔塔等于零的前提。",
          "两条有唯一交点的直线也可能共享一个端点。",
          "因此仅凭一个点在线上，不能断定两条直线重合。",
        ],
        targets: [null, "shared-endpoint", "cross-second"],
      },
    ],
  }),
  page({
    id: "parallel",
    section: 3,
    title: "平行分支怎样落到空",
    source: "第三节：不同平行线",
    diagram: "parallel",
    steps: [
      {
        id: "CI40",
        text: "S₁：(0,0) 到 (4,0)；S₂：(0,1) 到 (4,1)",
        first: "不同平行线案例",
        action: "依次提示两份平行输入",
        captions: [
          "看两条水平输入，第一份纵坐标为零。",
          "第二份纵坐标为一，两份横坐标范围都是零到四。",
        ],
        targets: ["s1", "s2"],
      },
      {
        id: "CI41",
        text: "Δ=0；A₂=(0,1) 不满足第一条方程",
        first: "平行案例的判断结果",
        action: "提示代入端点，不把范围相同当作重叠",
        captions: [
          "两组 a 系数都是零，所以德尔塔为零。",
          "端点零、一不在第一条直线上，代入等式不成立。",
          "两线不同且平行，交集为空。",
          "横坐标范围相同也没有用，必须先确认共线。",
        ],
        targets: [null, "a2", null, null],
      },
    ],
  }),
  page({
    id: "overlap-rule",
    section: 4,
    title: "第四节：共线时留下什么",
    source: "第四节：从原端点选出完整区间",
    steps: [
      {
        id: "CI42",
        text: "两份均非点，且已经确认共线",
        first: "共线分支前提",
        action: "明确只在共同直线上比较范围",
        captions: [
          "现在两份都有长度，并且已经确认所在直线相同。",
          "才可以引用第一章完整区间的端点选取结论。",
        ],
      },
      {
        id: "CI43",
        text: "不竖直按横坐标；竖直按纵坐标",
        first: "共同顺序的选取",
        action: "引用排序结论，不重做区间证明",
        captions: [
          "共同直线不竖直时按横坐标排序，竖直时按纵坐标排序。",
          "每条输入先认出较前端点与较后端点。",
          "沿同一条直线，所选坐标相等就表示同一点。",
        ],
      },
      {
        id: "CI44",
        text: "L：较前端点中更靠后者",
        first: "公共部分的前边界",
        action: "给出 L 的选取含义",
        captions: [
          "在两份较前端点中，选更靠后的一个，叫作 L。",
          "这个边界来自原端点，不需要再解零分母方程。",
        ],
      },
      {
        id: "CI45",
        text: "R：较后端点中更靠前者",
        first: "公共部分的后边界",
        action: "给出 R 的选取含义，保留 L",
        captions: [
          "在两份较后端点中，选更靠前的一个，叫作 R。",
          "第一章已证明完整公共部分受这两个边界限制。",
          "本集新增的是先确认共线，再把这项结论接入判断路径。",
        ],
      },
    ],
  }),
  page({
    id: "select-bounds",
    section: 4,
    title: "先比较候选，再命名边界",
    source: "第四节：L、R 的选择",
    diagram: "select-bounds",
    steps: [
      {
        id: "CI46",
        text: "S₁：(0,0) 到 (4,0)；S₂：(2,0) 到 (6,0)",
        first: "共线案例",
        action: "先显示两份输入，未选出结果",
        captions: [
          "局部案例用两份水平输入，它们都在横轴上。",
          "第一份从零到四，第二份从二到六，纵坐标都为零。",
        ],
        targets: ["s1", "s2"],
      },
      {
        id: "CI47",
        math: "L=(2,0)",
        first: "选中的 L",
        action: "依次提示两个较前端点，再突出选中者并命名 L",
        captions: [
          "先看第一份较前的端点零、零。",
          "再看第二份较前的端点二、零。",
          "较靠后的是二、零，选它作为 L。",
        ],
        targets: ["a1", "a2", "l"],
      },
      {
        id: "CI48",
        math: "R=(4,0)",
        first: "选中的 R",
        action: "依次提示两个较后端点，再突出选中者并命名 R",
        captions: [
          "再看第一份较后的端点四、零。",
          "再看第二份较后的端点六、零。",
          "较靠前的是四、零，选它作为 R。",
        ],
        targets: ["b1", "b2", "r"],
      },
      {
        id: "CI49",
        text: "L 在 R 前：保留从 L 到 R 的完整闭区间",
        first: "案例完整区间结果",
        action: "最后描亮完整公共区间，不只圈两端",
        captions: [
          "L 在 R 前面，所以保留从二、零到四、零的完整闭区间。",
          "两个端点用来描述整段，中间的点也全部保留。",
        ],
        targets: ["result", "result"],
      },
    ],
  }),
  page({
    id: "three-outcomes",
    section: 4,
    title: "比较边界的三种结果",
    source: "第四节：共线分支三种关系",
    diagram: "three-outcomes",
    steps: [
      {
        id: "CI50",
        text: "L 在 R 后：交集为空",
        first: "逆序边界的结果",
        action: "沿共同直线显示不早于 L 与不晚于 R 的范围；逆序时中间留空",
        captions: [
          "一般地，若 L 在 R 后面，交集为空。",
          "公共点不可能既不早于 L，又不晚于 R。",
        ],
        targets: [
          "l-0",
          [
            { phrase: "不早于 L", target: "lower-0" },
            { phrase: "不晚于 R", target: "upper-0" },
          ],
        ],
      },
      {
        id: "CI51",
        text: "L 与 R 同点：交集为点 L",
        first: "相等边界的结果",
        action: "保留逆序行，增加 L=R 行并突出唯一共同点",
        captions: [
          "若 L 与 R 是同一点，闭范围仍保留这个共同端点。",
          "此时交集是点 L，不是非零长度区间。",
        ],
        targets: ["touch", "touch"],
      },
      {
        id: "CI52",
        text: "L 在 R 前：完整非零长度闭区间",
        first: "正序边界结果",
        action: "保留前两行，增加正序行；描亮含两端的完整闭区间，不重做证明",
        captions: [
          "若 L 在 R 前面，就得到两端及中间全部点。",
          "这正是第一章已经证明的完整区间结论。",
          "前、同点、后三种关系都已得到确定结果。",
        ],
        targets: ["interval", null, null],
      },
    ],
  }),
  page({
    id: "vertical-bounds",
    section: 4,
    title: "竖直、反向和完全重合",
    source: "第四节：边界选取的适用范围",
    diagram: "vertical-bounds",
    steps: [
      {
        id: "CI53",
        text: "S₁：(2,3) 到 (2,0)；S₂：(2,1) 到 (2,3)",
        first: "竖直且反向书写的案例",
        action: "按输入书写顺序提示两端；几何不移动",
        captions: [
          "再看竖直输入，横坐标都为二。",
          "第一份从二、三写到二、零，端点顺序向下。",
          "第二份从二、一写到二、三。",
          "这里按纵坐标从小到大比较，不按书写顺序。",
        ],
        targets: [null, "s1", "s2", null],
      },
      {
        id: "CI54",
        math: "L=(2,1),\\quad R=(2,3)",
        first: "竖直案例的完整边界",
        action: "比较两个较前候选，再比较较后候选，最后描亮整段",
        captions: [
          "较前端点的纵坐标是零和一，选更靠后的一，得到 L。",
          "较后端点的纵坐标都是三，得到同一个位置 R。",
          "因此完整交集从二、一到二、三，包含两端。",
        ],
        targets: [
          [
            { phrase: "零", target: "b1" },
            { phrase: "一", target: "a2" },
            { phrase: "选更靠后的一", target: "l" },
          ],
          [
            { phrase: "纵坐标都是三", target: "a1" },
            { phrase: "得到同一个位置", target: "r" },
          ],
          "result",
        ],
      },
      {
        id: "CI55",
        text: "完全重合选出整段；其他输入不把结果拆碎",
        first: "结果完整性的复用边界",
        action: "引用第一章结论，不加入第三线新算例",
        captions: [
          "完全重合时会选出整条共同线段，反写端点不改变结果。",
          "第一章的结果契约继续有效：其他输入穿过，不拆碎这一对的区间。",
          "本集只求两份输入的完整交集，没有展开复杂输入的扫描机制。",
        ],
      },
    ],
  }),
  page({
    id: "exhaustive",
    section: 5,
    title: "第五节：为什么没有遗漏",
    source: "第五节：分类穷尽",
    steps: [
      {
        id: "CI56",
        text: "第一层：端点相同或不同",
        first: "分类穷尽的第一层理由",
        action: "按已讲顺序重新连接分支",
        captions: [
          "现在核对整条路径为什么没有遗漏。",
          "每份输入的端点要么相同，要么不同。",
          "因此两点、一点一段、两段这三类覆盖全部输入。",
        ],
      },
      {
        id: "CI57",
        text: "两份非点：Δ 为零或非零",
        first: "第二层穷尽理由",
        action: "只沿非点分支继续展开",
        captions: [
          "两份非点时，德尔塔要么为零，要么不为零。",
          "不为零，唯一候选点再接受两份闭范围检查。",
          "为零，代入等式要么成立，要么不成立。",
        ],
      },
      {
        id: "CI58",
        text: "共线边界：前、同点、后；每条路径都有出口",
        first: "最后一层穷尽及结果范围",
        action: "最后一层连接到三个结果类别",
        captions: [
          "共线后，L 与 R 的顺序只有前、同点、后三种。",
          "所以每条路径最终都落到空、点或完整非零长度区间。",
          "没有任何情况被留在一个除以零的分式里。",
        ],
      },
    ],
  }),
  page({
    id: "whole-path",
    section: 5,
    title: "完整判断路径",
    source: "第五节：完整路径表",
    diagram: "whole-path",
    steps: [
      {
        id: "CI59",
        text: "先走点分支：比较位置，或共线且在闭范围内",
        first: "完整路径图中的点分支连接",
        action: "此前各节点已讲清；首次将其汇到同一张路径图",
        captions: [
          "把已经讲过的分支汇到同一张图。",
          "两份都是点就比较位置；恰好一份为点就查共线和闭范围。",
          "条件满足留下那个点，否则为空。",
        ],
      },
      {
        id: "CI60",
        text: "再走两段分支：非零求候选，零则区分平行与共线",
        first: "完整路径图的直线分支连接",
        action: "逐步补齐非点子树，完整图不在开场出现",
        captions: [
          "两份非点时看德尔塔。",
          "非零就求候选点，检查两份闭范围。",
          "为零则用端点代入，不成立判空，成立进入共线分支。",
        ],
      },
      {
        id: "CI61",
        text: "共线再选 L、R：空、点或完整区间",
        first: "完整路径图最后出口",
        action: "最后补齐边界分支；留观察窗口，保持图与字幕",
        captions: [
          "共线时从原端点选出 L、R，比较顺序得到三个出口。",
          "现在可以从任意四个给定端点，沿图走到完整交集。",
          "请沿一条路径检查，每个公式前是否都已满足条件。",
        ],
        thinkAfter: 4,
      },
    ],
  }),
  page({
    id: "identity",
    section: 5,
    title: "完整交集仍属于原始输入对",
    source: "第五节：原始无序输入对身份",
    steps: [
      {
        id: "CI62",
        math: "\\{S_1,S_2\\}\\longmapsto\\text{点或完整非零长度区间}",
        first: "求交结果的身份绑定",
        action: "将结果重新连回开场原始输入对",
        captions: [
          "非空结果继续绑定开场选出的原始无序输入对。",
          "交换两份输入不会产生新的一对，位置相同也不取消输入身份。",
          "空交集不产生结果记录。",
        ],
      },
      {
        id: "CI63",
        text: "这是组织数学判断的路径，不是算法调用顺序",
        first: "教学路径的解释边界",
        action: "明确课程范围，不讲代码",
        captions: [
          "这张图是一种组织数学判断的教学途径。",
          "它不冒充实际算法函数的调用次序，也没有讲完复杂扫描。",
        ],
      },
      {
        id: "CI64",
        text: "下集：让精确结果支撑扫描判断",
        first: "下集联系预告",
        action: "只预告联系，不引入下集公式或完整扫描",
        captions: [
          "有了完整交集，下集再看它如何支撑扫描中的判断。",
          "比较、登记和顺序维护还必须沿用同一份精确值。",
        ],
      },
    ],
  }),
];
export const pages = Object.fromEntries(pageList.map((p) => [p.id, p]));
export const shots = pageList.flatMap((p) =>
  p.steps.map((step, index) => ({
    ...step,
    page: p.id,
    section: p.section,
    visibleStep: index + 1,
    source: p.source,
    retained: p.steps.slice(0, index + 1).map((s) => s.id),
  })),
);
