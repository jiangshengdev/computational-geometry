import { left } from "../../../shared/math/math-lines.ts";
import type { Input } from "./example.ts";
export type Phase = "read" | "report" | "update" | "check";
export type View =
  | "geometry"
  | "shear"
  | "coverage"
  | "ledger"
  | "results"
  | "initial";
export type Step = {
  math?: boolean;
  id: string;
  text: string;
  captions: string[];
  event?: number;
  phase?: Phase;
  reported?: number;
  view?: View;
  focus?: string;
  inputs?: Input[];
  candidate?: "P" | "Q" | "R";
  action?:
    | "introduce"
    | "shear"
    | "swap"
    | "coverage"
    | "candidate"
    | "report"
    | "queue"
    | "remove"
    | "restore";
};
type Page = {
  id: string;
  title: string;
  basis: string;
  source: string;
  reference: string;
  steps: Step[];
};
const step = (
  id: string,
  text: string,
  captions: string[],
  extra: Omit<Step, "id" | "text" | "captions"> = {},
): Step => ({ id, text, captions, ...extra });
export const pageList: Page[] = [
  {
    id: "inputs-ab",
    title: "第一节：七份输入，一次连续扫描",
    basis: "",
    source: "文章第一节",
    reference: "VS01–VS04：介绍原始身份；本集新增七输入，不重讲输入定义。",
    steps: [
      step(
        "CS01",
        "第八章：把所有规则放回一次扫描",
        [
          "这一集把前七章的规则，接到同一份状态和清单上。",
          "从输入出发，走到扫描结束，再核对完整结果。",
        ],
        { inputs: [] },
      ),
      step(
        "CS02",
        "A：(0,0) 到 (2,0)",
        [
          "先看蓝色输入 A，从原点到点 (2,0)。",
          "原坐标图横纵每格都是一个单位，O 表示原点。",
        ],
        { inputs: ["A"], focus: "A", action: "introduce" },
      ),
      step(
        "CS03",
        "B：(1,0) 到 (4,0)",
        [
          "橙色输入 B 从点 (1,0) 到点 (4,0)。",
          "蓝色虚线只为辨认重叠身份，两份都保留真实位置。",
        ],
        { inputs: ["A", "B"], focus: "B", action: "introduce" },
      ),
      step(
        "CS04",
        "C：(6,0) 到 (8,0)",
        [
          "紫色输入 C 也在高度零，从点 (6,0) 到点 (8,0)。",
          "它与前两份之间留有空隙，不能提前补上。",
        ],
        { inputs: ["A", "B", "C"], focus: "C", action: "introduce" },
      ),
    ],
  },
  {
    id: "inputs-rest",
    title: "两条斜线、一条竖线与点输入",
    basis: "已介绍：A、B、C 都位于 y=0；每份保持原始身份",
    source: "文章第一节输入表",
    reference: "VS02–VS04、VS57–VS58：点身份菱形；本例保持文章对象色。",
    steps: [
      step(
        "CS05",
        "D：(-1,4) 到 (7,-4)；y=3-x",
        [
          "绿色输入 D 从点 (-1,4) 到点 (7,-4)。",
          "所在直线是 y=3-x，这里的字母 D 始终是输入名。",
        ],
        { inputs: ["A", "B", "C", "D"], focus: "D", action: "introduce" },
      ),
      step(
        "CS06",
        "V：(3,-1) 到 (3,2)；x=3",
        [
          "红色输入 V 的 x 坐标固定为三。",
          "下端高度负一，上端高度二，两端都包含。",
        ],
        { inputs: ["A", "B", "C", "D", "V"], focus: "V", action: "introduce" },
      ),
      step(
        "CS07",
        "H：(2,3) 到 (7,-2)；y=5-x",
        [
          "青色输入 H 从点 (2,3) 到点 (7,-2)。",
          "它与绿色所在直线平行，但不是同一条直线。",
        ],
        {
          inputs: ["A", "B", "C", "D", "V", "H"],
          focus: "H",
          action: "introduce",
        },
      ),
      step(
        "CS08",
        "Z：(3,2)；两端重合",
        [
          "粉色菱形的中心标出点输入 Z，位置为 (3,2)。",
          "它就在红色上端，菱形不表示面积，也没有挪动这个点。",
        ],
        { focus: "Z", action: "introduce" },
      ),
    ],
  },
  {
    id: "coefficient",
    title: "本例的精确系数",
    basis: "剪切专题已证：s=\\frac{1}{256(M+1)^5}；公共分母取正整数",
    source: "文章第一节系数",
    reference: "VS10–VS12；只代入新的 M=8，不重复安全界证明。",
    steps: [
      step(
        "CS09",
        "端点均为整数：公共分母为 1，M=8",
        [
          "本例的端点坐标都是整数，公共分母取一。",
          "端点坐标绝对值的最大值是八，所以 M=8。",
        ],
        { focus: "M=8" },
      ),
      step("CS10", "s=\\frac{1}{256\\times9^5}", [
        "直接代入剪切专题已经证明的安全系数。",
        "八加一为九，得到分母二百五十六乘九的五次方。",
      ]),
      step(
        "CS11",
        "s=\\frac{1}{15116544}",
        [
          "九的五次方为五万九千零四十九。",
          "乘以二百五十六，得到分母一千五百一十一万六千五百四十四。",
          "后面的 s 始终是这个精确分数，不换成小数。",
        ],
        { math: true, focus: "s" },
      ),
    ],
  },
  {
    id: "shear",
    title: "原图、放大示意与实际计算",
    basis: "第七章《用剪切处理竖直线段》：统一使用 x'=x+sy，y'=y",
    source: "文章第一节剪切对应",
    reference: "VS07–VS09、VS13–VS18：保留原坐标与示意区分；本例 s_vis=1/8。",
    steps: [
      step(
        "CS12",
        "V 的实际端点：(3-s,-1)、(3+2s,2)",
        [
          "所有输入使用同一个系数。",
          "红色下端的新 x 坐标为三减系数，上端为三加两倍系数。",
          "上端减下端为 3s>0，所以它不再竖直。",
        ],
        { focus: "V" },
      ),
      step(
        "CS13",
        "放大示意：s_{\\mathrm{vis}}=1/8",
        [
          "现在只为看清对应关系，显示八分之一系数的放大示意。",
          "这幅示意不参与任何范围、顺序或候选计算。",
        ],
        { view: "shear", action: "shear" },
      ),
      step("CS14", "实际 x 坐标：3-s<3<3+2s", [
        "原图中同列的三个位置，高度分别是负一、零、二。",
        "实际变换后，它们的 x 坐标依次是三减系数、三、三加两倍系数。",
        "所以不能把它们称为扫描坐标中的同列事件。",
      ]),
    ],
  },
  {
    id: "groups",
    title: "第二节：准备组、范围与清单",
    basis: "第五章：固定同线归属与当前活动成员分别维护",
    source: "文章第二节",
    reference: "OR07–OR08、OD03–OD14；只承接组与覆盖定义，新增本例记号。",
    steps: [
      step("CS15", "G 的固定归属：A、B、C；直线 y'=0", [
        "三份水平输入归到同一个固定同线组 G。",
        "组名不变，但活动成员随开始和结束变化。",
        "组内不编造高低；其余非零输入各自独占一个组。",
      ]),
      step(
        "CS16",
        "G[A,B] 表示当前成员；R_G 表示最远右端",
        [
          "方括号列出当前成员，不是把输入合成一个身份。",
          "组的最远右端记为 R_G，只能取已开始的活动成员。",
        ],
        { focus: "当前成员" },
      ),
      step(
        "CS17",
        "P=(3,0)，Q=(3,2)，R=(5,0)",
        [
          "后面把三线相遇的原位置记为 P，上端公共位置记为 Q。",
          "水平直线与青色直线的候选记为 R，原坐标是 (5,0)。",
          "候选点 R 与最远右端 R_G 是不同对象。",
        ],
        { candidate: "R" },
      ),
    ],
  },
  {
    id: "equations-d",
    title: "扫描直线必须使用新坐标",
    basis: "第七章：x=x'-sy'，y=y'；实际 0<s<1",
    source: "文章第二节直线表推导",
    reference: "VS22–VS25：新坐标高度与闭范围；新增 D、H 的代入。",
    steps: [
      step(
        "CS18",
        "D:y'=3-(x'-sy')",
        [
          "把逆变换代入绿色直线的原方程。",
          "新高度等于三减去括号中的原 x 坐标。",
        ],
        { math: true, focus: "D" },
      ),
      step("CS19", "(1-s)y'=3-x'", [
        "右侧展开后有一项 s 乘新高度。",
        "将这一项移到左边，得到一减系数乘新高度。",
      ]),
      step(
        "CS20",
        "D:y'=\\frac{3-x'}{1-s},\\quad x'\\in[-1+4s,7-4s]",
        [
          "因为一减系数为正，可以除以它。",
          "绿色输入的新 x 坐标闭范围是 [-1+4s,7-4s]。",
        ],
        { math: true, focus: "D" },
      ),
      step(
        "CS21",
        "H:y'=\\frac{5-x'}{1-s},\\quad x'\\in[2+3s,7-2s]",
        [
          "青色直线作同样代入，只把常数三换成五。",
          "它的闭范围是 [2+3s,7-2s]，高度始终比绿色高。",
        ],
        { math: true, focus: "H" },
      ),
    ],
  },
  {
    id: "equations-v",
    title: "竖直输入也有新的高度与范围",
    basis: "x'=x+sy，y'=y；实际 s=1/15116544>0",
    source: "文章第二节直线表",
    reference: "VS22–VS25：引用变换，不重复竖直障碍。",
    steps: [
      step(
        "CS22",
        "V:x'=3+sy'",
        [
          "红色输入原来的 x 坐标为三。",
          "代入统一变换，新 x 坐标就是三加系数乘新高度。",
        ],
        { math: true, focus: "V" },
      ),
      step(
        "CS23",
        "V:y'=\\frac{x'-3}{s},\\quad x'\\in[3-s,3+2s]",
        [
          "两边减三，再除以正数 s，得到扫描所用的高度。",
          "实际闭范围是 [3-s,3+2s]。",
        ],
        { math: true, focus: "V" },
      ),
      step("CS24", "G：y'=0；A:[0,2]，B:[1,4]，C:[6,8]", [
        "水平输入高度零，变换不改变它们的 x 坐标。",
        "这三个范围是原始成员的范围，当前覆盖仍只取活动成员。",
      ]),
    ],
  },
  {
    id: "endpoint-names",
    title: "头尾按扫描先后命名",
    basis: "统一变换 x′=x+sy，y′=y；实际 s>0",
    source: "文章第一节输入表及第二节初始化；本版补充端点身份对应",
    reference: "沿用原输入与精确剪切，头尾仅是本片明确约定的扫描角色。",
    steps: [
      step(
        "CS24a",
        "头：先遇到、开始；尾：后遇到、结束",
        [
          "把开头给定的每条线段的两个端点，代入同一个剪切变换。",
          "本片把新x 坐标较小、扫描先遇到的一端叫头，较大、后遇到的一端叫尾。",
          "标签使用线段原来的颜色，并保留输入字母。",
        ],
        { view: "initial" },
      ),
      step(
        "CS24b",
        "V头：(3-s,-1)；V尾：(3+2s,2)",
        [
          "红色两端的新x 坐标相差三倍正系数，所以较低的原端点是头，较高的是尾。",
          "点输入 Z 恰好在红色尾端。它自己没有两个不同端点，始终标为粉色的 Z 点。",
        ],
        { view: "initial" },
      ),
    ],
  },
  {
    id: "initial",
    title: "初始化：十二个位置，尚无结果",
    basis: "第二章清单规则：端点预先登记；同位置合并，原始身份保留",
    source: "文章第二节初始化",
    reference: "SP18–SP20、SC14；新增十二端点位置与后续唯一新增点。",
    steps: [
      step(
        "CS25",
        "V尾＋Z点：同一位置，保留两种身份",
        [
          "六条线段各提供头尾两个端点，共十二个不同位置。",
          "点输入 Z 就在红色尾端，合为同一个位置，红色尾端与粉色点输入的身份都保留。",
          "所以加入 Z 后仍是十二个位置；表中逐行对应原端点和扫描坐标。",
        ],
        { view: "initial" },
      ),
      step(
        "CS26",
        "初始清单：12 个位置；活动顺序、结果均为空",
        [
          "合并后共十二个位置，活动顺序和结果都为空。",
          "表中按新x 坐标从上到下排列；交点 P 尚未发现，不在其中。",
        ],
        { action: "queue", view: "initial" },
      ),
      step(
        "CS27",
        "P' 尚未登记；R' 也不在清单中",
        [
          "三线相遇的位置没有输入端点，要在扫描中发现。",
          "空隙候选也不是预先已知的事件。",
          "后面每次按实际扫描坐标取最小的未处理位置。",
        ],
        { view: "initial" },
      ),
    ],
  },
  {
    id: "e1",
    title: "第三节：覆盖延长怎样触发发现",
    basis: "当前坐标：(-1,4) → (-1+4s,4)；读取、报告、更新、检查",
    source: "文章第三节 E1",
    reference: "VS26：开始事件；新增本例 E1。",
    steps: [
      step(
        "CS28",
        "D头：D 开始；无旧参与者",
        [
          "先到绿色输入的开始位置，旧活动顺序为空。",
          "只有一份身份，没有输入对可以报告。",
        ],
        { event: 1, phase: "read" },
      ),
      step(
        "CS29",
        "加入 D；没有邻居可查",
        [
          "把绿色输入加入顺序，没有第二个组。",
          "因此没有候选可查，结果仍为空，清单剩十一项。",
        ],
        { event: 1, phase: "update" },
      ),
      step(
        "CS30",
        "处理后：D；结果 0，剩余 11",
        ["事件表记下处理后的状态，再继续取下一项。"],
        { event: 1, phase: "check", view: "ledger" },
      ),
    ],
  },
  {
    id: "e2",
    title: "A头：有延长线交点，还不能预约",
    basis: "D：y'=(3-x')/(1-s)；G：y'=0；0<s<1",
    source: "文章第三节 E2",
    reference: "OD18、VS29–VS31：覆盖与未来分别检查；新增本例 P'。",
    steps: [
      step(
        "CS31",
        "A 开始；D 高度 3/(1-s)>0",
        [
          "来到原点，开始者是蓝色输入。",
          "绿色在这里的高度为正，不参加这次事件，所以没有新结果。",
        ],
        { event: 2, phase: "read" },
      ),
      step(
        "CS32",
        "加入 G[A]，在 D 下方；R_G=2",
        [
          "把只有蓝色成员的水平组放在绿色下方。",
          "当前最远右端为二，尚未开始的橙色成员不能提供覆盖。",
        ],
        { event: 2, phase: "update" },
      ),
      step(
        "CS33",
        "令 y'=0：0=3-x'，得到 P'=(3,0)",
        [
          "新邻居是水平组与绿色组。",
          "令绿色直线的高度为零，得到候选 x 坐标为三。",
        ],
        { event: 2, phase: "check", candidate: "P", action: "candidate" },
      ),
      step(
        "CS34",
        "3>R_G=2：拒绝；清单剩 10 项",
        [
          "候选在未来，绿色也覆盖它。",
          "但三超过当前水平覆盖的右端二，所以不预约。",
        ],
        {
          event: 2,
          phase: "check",
          candidate: "P",
          view: "coverage",
          focus: "拒绝",
        },
      ),
    ],
  },
  {
    id: "e3-report",
    title: "B头：先报告完整区间",
    basis: "第五章《完整结果怎样只报告一次》：新成员加入前，与当前同组成员配对",
    source: "文章第三节 E3 报告",
    reference: "OR10–OR11、OD19；不重证报告一次性。",
    steps: [
      step(
        "CS35",
        "(1,0)：A 穿过，B 开始",
        [
          "来到点 (1,0)，蓝色仍在，橙色从这里开始。",
          "先读取这两份原始身份，再更新成员。",
        ],
        { event: 3, phase: "read" },
      ),
      step(
        "CS36",
        "A、B 的公共范围：[1,2]",
        [
          "两份左端较大的是一，右端较小的是二。",
          "按已讲的完整区间结论，交集是这两个边界之间的闭线段。",
        ],
        { event: 3, phase: "read", view: "coverage", action: "coverage" },
      ),
      step(
        "CS37",
        "报告 A/B：(1,0) 到 (2,0) 的整段",
        [
          "先报告这一整段，而不是只报告当前位置。",
          "右端点早已在输入中给出，不必等扫描走到二。",
        ],
        {
          event: 3,
          phase: "report",
          reported: 1,
          view: "coverage",
          action: "report",
        },
      ),
    ],
  },
  {
    id: "e3-check",
    title: "邻居没变，覆盖从二延长到四",
    basis: "当前已报告 A/B 完整区间；覆盖延长时补检更新后的邻居",
    source: "文章第三节 E3 补检",
    reference: "OD20–OD21；新增同一主案例中报告与预约的衔接。",
    steps: [
      step(
        "CS38",
        "加入 B：G[A,B]；R_G 从 2 变为 4",
        [
          "现在把橙色成员加入水平组。",
          "组仍在绿色下方，但最远右端从二延长到四。",
        ],
        { event: 3, phase: "update", view: "coverage", action: "coverage" },
      ),
      step(
        "CS39",
        "补检 G、D：1<3≤4",
        [
          "仍然检查原来的两个邻组。",
          "候选 x 坐标三严格大于当前的一，也在水平组当前覆盖以内。",
        ],
        { event: 3, phase: "check", view: "coverage", candidate: "P" },
      ),
      step(
        "CS40",
        "-1+4s<3<7-4s：D 也覆盖",
        [
          "绿色两端也把候选夹在中间，两份真实成员都能到达。",
          "覆盖与严格未来同时满足，才允许登记。",
        ],
        { event: 3, phase: "check", candidate: "P" },
      ),
      step(
        "CS41",
        "登记新增交点 P′；只新增这一个位置",
        [
          "现在把新增交点 P 加入待处理清单，清单剩十项。",
          "刚才报告区间，现在发现未来点，两项行动要分清。",
        ],
        { event: 3, phase: "check", candidate: "P", action: "queue" },
      ),
    ],
  },
  {
    id: "e4",
    title: "A尾：短成员退出，组仍继续",
    basis: "A/B 已报告完整区间；结束后仍非空的组保留当前最远右端",
    source: "文章第三节 E4",
    reference: "OR14、OD23–OD25；新增跨票交接。",
    steps: [
      step(
        "CS42",
        "(2,0)：A 结束，B 穿过",
        [
          "来到蓝色右端，它仍具有当前闭端点资格。",
          "但这一同线对已经报告完整区间，不再改报一个点。",
        ],
        { event: 4, phase: "read" },
      ),
      step(
        "CS43",
        "只移去 A：G[B] 继续，R_G=4",
        [
          "移去结束的蓝色成员，橙色仍向右继续。",
          "水平组不退出，最远右端仍为四。",
        ],
        { event: 4, phase: "update", action: "remove" },
      ),
      step(
        "CS44",
        "G、D 仍得到已有 交点 P；不重复登记",
        [
          "核对这对邻居，候选还是已登记的交点 P。",
          "没有覆盖延长，不产生新的发现，也不重报旧区间。",
        ],
        { event: 4, phase: "check", candidate: "P" },
      ),
      step(
        "CS45",
        "处理后：G[B]、D；结果 1，剩余 9",
        [
          "到这里，顺序从下到上是水平组、绿色组。",
          "一对结果与剩余九个位置原样接到后面的过程。",
        ],
        { event: 4, phase: "check", view: "ledger" },
      ),
    ],
  },
];
export const makePages = () =>
  Object.fromEntries(
    pageList.map((p) => [
      p.id,
      {
        ...p,
        lines: p.steps.map((s) => ({
          ...(s.math || ["CS10", "CS19"].includes(s.id)
            ? { math: s.text }
            : { text: s.text }),
        })),
        groups: [left(p.steps.length)],
      },
    ]),
  );

// #388 — continues the same queue, accumulated intersections and active groups.
pageList.push(
  {
    id: "e5",
    title: "第四节：两处混合交会",
    basis: "D：y′=(3-x′)/(1-s)；H：y′=(5-x′)/(1-s)；s 小于三分之一",
    source: "文章第三节 E5",
    reference: "SC16–SC18、VS27：新邻接；新增本例精确插入位置。",
    steps: [
      step(
        "CS46",
        "H头：(2,3) → (2+3s,3)，H 开始",
        [
          "从刚才的水平组、绿色组接着走，累计区间继续保留。",
          "现在青色输入开始，它的新位置是 (2+3s,3)。",
        ],
        { event: 5, phase: "read" },
      ),
      step(
        "CS47",
        "0<\\frac{1-3s}{1-s}<3",
        [
          "将新 x 坐标代入绿色高度，得到一减三倍系数除以一减系数。",
          "分子、分母都为正；与三比较，等价于一小于三。",
          "所以绿色在水平组上方，又在青色起点下方。",
        ],
        { event: 5, phase: "read", math: true },
      ),
      step(
        "CS48",
        "加入 H：G[B]、D、H",
        [
          "没有其他输入经过这个起点，因此无新结果。",
          "青色组加入最上方，只产生绿色与青色这一对新邻接。",
        ],
        { event: 5, phase: "update" },
      ),
      step(
        "CS49",
        "D、H 同斜率、不同直线：不预约",
        [
          "两条直线斜率同为负一除以一减系数，常数项不同。",
          "它们平行，不预约；水平与青色之间仍隔着绿色。",
        ],
        { event: 5, phase: "check" },
      ),
    ],
  },
  {
    id: "e6",
    title: "V头：新邻居再次发现已有位置",
    basis: "G 高度为零；D：y′=(3-x′)/(1-s)；H 比 D 高 2/(1-s)",
    source: "文章第四节 E6",
    reference: "VS28–VS31、OD13、SC30：覆盖、未来与保留预约。",
    steps: [
      step(
        "CS50",
        "(3,-1) → (3-s,-1)：V 开始",
        [
          "来到红色输入的下端，新高度为负一。",
          "水平组高度零，绿色高度为 s 除以一减 s，青色又更高。",
          "因此没有旧输入经过这个起点。",
        ],
        { event: 6, phase: "read" },
      ),
      step(
        "CS51",
        "加入 V：V、G[B]、D、H",
        [
          "红色组插到最下方，新邻居只有它与水平组。",
          "原来的水平、绿色邻接仍保留。",
        ],
        { event: 6, phase: "update" },
      ),
      step(
        "CS52",
        "V、G 的候选仍为 P′=(3,0)",
        [
          "让红色的新高度等于零，得到新 x 坐标三。",
          "红色与橙色当前成员都覆盖它，并且三大于三减系数。",
        ],
        { event: 6, phase: "check", candidate: "P", action: "candidate" },
      ),
      step(
        "CS53",
        "已有 交点 P，只保留一次；剩余 7 项",
        [
          "这个真实未来位置已经在清单中，所以不再插入。",
          "原来的预约仍然有效，到站以后才找齐全部参与者。",
        ],
        { event: 6, phase: "check", view: "ledger" },
      ),
    ],
  },
  {
    id: "e7-read",
    title: "交点 P：不是只处理最早预约的一对",
    basis: "第四、五章：到站找齐相遇组，再展开当前成员；旧同线对不重报",
    source: "文章第四节 E7 读取",
    reference: "SP17–SP20、OR31–OR35；新增三条穿过者在同一扫描中的收集。",
    steps: [
      step(
        "CS54",
        "取出 P′=(3,0)；V、G、D 同高",
        [
          "取出刚才补检发现的位置。",
          "红色、水平组和绿色在这里的高度都是零，组成整个相遇块。",
        ],
        { event: 7, phase: "read", candidate: "P" },
      ),
      step(
        "CS55",
        "H 的高度 2/(1-s)>0：在块外",
        [
          "青色的高度严格为正，不经过当前点。",
          "它保留在相遇块上方，不参加当前报告。",
        ],
        { event: 7, phase: "read", focus: "H" },
      ),
      step(
        "CS56",
        "展开 G 只得到 B；参与者 B、D、V",
        [
          "水平组当前只含橙色成员，不能带回已结束的蓝色。",
          "紫色尚未开始，也不能加入名单。",
          "三份当前参与者都严格穿过这个点。",
        ],
        { event: 7, phase: "read", focus: "B" },
      ),
    ],
  },
  {
    id: "e7-report",
    title: "三份穿过者，报告三对完整交集",
    basis: "P′=(3,0)；参与者 B、D、V；A/B 旧完整区间保持不变",
    source: "文章第四节 E7 报告",
    reference: "OR34–OR35；本例不同组逐对报告，不重讲枚举证明。",
    steps: [
      step(
        "CS57",
        "先报告 B/D：P′",
        ["先把橙色成员与绿色输入配对，交集为当前点。"],
        {
          event: 7,
          phase: "report",
          reported: 1,
          action: "report",
          focus: "B",
        },
      ),
      step(
        "CS58",
        "再报告 B/V：P′",
        [
          "再把同一橙色成员与红色输入配对，另留一条点结果。",
          "位置相同，输入对身份不同。",
        ],
        {
          event: 7,
          phase: "report",
          reported: 2,
          action: "report",
          focus: "V",
        },
      ),
      step(
        "CS59",
        "最后报告 D/V：P′；累计 4 对",
        [
          "绿色与红色之间也有一条点结果。",
          "加上早先的完整区间，现在累计四对。",
          "旧区间没有切碎，也没有改报为点。",
        ],
        {
          event: 7,
          phase: "report",
          reported: 3,
          action: "report",
          focus: "D",
        },
      ),
    ],
  },
  {
    id: "e7-update",
    title: "报告后，重排整个参与块",
    basis: "第三章：共同位置等高的继续组，右侧按斜率从小到大排列",
    source: "文章第四节 E7 更新",
    reference: "SU05–SU08、VS33–VS34：整块换序与块外保留；新三组交换。",
    steps: [
      step(
        "CS60",
        "-\\frac{1}{1-s}<0<\\frac{1}{s}",
        [
          "绿色斜率为负，水平组斜率为零，红色斜率为正。",
          "三组都继续，因此右侧按这个次序排列。",
        ],
        { event: 7, phase: "report", reported: 3, math: true },
      ),
      step(
        "CS61",
        "V、G[B]、D → D、G[B]、V",
        [
          "现在重排整个相遇块：绿色到下方，红色到上方。",
          "水平组仍在中间，青色始终保留在块外上方。",
          "竖列中的间距只表示离散顺序，不表示几何高度。",
        ],
        { event: 7, phase: "update", action: "swap" },
      ),
      step(
        "CS62",
        "块内候选都是当前点：不是未来",
        [
          "绿色与水平组、水平组与红色，再求交仍是当前点。",
          "严格未来条件拒绝它们，不能把当前点重新预约。",
        ],
        { event: 7, phase: "check", candidate: "P", focus: "不是未来" },
      ),
    ],
  },
  {
    id: "e7-check",
    title: "新边界邻居，发现的是已有端点",
    basis: "V 覆盖 [3-s,3+2s]；H 覆盖 [2+3s,7-2s]；s>0",
    source: "文章第四节 E7 边界检查",
    reference: "VS34–VS38、SC30：新邻接与同位置合并；新增闭端点候选。",
    steps: [
      step(
        "CS63",
        "新上边界：V、H",
        [
          "换序之后，红色与青色之间不再隔着绿色组。",
          "这对新邻居触发边界检查，下方没有块外组。",
        ],
        { event: 7, phase: "check", candidate: "Q" },
      ),
      step(
        "CS64",
        "原直线 x=3，y=5-x：得到 (3,2)",
        [
          "在红色原直线上代入青色方程，原高度为二。",
          "统一变换后，候选为 (3+2s,2)，记为 Q′。",
        ],
        { event: 7, phase: "check", candidate: "Q", action: "candidate" },
      ),
      step(
        "CS65",
        "两份都覆盖 Q′，且 3+2s>3",
        [
          "这个点正是红色闭右端，青色也覆盖它。",
          "它的新 x 坐标大于当前的三，所以严格在未来。",
        ],
        { event: 7, phase: "check", candidate: "Q" },
      ),
      step(
        "CS66",
        "V尾＋Z点的 Q′ 已登记：不新增、不提前报告",
        [
          "红色尾端与点输入的共同位置，早已进入初始清单。",
          "现在只保留原记录，不新增第二份，也不到站前报告。",
        ],
        { event: 7, phase: "check", view: "ledger" },
      ),
    ],
  },
  {
    id: "e8-read",
    title: "V尾＋Z点：闭端点、穿过者与点输入",
    basis: "第四章：结束者先参与当前闭端点报告；点输入单列，不安排斜率",
    source: "文章第五节 E8 读取",
    reference: "SP49–SP59、VS59–VS63：仅引用角色，新增混合交会。",
    steps: [
      step(
        "CS67",
        "到 Q′：V 结束，Z 为点输入",
        [
          "来到原位置 (3,2) 对应的新位置。",
          "清单给出红色结束与点输入两种身份，先都保留下来。",
        ],
        { event: 8, phase: "read", candidate: "Q" },
      ),
      step(
        "CS68",
        "旧相遇块补上穿过者 H",
        [
          "青色输入严格穿过当前点，要从旧活动顺序中找齐。",
          "完整名单包含红色结束者、青色穿过者和粉色点输入。",
        ],
        { event: 8, phase: "read", candidate: "Q", focus: "H" },
      ),
      step(
        "CS69",
        "G 高度 0；D 高度 -2s/(1-s)<0",
        [
          "当前点的高度是二，水平组与绿色都不在这里。",
          "所以这两组不参加当前报告，仍保留在下方。",
        ],
        { event: 8, phase: "read" },
      ),
    ],
  },
  {
    id: "e8-report",
    title: "先保留结束资格，报告三对",
    basis: "当前位置 Q′=(3+2s,2)；V、H、Z 三份原始身份分别保留",
    source: "文章第五节 E8 报告",
    reference: "SP53–SP57、OR36、VS60–VS61：分对呈现与完整身份。",
    steps: [
      step(
        "CS70",
        "报告 V/H：Q′",
        [
          "先报告红色闭端点与青色穿过者的交集。",
          "红色即将结束，不影响当前端点资格。",
        ],
        { event: 8, phase: "report", reported: 1, action: "report" },
      ),
      step(
        "CS71",
        "报告 V/Z：Q′",
        ["点输入与红色线段也配成一对，完整交集仍是当前点。"],
        {
          event: 8,
          phase: "report",
          reported: 2,
          action: "report",
          focus: "Z",
        },
      ),
      step(
        "CS72",
        "报告 H/Z：Q′；累计 7 对",
        [
          "点输入还与青色线段配成一对。",
          "三条新结果加到原有四条之上，累计七对。",
        ],
        {
          event: 8,
          phase: "report",
          reported: 3,
          action: "report",
          focus: "Z",
        },
      ),
    ],
  },
  {
    id: "e8-update",
    title: "移去结束者，再查新的边界",
    basis: "报告已完成；V 结束、H 继续，Z 仅参加本次配对",
    source: "文章第五节 E8 更新与拒绝",
    reference: "OD14、OD28、VS63：当前覆盖与点输入退出。",
    steps: [
      step(
        "CS73",
        "移去 V；Z 不进入顺序；D、G[B]、H",
        [
          "完成报告后，红色退出，青色继续。",
          "点输入不获得斜率，也不进入后续顺序。",
          "更新后从下到上是绿色、水平组、青色。",
        ],
        { event: 8, phase: "update", action: "remove" },
      ),
      step(
        "CS74",
        "新邻居 G、H：候选 R′=(5,0)",
        [
          "移去红色以后，水平组与青色成为邻居。",
          "令青色的新高度为零，得到候选新 x 坐标为五。",
        ],
        { event: 8, phase: "check", candidate: "R", action: "candidate" },
      ),
      step(
        "CS75",
        "3+2s<5，但 R_G=4<5",
        [
          "因为系数小于一，五在当前新位置右方。",
          "青色覆盖它，但水平组只有橙色成员，覆盖只到四。",
          "尚未开始的紫色不能提供覆盖，所以拒绝预约。",
        ],
        {
          event: 8,
          phase: "check",
          candidate: "R",
          view: "coverage",
          focus: "拒绝",
        },
      ),
      step(
        "CS76",
        "处理后：D、G[B]、H；结果 7，剩余 5",
        [
          "这一段结束后，七对结果全部保留，清单还剩五项。",
          "接下来要把剩余输入处理完，不能只因结果已齐就结束扫描。",
        ],
        { event: 8, phase: "check", view: "ledger" },
      ),
    ],
  },
);

pageList.push(
  {
    id: "e9",
    title: "B尾：水平组暂时离开",
    basis: "当前 G 只含 B；固定同线身份不等于始终活动",
    source: "文章第六节 E9",
    reference: "OD14、OD28：当前覆盖；不重讲组定义。",
    steps: [
      step(
        "CS77",
        "B尾=(4,0)：只有 B 结束",
        [
          "来到橙色右端，当前只有橙色输入参与。",
          "没有其他输入覆盖当前点，因此没有新结果。",
        ],
        { event: 9, phase: "read" },
      ),
      step(
        "CS78",
        "移去 B；G 为空并退出，留下 D、H",
        [
          "移去橙色后，水平组已没有活动成员。",
          "整个组退出顺序，剩下绿色和青色。",
        ],
        { event: 9, phase: "update", action: "remove" },
      ),
      step(
        "CS79",
        "新邻居 D、H 平行：不预约 R",
        [
          "新的相邻两组斜率相同而截距不同，所以平行。",
          "候选点 (5,0) 从未登记，清单不会在那里停下。",
        ],
        { event: 9, phase: "check", candidate: "R" },
      ),
      step(
        "CS80",
        "结果 7；剩余 C头、D尾、H尾、C尾",
        ["保留七对结果，直接前往紫色左端。"],
        { event: 9, phase: "check", view: "ledger" },
      ),
    ],
  },
  {
    id: "e10",
    title: "C头：同一个 G，新的活动成员",
    basis: "G 的固定成员为 A、B、C；A、B 已结束，C 刚开始",
    source: "文章第六节 E10",
    reference: "OD29–OD34：空隙不提供覆盖；新增同组再次入场。",
    steps: [
      step(
        "CS81",
        "C头=(6,0)：C 开始，没有同点配对",
        [
          "紫色在六开始，先核对当前点。",
          "绿色和青色都在它下方，没有新的同点配对。",
        ],
        { event: 10, phase: "read" },
      ),
      step(
        "CS82",
        "插入 G[C]：D、H、G[C]；R_G=8",
        [
          "紫色重新激活固定的水平组，当前成员只有紫色。",
          "组排在最上方，覆盖到八；旧成员不会复活。",
        ],
        { event: 10, phase: "update", action: "coverage" },
      ),
      step(
        "CS83",
        "新邻居 H、G：R′=(5,0)，但 5<6",
        [
          "检查青色与水平组，原直线仍交于五。",
          "候选已经在当前扫描位置左方，不能成为未来事件。",
        ],
        { event: 10, phase: "check", candidate: "R", action: "candidate" },
      ),
      step(
        "CS84",
        "C 的闭范围 [6,8] 不含 5",
        [
          "此外，紫色只覆盖六到八，五也不在它的闭范围里。",
          "同线身份没有填平橙色与紫色之间的旧空隙。",
        ],
        { event: 10, phase: "check", candidate: "R", view: "coverage" },
      ),
      step(
        "CS85",
        "没有新结果或预约：结果 7，清单 3",
        ["两项拒绝理由都成立，保留七对结果，清单剩三项。"],
        { event: 10, phase: "check", view: "ledger" },
      ),
    ],
  },
  {
    id: "e11",
    title: "D尾：绿色结束",
    basis: "当前顺序 D、H、G[C]；三个剩余位置都是结束端点",
    source: "文章第六节 E11",
    reference: "VS64：简单结束简述，保留逐事件状态。",
    steps: [
      step(
        "CS86",
        "D尾=(7-4s,-4)：只有 D 结束",
        [
          "先到绿色右端。青色此刻在上方，紫色高度为零，均不在当前点。",
          "当前没有新配对。",
        ],
        { event: 11, phase: "read" },
      ),
      step(
        "CS87",
        "移去 D，留下 H、G[C]",
        [
          "绿色从最下方退出，青色和紫色原本就相邻。",
          "没有新边界要预约；结果仍为七对，清单剩两项。",
        ],
        { event: 11, phase: "update", action: "remove" },
      ),
      step("CS88", "本行记入事件表", ["记录这一行后继续前进。"], {
        event: 11,
        phase: "check",
        view: "ledger",
      }),
    ],
  },
  {
    id: "e12",
    title: "H尾：青色结束",
    basis: "当前顺序 H、G[C]；C 保持活动到 x′=8",
    source: "文章第六节 E12",
    reference: "VS64：简单结束简述。",
    steps: [
      step(
        "CS89",
        "H尾=(7-2s,-2)：只有 H 结束",
        ["再到青色右端。紫色高度为零，不参加这个点。", "因此仍然没有新结果。"],
        { event: 12, phase: "read" },
      ),
      step(
        "CS90",
        "移去 H，仅剩 G[C]",
        [
          "移去青色以后只剩一个组，不存在相邻两组。",
          "没有新预约，清单只剩紫色右端。",
        ],
        { event: 12, phase: "update", action: "remove" },
      ),
      step("CS91", "累计结果保持 7 对", ["记下这一行，处理最后一个位置。"], {
        event: 12,
        phase: "check",
        view: "ledger",
      }),
    ],
  },
  {
    id: "e13",
    title: "C尾：扫描终止",
    basis: "当前只有 G[C]；待处理清单只剩 C 的右端",
    source: "文章第六节 E13",
    reference: "VS64：顺序与清单双清空。",
    steps: [
      step(
        "CS92",
        "C尾=(8,0)：只有 C 结束",
        ["最后来到紫色右端。没有其他参与者，因此没有新结果。"],
        { event: 13, phase: "read" },
      ),
      step(
        "CS93",
        "移去 C；G 为空退出；顺序与清单均为空",
        [
          "移去紫色，水平组再次变空并退出。",
          "活动顺序为空，待处理清单也为空，扫描至此终止。",
        ],
        { event: 13, phase: "update", action: "remove" },
      ),
      step(
        "CS94",
        "十三行已形成；只核对终态，不重走事件",
        [
          "事件表是刚才逐步形成的记录。",
          "最后一行保留七份配对结果，顺序和清单均为空。",
        ],
        { event: 13, phase: "check", view: "ledger" },
      ),
    ],
  },
  {
    id: "restore",
    title: "第七节：把完整交集还原",
    basis: "所有配对均已报告；统一用 x=x′-sy′、y=y′ 还原",
    source: "文章第七节结果还原",
    reference: "VS57、OR36：逆变换与完整交集；此处代入本集结果。",
    steps: [
      step(
        "CS95",
        "x=x'-sy',\\qquad y=y'",
        [
          "扫描结束后，用同一个逆变换还原每份完整交集。",
          "结果身份保留，不把多个配对合并成一个结果。",
        ],
        { event: 13, phase: "check", view: "results", math: true },
      ),
      step(
        "CS96",
        "A/B：[(1,0),(2,0)] 保持完整闭区间",
        [
          "蓝色与橙色的两个边界高度都是零，x 坐标不变。",
          "还原后仍是从点 (1,0) 到点 (2,0) 的完整闭区间。",
        ],
        {
          event: 13,
          phase: "check",
          view: "results",
          action: "restore",
          focus: "A",
        },
      ),
      step(
        "CS97",
        "B/D：P′=(3,0) → (3,0)",
        ["橙色与绿色的点结果高度也是零，还原为点 (3,0)。"],
        {
          event: 13,
          phase: "check",
          view: "results",
          action: "restore",
          focus: "D",
        },
      ),
      step(
        "CS98",
        "B/V、D/V：各自还原为 (3,0)",
        [
          "橙色与红色、绿色与红色分别保留为两对结果。",
          "它们还原到同一个点，但不是同一份配对记录。",
        ],
        {
          event: 13,
          phase: "check",
          view: "results",
          action: "restore",
          focus: "V",
        },
      ),
    ],
  },
  {
    id: "restore-q",
    title: "上方位置：三个配对分别保留",
    basis: "Q′=(3+2s,2)；原x 坐标为 (3+2s)-2s=3",
    source: "文章第七节结果还原",
    reference: "SP53–SP57、VS61：点输入仍按原始身份配对。",
    steps: [
      step(
        "CS99",
        "V/H：Q′ → (3,2)",
        [
          "红色与青色的结果，新x 坐标减去二倍系数，得到三。",
          "高度保持二，因此还原为点 (3,2)。",
        ],
        {
          event: 13,
          phase: "check",
          view: "results",
          action: "restore",
          focus: "H",
        },
      ),
      step(
        "CS100",
        "V/Z：Q′ → (3,2)",
        ["红色与点输入也还原到同一原位置，配对身份继续单独保留。"],
        {
          event: 13,
          phase: "check",
          view: "results",
          action: "restore",
          focus: "Z",
        },
      ),
      step(
        "CS101",
        "H/Z：Q′ → (3,2)",
        [
          "青色与点输入是第七对，同样还原到点 (3,2)。",
          "至此七对完整交集都已还原。",
        ],
        {
          event: 13,
          phase: "check",
          view: "results",
          action: "restore",
          focus: "H",
        },
      ),
    ],
  },
  {
    id: "verify-results",
    title: "七对结果，不是七个位置",
    basis: "输入共七份，原始身份两两配对；结果类型与位置分开计数",
    source: "文章第七节完整结果核对及收束",
    reference: "OR36、VS64：完整结果核对；不重讲一般正确性证明。",
    steps: [
      step(
        "CS102",
        "1 对区间 + 6 对点 = 7 对非空结果",
        [
          "区间结果只有蓝色与橙色这一对。",
          "另外六对是点结果，它们只占据两个不同点位置。",
        ],
        { event: 13, phase: "check", view: "results" },
      ),
    ],
  },
  {
    id: "empty-ranges",
    title: "独立核对：范围之外不相交",
    basis: "第一章两两检查、第三章精确求交；这里核对本例，不证明一般算法",
    source: "文章第七节十四对空交集表前四行",
    reference: "OD14、OD28：候选必须被两份输入覆盖；新增完整集合核对。",
    steps: [
      step(
        "CS103",
        "A/C、B/C：同线但闭范围分离",
        [
          "再独立检查没有输出的配对。蓝色、橙色的右端分别为二和四，都小于紫色左端六。",
          "这两对同线，但闭范围没有相接。",
        ],
        { event: 13, phase: "check", view: "results" },
      ),
      step(
        "CS104",
        "A/D、C/D：候选 (3,0) 在范围外",
        [
          "绿色与水平直线的唯一候选是点 (3,0)。",
          "它在蓝色右端之外，也在紫色左端之前，所以这两对为空。",
        ],
        { event: 13, phase: "check", view: "results" },
      ),
      step(
        "CS105",
        "A/V、C/V：同样拒绝 (3,0)",
        ["红色与水平直线也只有这个候选。相同的水平范围检查排除了蓝色和紫色。"],
        { event: 13, phase: "check", view: "results" },
      ),
      step(
        "CS106",
        "A/H、B/H、C/H：都不覆盖 (5,0)",
        [
          "青色与水平直线的候选在五。",
          "蓝色只到二，橙色只到四，紫色从六开始；三份都不覆盖它。",
        ],
        { event: 13, phase: "check", view: "results" },
      ),
    ],
  },
  {
    id: "empty-lines",
    title: "平行与高度排除剩余空对",
    basis: "已核对九对为空；剩余五对检查原直线或点的高度",
    source: "文章第七节十四对空交集表后三行",
    reference: "第三章直线求交与点输入资格；不再重推公式。",
    steps: [
      step(
        "CS107",
        "D/H：平行且不同",
        [
          "绿色与青色的原方程斜率都是负一，截距分别为三和五。",
          "两条直线平行且不同，因此这对也为空。",
        ],
        { event: 13, phase: "check", view: "results" },
      ),
      step(
        "CS108",
        "A/Z、B/Z、C/Z：高度 0 与 2 不同",
        [
          "点输入高度为二，三份水平输入都在高度零。",
          "因此点输入与它们形成的三对都为空。",
        ],
        { event: 13, phase: "check", view: "results" },
      ),
      step(
        "CS109",
        "D/Z：x 坐标 3 处，高度仍不相等",
        [
          "最后把点输入的x 坐标三代入绿色方程，得到高度零。",
          "它不等于点输入的高度二，所以最后这对为空。",
        ],
        { event: 13, phase: "check", view: "results" },
      ),
      step(
        "CS110",
        "7 对非空 + 14 对空 = 21 对；C 无非空结果",
        [
          "七对非空加十四对空，覆盖七份输入的全部二十一种无序配对。",
          "紫色参与的每一对都已排除，完整结果集合核对结束。",
        ],
        { event: 13, phase: "check", view: "results" },
      ),
    ],
  },
  {
    id: "close",
    title: "一次连续扫描，完整结果保留",
    basis: "活动顺序与清单均已为空；本例全部原始配对已核对",
    source: "文章第七节收束",
    reference: "VS64：只收束本例，不提前展开下一章正确性证明。",
    steps: [
      step(
        "CS111",
        "报告 → 更新 → 检查 → 下一事件",
        [
          "这一次扫描把重叠、同点、原竖直线段与点输入接在同一份状态上。",
          "每站先报告，再更新并检查新邻接；清单耗尽后还原完整结果。",
        ],
        { event: 13, phase: "check", view: "results" },
      ),
    ],
  },
);

/** Stable narration units; page boundaries remain independent of WAV boundaries. */
export const shots = pageList.flatMap((page) =>
  page.steps.map((step, index) => ({
    ...step,
    page: page.id,
    visibleStep: index + 1,
  })),
);
