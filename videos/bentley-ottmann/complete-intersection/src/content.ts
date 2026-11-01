export type LessonStep = {
  id: string;
  subtitle: string;
  lines: string[];
  diagram?: string;
  focus?: string;
  thinkSeconds?: number;
};

export type TeachingPageData = {
  id: string;
  section: string;
  title: string;
  steps: LessonStep[];
  dense?: boolean;
};

export const pages: TeachingPageData[] = [
  {
    id: "inputs",
    section: "第一节：先辨认点输入",
    title: "第一节：先辨认点输入",
    steps: [
      {
        id: "C01",
        subtitle:
          "第一章《我们究竟要求什么》留下了任意端点求交的问题。本集取两份不同的原始输入 $S_1,S_2$，把已有结论接成求出完整交集的路径。",
        lines: [
          "第三章上集：从任意端点求出完整交集",
          "取两份不同的原始输入 $S_1,S_2$",
        ],
      },
      {
        id: "C02",
        subtitle:
          "$S_1$ 的端点记作 $A_1,B_1$，$S_2$ 的端点记作 $A_2,B_2$。下标区分输入，书写次序不表示方向。$x_{A_1},y_{A_1}$ 表示 $A_1$ 的横、纵坐标，其余端点同理。",
        lines: [
          "$S_1: A_1,B_1\\qquad S_2: A_2,B_2$",
          "$A_1=(x_{A_1},y_{A_1})$；其余端点同理",
        ],
        diagram: "input-pair",
        focus: "endpoints",
      },
      {
        id: "C03",
        subtitle:
          "本集针对给定的有理数坐标保持精确值，不先截成近似小数。这沿用《剪切为什么保持交集》的精确运算说明；输入之前已经丢失的信息，不能靠后续精确计算找回。",
        lines: ["给定有理数坐标：计算保留精确值"],
      },
    ],
  },
  {
    id: "point-gate",
    section: "第一节：先辨认点输入",
    title: "直线方程之前的检查",
    steps: [
      {
        id: "C04",
        subtitle:
          "分别比较每份输入的两个端点，$i$ 依次取两份输入的编号 $1,2$。只有横坐标相等、纵坐标也相等，才是同一个点。双向箭头表示左右两个条件等价。因此先分成两份都是点、恰好一份是点、两份都不是点三类。",
        lines: [
          "$A_i=B_i\\ \\Longleftrightarrow\\ x_{A_i}=x_{B_i}\\ \\text{且}\\ y_{A_i}=y_{B_i}\\quad(i=1,2)$",
          "两份都是点／恰好一份是点／两份都不是点",
        ],
      },
      {
        id: "C05",
        subtitle:
          "《由两个端点写出直线方程》要求两个端点不同。重合端点不能确定唯一直线，所以先处理点输入，才能保证后面的公式调用合法。",
        lines: ["使用直线方程的前提：两个端点不同"],
      },
    ],
  },
  {
    id: "point-inputs",
    section: "第二节：点属于哪一段",
    title: "第二节：点属于哪一段",
    steps: [
      {
        id: "C06",
        subtitle:
          "两份都是点时，比较两个点的横、纵坐标。分别相等，交集就是该点；否则为空。这直接使用第一章的点交集结论，不需要解方程。",
        lines: ["两份都是点：位置相同，留下该点；否则为空"],
      },
    ],
  },
  {
    id: "point-aliases",
    section: "第二节：点属于哪一段",
    title: "恰好一份是点时",
    steps: [
      {
        id: "C07",
        subtitle:
          "恰好一份是点时，把它记作 $T=(x_T,y_T)$；另一份的两个不同端点暂记为 $E,F$。它们只是原端点的别名，无论点输入排在第一份还是第二份，都用同一套检查。",
        lines: [
          "$T=(x_T,y_T)$",
          "$E=(x_E,y_E)$",
          "$F=(x_F,y_F)$",
          "$E\\ne F$；先查共线，再查闭范围",
        ],
        diagram: "point-line",
        focus: "name-points",
      },
    ],
  },
  {
    id: "point-collinearity",
    section: "第二节：点属于哪一段",
    title: "先确认点在所在直线上",
    dense: true,
    steps: [
      {
        id: "C08",
        subtitle:
          "复用方向与共线专题的算式，把整个乘积差记作 $\\omega_{EF}(T)$，其中 $\\omega$ 读作“欧米伽”。下标说明使用端点 $E,F$，括号中的 $T$ 是待检查的点。在 $E\\ne F$ 时，结果为零当且仅当三点共线。",
        lines: [
          "$\\omega_{EF}(T)=(x_F-x_E)(y_T-y_E)-(y_F-y_E)(x_T-x_E)$",
          "$E\\ne F$ 时，$\\omega_{EF}(T)=0$ 当且仅当 $E,F,T$ 共线",
        ],
      },
    ],
  },
  {
    id: "point-collinearity-result",
    section: "第二节：点属于哪一段",
    title: "零与非零，去向不同",
    steps: [
      {
        id: "C09",
        subtitle:
          "结果非零，点连所在直线都不属于，交集立即判空。结果为零，还不能留下这个点：它也可能落在端点外的延长线上，必须继续检查范围。",
        lines: ["非零：交集为空", "为零：继续检查端点范围"],
        diagram: "point-line",
        focus: "outside-line",
      },
    ],
  },
  {
    id: "point-range",
    section: "第二节：点属于哪一段",
    title: "共线以后，检查闭范围",
    dense: true,
    steps: [
      {
        id: "C10",
        subtitle:
          "沿用直线方程专题的范围结论：若 $x_E\\ne x_F$，检查 $x_T$ 是否在两个端点横坐标之间。$\\min$ 取较小值，$\\max$ 取较大值，因此端点反向书写也不会改变范围。",
        lines: ["$x_E\\ne x_F:\\quad\\min(x_E,x_F)\\le x_T\\le\\max(x_E,x_F)$"],
      },
      {
        id: "C11",
        subtitle:
          "若 $x_E=x_F$，由于两个端点不同，这条线段竖直，改查纵坐标范围。两种范围都包含等号，所以点恰好落在端点上，也能通过。",
        lines: ["$x_E=x_F:\\quad\\min(y_E,y_F)\\le y_T\\le\\max(y_E,y_F)$"],
      },
    ],
  },
  {
    id: "point-membership",
    section: "第二节：点属于哪一段",
    title: "两个条件都要通过",
    steps: [
      {
        id: "C12",
        subtitle:
          "共线与闭范围必须同时通过，交集才是 $T$；任一项失败就是空。前者排除直线外的点，后者排除延长线上的点。后面算出的候选交点，也要接受同样的归属检查。",
        lines: ["共线且在闭范围内：交集为 $T$；否则为空"],
        diagram: "point-range-y",
        focus: "range-y",
      },
    ],
  },
  {
    id: "line-coefficients",
    section: "第三节：两条所在直线的关系",
    title: "第三节：两条所在直线的关系",
    dense: true,
    steps: [
      {
        id: "C13",
        subtitle:
          "现在已确认 $A_1\\ne B_1$、$A_2\\ne B_2$。对输入编号 $i=1,2$，按直线方程专题的取法，先由端点计算 $a_i,b_i$，再计算 $c_i$。这里直接使用给定坐标，不做缩放。",
        lines: [
          "$a_i=y_{B_i}-y_{A_i},\\qquad b_i=x_{A_i}-x_{B_i}$",
          "$c_i=a_i x_{A_i}+b_i y_{A_i}\\qquad(i=1,2)$",
        ],
      },
      {
        id: "C14",
        subtitle:
          "这给出两条直线 $a_i x+b_i y=c_i$。系数是算出的固定数，$x,y$ 是直线上点的坐标。每组 $a_i,b_i$ 不会同时为零；本集使用这一结论，不重做端点系数的推导。",
        lines: ["$a_i x+b_i y=c_i$；每组 $a_i,b_i$ 不同时为零"],
      },
    ],
  },
  {
    id: "determinant",
    section: "第三节：两条所在直线的关系",
    title: "先看分母能否使用",
    steps: [
      {
        id: "C15",
        subtitle:
          "计算 $\\Delta=a_1b_2-a_2b_1$，这个符号读作“德尔塔”。《整数缩放与交点分母》的消元结论告诉我们：非零时有唯一交点，为零时两条直线平行或重合，不能使用唯一交点公式。",
        lines: [
          "$\\Delta=a_1b_2-a_2b_1$",
          "$\\Delta\\ne0$：唯一交点；$\\Delta=0$：平行或重合",
        ],
      },
      {
        id: "C16",
        subtitle:
          "这里引用的直线分类与求交公式，只要求系数表示合法直线。原专题的整数条件用于分母上界，本集没有使用那个上界，所以不必先把有理坐标缩放成整数。",
        lines: ["引用条件：合法直线；除法还要求 $\\Delta\\ne0$"],
      },
    ],
  },
  {
    id: "candidate",
    section: "第三节：两条所在直线的关系",
    title: "唯一交点仍只是候选点",
    dense: true,
    steps: [
      {
        id: "C17",
        subtitle:
          "在 $\\Delta\\ne0$ 的分支，把唯一交点记作 $P=(x_P,y_P)$，其中 $x_P,y_P$ 分别表示 $P$ 的横、纵坐标。直接使用已经推导的两个坐标公式，它们保证点在两条直线上，还没有保证点属于两条线段。",
        lines: [
          "$P=(x_P,y_P),\\qquad\\Delta\\ne0$",
          "$x_P=\\frac{c_1b_2-c_2b_1}{\\Delta},\\qquad y_P=\\frac{a_1c_2-a_2c_1}{\\Delta}$",
        ],
      },
    ],
  },
  {
    id: "candidate-range",
    section: "第三节：两条所在直线的关系",
    title: "检查候选点是否属于两段",
    dense: true,
    steps: [
      {
        id: "C18",
        thinkSeconds: 3,
        subtitle:
          "分别对 $S_1,S_2$ 检查闭范围：不竖直的查横坐标，竖直的查纵坐标。两份都通过才留下 $P$，任何一份不通过就判空。为什么不再另找一个候选点？",
        lines: [
          "分别检查 $P$ 是否在 $S_1,S_2$ 的闭范围内",
          "两份都通过：留下 $P$；任一失败：判空",
        ],
        diagram: "candidate",
        focus: "check-both",
      },
      {
        id: "C19",
        subtitle:
          "如果线段有公共点，它必定也是两条所在直线的公共点，而两条直线只有 $P$ 这一个公共点。排除 $P$，就排除了全部可能；反过来，两个范围都通过，就确认交集恰好为 $P$。",
        lines: ["任何线段公共点，都必须是唯一的直线公共点 $P$"],
        diagram: "candidate",
        focus: "only-candidate",
      },
    ],
  },
  {
    id: "axis-cases",
    section: "第三节：两条所在直线的关系",
    title: "竖直、水平与端点接触",
    steps: [
      {
        id: "C20",
        subtitle:
          "竖直输入使自己的 $b_i=0$，却不必使整个 $\\Delta$ 为零。水平与竖直输入仍按同一条分支条件处理；闭范围包含两端，也保留合法的端点接触。",
        lines: [
          "竖直只使自己的 $b_i=0$；是否求唯一交点仍看 $\\Delta$",
          "水平、竖直与端点接触均未被排除",
        ],
        diagram: "axis-crossing",
        focus: "closed-endpoint",
      },
    ],
  },
  {
    id: "zero-determinant",
    section: "第三节：两条所在直线的关系",
    title: "分母为零，换一个判断",
    dense: true,
    steps: [
      {
        id: "C21",
        subtitle:
          "在 $\\Delta=0$ 的分支，停止使用唯一交点公式。把第二份输入的端点 $A_2$ 代入第一条直线，检查等式 $a_1x_{A_2}+b_1y_{A_2}=c_1$ 是否成立。",
        lines: ["$\\Delta=0$：检查 $a_1x_{A_2}+b_1y_{A_2}=c_1$"],
      },
      {
        id: "C22",
        subtitle:
          "若成立，$A_2$ 本来就在第二条直线上，现在也在第一条上。已知两条直线只能平行或重合，有公共点就排除了不同的平行线，因此只能重合。",
        lines: ["成立：有公共点，排除不同的平行线，确认共线"],
        diagram: "collinear",
        focus: "shared-endpoint",
      },
    ],
  },
  {
    id: "zero-determinant-parallel",
    section: "第三节：两条所在直线的关系",
    title: "等式不成立：不同的平行线",
    dense: true,
    steps: [
      {
        id: "C23",
        subtitle:
          "若不成立，两条直线不可能重合，所以是不同的平行线，交集为空。只查一个端点之所以够用，依赖 $\\Delta=0$；没有这个前提，共享一个点也可能只是唯一交点。",
        lines: [
          "不成立：不同的平行线，交集为空",
          "一个端点的检查必须与 $\\Delta=0$ 合用",
        ],
        diagram: "parallel",
        focus: "separate-lines",
      },
    ],
  },
  {
    id: "overlap-boundaries",
    section: "第四节：共线时选出完整区间",
    title: "第四节：共线时选出完整区间",
    steps: [
      {
        id: "C24",
        subtitle:
          "现在两份都不是点，而且已确认共线。引用第一章的区间端点结论：共同直线不竖直时按横坐标排序，竖直时按纵坐标排序，先分清每条输入的较前、较后端点。",
        lines: [
          "已确认共线：不竖直按 $x$ 排序，竖直按 $y$ 排序",
          "每条输入先分清较前端点与较后端点",
        ],
        diagram: "overlap-select",
        focus: "sort-endpoints",
      },
      {
        id: "C25",
        subtitle:
          "在两个较前端点中选更靠后的一个，记作 $L$；在两个较后端点中选更靠前的一个，记作 $R$。边界直接来自原端点，无须对分母为零的方程强行求交。",
        lines: ["$L$：较前端点中更靠后者", "$R$：较后端点中更靠前者"],
        diagram: "overlap-select",
        focus: "choose-boundaries",
      },
    ],
  },
  {
    id: "overlap-results",
    section: "第四节：共线时选出完整区间",
    title: "两个边界，三种结果",
    steps: [
      {
        id: "C26",
        subtitle:
          "如果 $L$ 在 $R$ 后面，没有点能够同时满足两边的范围，交集为空。这个判断使用已经确认的共同直线；仅有横坐标范围重合，不能推出不同直线上的线段重叠。",
        lines: ["$L$ 在 $R$ 后面：空"],
        diagram: "overlap-empty",
        focus: "reversed-boundaries",
      },
    ],
  },
  {
    id: "overlap-point",
    section: "第四节：共线时选出完整区间",
    title: "两个边界相同：点交集",
    steps: [
      {
        id: "C27",
        subtitle:
          "如果排序坐标相等，在这条共同直线上就是同一个点：不竖直时一个横坐标只对应一个点，竖直时一个纵坐标只对应一个点。所以 $L=R$，交集是点 $L$，两端的等号保留了接触。",
        lines: ["$L=R$：点 $L$"],
        diagram: "overlap-touch",
        focus: "same-boundary",
      },
    ],
  },
  {
    id: "overlap-interval",
    section: "第四节：共线时选出完整区间",
    title: "边界先后正常：完整区间",
    steps: [
      {
        id: "C28",
        subtitle:
          "如果 $L$ 在 $R$ 前面，第一章已证明公共部分恰好是这两个边界之间的完整闭区间。这里直接用该结论输出从 $L$ 到 $R$ 的全部点，而不是两个孤立端点。",
        lines: ["$L$ 在 $R$ 前面：从 $L$ 到 $R$ 的完整非零长度闭区间"],
        diagram: "overlap-full",
        focus: "whole-interval",
      },
    ],
  },
  {
    id: "overlap-invariance",
    section: "第四节：共线时选出完整区间",
    title: "边界排序不改变输入身份",
    steps: [
      {
        id: "C29",
        subtitle:
          "完全重合时，选出的就是整条共同线段。把任一输入的端点书写顺序反过来，排序后的边界仍然相同。沿用第一章的完整交集约定，其他输入穿过也不把这段结果拆碎。",
        lines: [
          "完全重合：整条共同线段",
          "反向书写不改边界；其他输入不拆分本对交集",
        ],
      },
    ],
  },
  {
    id: "complete-path",
    section: "第五节：核对路径没有遗漏",
    title: "第五节：核对路径没有遗漏",
    dense: true,
    steps: [
      {
        id: "C30",
        subtitle:
          "现在回看整条路径。每份输入的两个端点，要么相同，要么不同，所以两份都是点、恰好一份是点、两份都非点覆盖全部输入。含点的两条路径，已经分别得到空或该点。",
        lines: ["两份都是点：比较位置", "恰好一份是点：共线且在闭范围内"],
      },
      {
        id: "C31",
        subtitle:
          "两份都非点后，$\\Delta$ 要么非零，要么为零。非零时只有一个候选点，检查两份闭范围，得到空或这个点。",
        lines: ["两份非点且 $\\Delta\\ne0$：唯一候选点检查两份闭范围"],
      },
      {
        id: "C32",
        subtitle:
          "为零时，端点代入的等式要么成立，要么不成立。不成立就判空；成立就共线。共线后的边界只有前、同点、后三种关系，分别得到完整区间、点或空，每条路径都有确定终点。",
        lines: [
          "$\\Delta=0$：端点代入不成立则空，成立则共线",
          "共线：比较 $L,R$，得到空、点或完整区间",
        ],
      },
    ],
  },
  {
    id: "identity",
    section: "第五节：核对路径没有遗漏",
    title: "结果回到最初的输入对",
    steps: [
      {
        id: "C33",
        subtitle:
          "计算结果仍绑定最初选出的原始无序输入对 $S_1,S_2$，画面中的花括号表示这一无序输入对。几何位置相同不取消身份，交换两份输入也不产生新的一对；空交集不留求交结果，非空则保留这一对及其完整交集。",
        lines: [
          "原始无序输入对 $\\{S_1,S_2\\}$ ＋ 完整交集",
          "同一位置不合并输入身份；交换次序不新增输入对",
        ],
      },
      {
        id: "C34",
        subtitle:
          "从点输入的辨认，到共线与范围，再到直线关系和区间边界，我们得到了一条从任意给定端点求出完整交集的数学路径。这是教学上的判断组织，不是在描述某个实际算法函数的调用次序。",
        lines: ["四个端点 → 合法条件下的判断 → 空、点或完整区间"],
      },
    ],
  },
];
