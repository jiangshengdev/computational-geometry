import { left } from "../../../shared/math/math-lines.ts";

/** Current subtitle master. Each stable step owns one complete narration WAV. */
export type Step = {
  id: string;
  text?: string;
  math?: string;
  first: string;
  action: string;
  captions: string[];
  /** One semantic operation per subtitle, explicitly selected by the author. */
  targets?: string[];
  focus?: (string | null)[];
  thinkAfter?: number;
};
export type DiagramKind =
  | "endpoint"
  | "interior"
  | "meeting"
  | "queue"
  | "roles"
  | "block"
  | "collect"
  | "pairs"
  | "points"
  | "pure"
  | "endpoint-point";
export type PageInput = {
  id: string;
  section: number;
  title: string;
  source: string;
  diagram?: DiagramKind;
  steps: Step[];
};
function page(input: PageInput) {
  return {
    ...input,
    lines: input.steps,
    groups: [left(input.steps.length)],
    holdAfterSeconds: 3,
  };
}

export const pageList = [
  page({
    id: "scope",
    section: 1,
    title: "第一节：共端点，先报告还是先忘掉",
    source: "第一节：教学范围",
    steps: [
      {
        id: "SP01",
        text: "第四章上集：找齐同点参与者，报告全部输入对",
        first: "本章与分集边界",
        action: "先展示本集问题，再指出下集承接",
        captions: [
          "第三章已经给出完整求交和精确比较，本集接着处理同一个位置上的多份输入。",
          "上集先找齐参与者、报告全部输入对；下集再维护右侧顺序，并解释没有端点提示的共点为何会被发现。",
        ],
      },
      {
        id: "SP02",
        text: "保留：非零输入不竖直、无非零重叠、不同位置横坐标各异",
        first: "保留的教学条件",
        action: "逐项强调保留条件",
        captions: [
          "本章仍要求非零输入不竖直，任意两份之间没有非零长度重叠。",
          "不同事件位置的横坐标各异；这是不同位置的限制，不妨碍多个端点集中在同一个点。",
        ],
        focus: ["非零重叠", "不同位置"],
      },
      {
        id: "SP03",
        text: "允许：共端点、端点落在内部、多线共点、点输入",
        first: "此次解除的限制",
        action: "列出新增允许情形，不提前展开后续章节",
        captions: [
          "现在允许共端点、端点落在另一条线段内部、多条线段共点，也允许零长度点输入。",
          "共线但仅共享端点同样允许；",
          "重叠、同横坐标不同位置和竖直线段参与扫描，分别留给后续章节。",
          "这些不是完整算法的输入限制。",
        ],
      },
    ],
  }),
  page({
    id: "endpoint-input",
    section: 1,
    title: "先只取两份输入",
    source: "第一节：共端点最小案例",
    diagram: "endpoint",
    steps: [
      {
        id: "SP04",
        math: "P=(4,4),\\quad A:(0,4)\\longrightarrow P",
        first: "共同点 P 与输入 A",
        action: "先指 A 左端点，再沿 A 描亮到 P",
        captions: [
          "把共同端点叫作 P，横坐标和纵坐标都是四。",
          "蓝色输入 A 从横坐标零、纵坐标四到 P；它在这里结束。图是教学示意，不是真实执行轨迹。",
        ],
        targets: ["P", "A"],
      },
      {
        id: "SP05",
        math: "B:P\\longrightarrow(8,8)",
        first: "非零开始者 B",
        action: "从 P 沿 B 描亮到右端点，保留 A",
        captions: [
          "橙色输入 B 从 P 到横坐标八、纵坐标八，在这里开始。",
          "图中横纵每格都是一个单位，O 是原点，箭头标出坐标正方向。两份输入都包含端点。",
        ],
        targets: ["B", "P"],
      },
      {
        id: "SP06",
        text: "A：y=4，0≤x≤4；B：y=x，4≤x≤8",
        first: "两份闭范围",
        action: "对照两段实际范围，圈共同端点",
        captions: [
          "A 满足纵坐标等于四，横坐标从零到四；B 满足纵坐标等于横坐标，范围从四到八。",
          "引用第三章的完整求交结论：唯一候选点 P 通过两份闭范围检查，所以这一对的完整交集就是 P。",
        ],
        targets: ["A", "P"],
      },
    ],
  }),
  page({
    id: "endpoint-report",
    section: 1,
    title: "当前参与，不等于右侧继续",
    source: "第一节：闭端点报告与成员退出",
    diagram: "endpoint",
    steps: [
      {
        id: "SP07",
        text: "若先忘掉 A，当前配对就少一份身份",
        first: "提前丢弃结束者的漏报",
        action: "提示结束者 A，再指当前配对位置",
        captions: [
          "紧靠 P 左侧只有 A，右侧只有 B。",
          "如果先忘掉结束的 A，再读取开始的 B，配对名单里就少了 A，会漏掉这一次端点接触。",
        ],
        targets: ["A", "P"],
      },
      {
        id: "SP08",
        text: "先保留 A、加入 B，报告 A 与 B 对应 P",
        first: "先报告的依赖关系",
        action: "依次提示两份身份，再圈 P",
        captions: [
          "先保留 A 在本次事件中的身份，",
          "把 B 也列进来，",
          "报告 A 与 B 的交集 P。",
          "然后 A 退出、B 继续；不再向右延伸，不等于不属于当前闭端点。",
        ],
        targets: ["A", "B", "P", "B"],
        focus: ["先保留", null, "报告", null],
      },
      {
        id: "SP09",
        text: "任何结束者，都要先完成当前位置的配对",
        first: "从案例推广到任意结束者",
        action: "保留案例作为参照，说明一般理由",
        captions: [
          "这个理由不依赖两条线段的方向：只要一份闭线段在这里结束，它就仍包含这里的点。",
          "若还有其他参与者，就要在丢掉结束身份以前完成当前配对；这说的是数学依赖，不要求程序容器永远不能暂时取出成员。",
        ],
      },
    ],
  }),
  page({
    id: "interior-input",
    section: 2,
    title: "第二节：端点清单之外，还有谁",
    source: "第二节：端点落在内部",
    diagram: "interior",
    steps: [
      {
        id: "SP10",
        math: "C:(1,7)\\longrightarrow(9,-1),\\quad y=8-x",
        first: "新输入 C；独立的 B、C 案例",
        action: "清除 A，保留 B，先指出 C 两端再描亮",
        captions: [
          "这次只取 B 和新的紫色输入 C，暂不取 A。",
          "C 从横坐标一、纵坐标七到横坐标九、纵坐标负一，满足纵坐标等于八减横坐标。",
        ],
        targets: ["B", "C"],
      },
      {
        id: "SP11",
        math: "y_C(4)=8-4=4,\\quad 1<4<9",
        first: "C 严格穿过 P",
        action: "在 x=4 处显示精确高度并圈 P",
        captions: [
          "用第三章的同一位置精确高度判断，C 在横坐标四处的高度是四。",
          "四又严格在一和九之间，所以 P 严格位于 C 内部；没有端点在 P，不代表不参加。",
        ],
        targets: ["C", "P"],
      },
      {
        id: "SP12",
        text: "读到 B 的起点，还要找到旧活动成员 C",
        first: "端点记录不是参与者全集",
        action: "先提示 B 起点记录，再收集 C",
        captions: [
          "起点清单直接给出 B，却没有把严格穿过的 C 当作端点列在这里。",
          "只用端点名单配对会漏掉 B 与 C；还要到旧活动顺序中找同高度成员，才能报告这一对对应 P。",
        ],
        targets: ["B", "C"],
      },
    ],
  }),
  page({
    id: "range",
    section: 2,
    title: "高度相等，还必须有线段范围",
    source: "第二节：排除延长线旁观者",
    diagram: "interior",
    steps: [
      {
        id: "SP13",
        text: "旧成员必须覆盖事件横坐标，不能只看所在直线",
        first: "查找对象的范围前提",
        action: "强调 C 的两端，区分线段与延长线",
        captions: [
          "这里查的是仍覆盖事件横坐标的旧活动线段，再比较它们在这里的精确高度。",
          "若只是延长线经过 P，线段范围并未覆盖这里，就不能加入。",
          "点归属的共线和闭范围结论见第三章，不重做求交公式。",
        ],
        targets: ["C", "P", "P"],
      },
      {
        id: "SP14",
        text: "端点负责提示位置；旧顺序补齐穿过者",
        first: "两路查找的用途",
        action: "从端点 P 提示转到 C，保留两份输入",
        captions: [
          "这一页新增的机制是：端点让我们到站，旧活动顺序补齐没有端点提示的参与者。",
          "到达一个已知位置后怎样找齐，与这个位置为什么一定会被发现，是不同问题。后一个问题留给下集。",
        ],
        targets: ["P", "C"],
      },
    ],
  }),
  page({
    id: "meeting-input",
    section: 3,
    title: "第三节：预约的一对，不是参与者全体",
    source: "第三节：四输入共点",
    diagram: "meeting",
    steps: [
      {
        id: "SP15",
        math: "D:(2,0)\\longrightarrow(7,10),\\quad y=2x-4",
        first: "第四份输入 D 与四输入案例",
        action: "恢复 A、B、C，再引入 D 两端和线段",
        captions: [
          "现在取回 A，和 B、C 一起，再加入绿色输入 D。",
          "D 从横坐标二、纵坐标零到横坐标七、纵坐标十，",
          "满足纵坐标等于二倍横坐标减四。",
          "只看 P 这次事件，不重演整次扫描。",
        ],
        targets: ["ABC", "D", "D", "D"],
      },
      {
        id: "SP16",
        math: "y_D(4)=2\\times4-4=4,\\quad 2<4<7",
        first: "D 严格穿过 P",
        action: "从 D 的范围检查转到 P",
        captions: [
          "D 在横坐标四处的高度也是四，而且四严格在二和七之间。",
          "所以 D 也严格穿过 P。",
          "其他端点的横坐标是零、一、二、七、八、九，与四不同，",
          "也彼此不同，符合本章条件。",
        ],
        targets: ["D", "P", "P", "P"],
      },
      {
        id: "SP17",
        text: "A、C 可以预约 P；到站后仍须找到 A、B、C、D",
        first: "预约对与到站参与者的区别",
        action: "先提示 A、C，再依次指向 B、D",
        captions: [
          "例如检查旧邻居 A 与 C，可以算出未来位置 P；这只说明要在 P 停下。",
          "到站后不能只处理这一对。A 的结束、B 的开始，以及 C 的穿过和 D 的穿过，都属于同一次事件。",
        ],
        targets: ["AC", "BD"],
      },
    ],
  }),
  page({
    id: "queue",
    section: 3,
    title: "位置合并，端点身份保留",
    source: "第三节：位置只登记一次",
    diagram: "queue",
    steps: [
      {
        id: "SP18",
        text: "同一精确位置只留一份待处理记录",
        first: "多来源事件合并",
        action: "让多条来源汇入同一 P 记录",
        captions: [
          "引用第三章的同点结论：横坐标和纵坐标分别相等，才是同一精确位置。",
          "其他输入对再发现 P，就使用同一位置记录；不能因为来源不同，把同点拆成多次处理。",
        ],
        targets: ["position", "merge"],
      },
      {
        id: "SP19",
        text: "开始者、结束者信息并入 P，不能被交点记录覆盖",
        first: "记录保留的身份信息",
        action: "分别提示开始与结束名单，再展示合并记录",
        captions: [
          "所有端点预先已知，所以 P 的记录可以保留哪些输入从这里开始、哪些在这里结束。",
          "交点记录并入这个位置时，不能覆盖已有端点信息。后面还要加入点输入身份。",
        ],
        targets: ["endpoints", "merge"],
      },
      {
        id: "SP20",
        text: "真实未来位置保留到取出；同一位置统一处理一次",
        first: "复用清单保留规则",
        action: "保持合并记录，不跟随预约对是否仍相邻而删除",
        captions: [
          "继续沿用第二章《扫描过程与三类事件》的规则：真实未来交点即使暂时失去邻接，也保留到取出。",
          "清单每次取最左的未处理位置，同一位置只统一处理一次。",
          "预约的一对提供发现依据，完整名单到站再找。",
        ],
        targets: ["keep", "merge", "merge"],
      },
    ],
  }),
  page({
    id: "roles",
    section: 3,
    title: "三种非零角色，当前都参加",
    source: "第三节：角色精确条件",
    diagram: "roles",
    steps: [
      {
        id: "SP21",
        math: "P=(x_P,y_P)",
        first: "事件的一般坐标记号",
        action: "指出 P 与两坐标，不换掉案例含义",
        captions: [
          "把同一个事件位置一般地写成 P，",
          "符号 x_P 和 y_P 分别表示它的横坐标和纵坐标，",
          "案例中都等于四。",
          "非零输入按横坐标认出左端点和右端点，不由端点书写顺序决定。下面的角色含义不依赖数值四。",
        ],
      },
      {
        id: "SP22",
        text: "开始者：左端点就是 P，右端点在其右；案例为 B",
        first: "开始者的精确条件",
        action: "只提示开始者 B，不加入旧块",
        captions: [
          "经过 P 的非零输入，若左端点就是 P、右端点横坐标更大，就叫开始者。",
          "本例 B 是开始者；它参与当前报告，右侧也继续，但左侧旧顺序里还没有它。",
        ],
        targets: ["B", "B"],
      },
      {
        id: "SP23",
        text: "结束者：右端点就是 P，左端点在其左；案例为 A",
        first: "结束者的精确条件",
        action: "提示 A 的左侧存在和当前端点",
        captions: [
          "若右端点就是 P、左端点横坐标更小，就叫结束者。",
          "本例 A 是结束者，在旧顺序中，也参与当前闭端点报告；只是右侧不再继续。",
        ],
        targets: ["A", "A"],
      },
      {
        id: "SP24",
        text: "严格穿过者：P 在线段内部；案例为 C、D",
        first: "严格穿过者与角色互斥",
        action: "依次提示 C、D，区分三种角色",
        captions: [
          "如果 P 在线段上，横坐标又严格夹在两端之间，就叫严格穿过者。本例是 C 和 D，两侧都存在。",
          "非零且不竖直保证两端横坐标不同，所以三种角色互不混淆。",
          "当前四份都参加，右侧只保留输入 B、输入 C 和输入 D 这三份。",
        ],
        targets: ["C", "D", "D"],
      },
    ],
  }),
  page({
    id: "old-block",
    section: 3,
    title: "旧参与者为何能作为一块找出",
    source: "第三节：旧顺序与连续相遇块",
    diagram: "collect",
    steps: [
      {
        id: "SP25",
        text: "旧顺序：紧靠 P 左侧；相遇块：其中经过 P 的成员",
        first: "旧顺序与相遇块",
        action: "显示旧顺序 D、A、C，单独保留尚未加入的 B",
        captions: [
          "把紧靠 P 左侧的活动顺序叫旧顺序，其中经过 P 的旧参与者叫相遇块。",
          "它包括结束者和严格穿过者，不包括开始者；",
          "本例旧块是从下到上的 D、A、C。没有旧参与者时就是空块。",
        ],
        targets: ["old", "old", "old"],
      },
      {
        id: "SP26",
        text: "不足两条时，是空块或单成员块",
        first: "连续性论证的边界",
        action: "先指出空块与单成员无需夹层论证",
        captions: [
          "旧参与者不足两条时，空块或单成员块已经连续。",
          "至少有两条时，才需要证明：旧顺序里夹在它们中间的其他成员，会不会不参加当前事件？",
        ],
      },
    ],
  }),
  page({
    id: "block-reuse",
    section: 3,
    title: "引用旧夹层结论，把中间者收进来",
    source: "第三节：第二章夹层结论的适用条件与新增用途",
    diagram: "block",
    steps: [
      {
        id: "SP27",
        text: "任取旧参与者最下的 U、最上的 V，中间旧成员叫 W",
        first: "一般论证中的 U、V、W",
        action: "依次选择下边界 U、上边界 V、中间 W",
        captions: [
          "离开四输入的数值，任取旧参与者中最下的 U、最上的 V；若中间还有旧成员，把它叫 W。",
          "图仅表示从下到上的关系，不另造数值案例。",
          "U 和 V 都到达 P，横坐标仍用 x_P，纵坐标仍用 y_P。",
        ],
        targets: ["UV", "W", "W"],
      },
      {
        id: "SP29",
        text: "W 即使在 P 结束，也仍包含 P",
        first: "闭端点对夹层推广的作用",
        action: "核对共同存在条件，尚不预设 W 的边界高度",
        captions: [
          "沿用第二章《为什么不会漏掉交点》的无事件区间，W 在紧邻 P 左侧不会提前结束。",
          "这次还允许它恰好在 P 结束；闭线段包含结束端点，所以到 P 仍存在。",
          "共同存在和左侧夹层的条件仍满足。",
        ],
        targets: ["interval", "W", "W"],
      },
      {
        id: "SP33",
        math: "y_W(x_P)=y_P",
        first: "中间者也必须参加",
        action: "引用夹层结论使 W 汇入 P，解释连续块的新增用途",
        captions: [
          "直接引用第二章《为什么不会漏掉交点》的夹层结论：U 和 V 到达同一个 P，中间的 W 也经过 P。",
          "本章允许共点，所以这次要把 W 一起收进相遇块。",
          "所有夹在最下和最上参与者之间的旧成员都要收进来，因此旧参与者连续成块。",
          "不能照搬任意两条交叉前必相邻的结论。",
        ],
        targets: ["W", "W", "UV", "P"],
      },
    ],
  }),
  page({
    id: "height-search",
    section: 3,
    title: "在旧顺序中定位整段相等者",
    source: "第三节：精确高度有序定位",
    diagram: "collect",
    steps: [
      {
        id: "SP34",
        text: "把旧成员高度取在 x_P，仍从下到上不递减",
        first: "边界高度仍有序",
        action: "从下到上检查旧顺序，允许高度相等",
        captions: [
          "沿用第二章的边界高度结论，把所有旧成员的高度都取在 x_P，顺序仍从下到上不递减，允许相等。",
        ],
        targets: ["old"],
      },
      {
        id: "SP35",
        text: "有序定位第一条不低于 y_P 的成员",
        first: "有序查找的起点",
        action: "先定位块首，不从所有输入逐个配对",
        captions: [
          "现在可以按精确高度，有序定位第一条不低于 y_P 的旧成员。",
          "利用已经维护的顺序来找块首，不必每次遍历所有输入；这里说明查找用途，不展开容器代码。",
        ],
        targets: ["search", "old"],
      },
      {
        id: "SP36",
        text: "等于 y_P 就沿块收集；遇到不等便停止",
        first: "相等块的取出与空块",
        action: "依次选中旧块每个成员，核对结束身份",
        captions: [
          "若第一条等于 y_P，就沿相等者逐条取出，直到遇见不相等者。",
          "若第一条已经更高，或根本没有不低于者，就没有相等块，只得到插入空隙。",
          "结束者也在旧块中，端点名单可核对其身份。",
        ],
        targets: ["collect-old", "search", "A"],
      },
    ],
  }),
  page({
    id: "collect",
    section: 3,
    title: "两路合并，为什么恰好找齐",
    source: "第三节：全部非零参与者与按身份去重",
    diagram: "collect",
    steps: [
      {
        id: "SP37",
        text: "旧相遇块，加上从 P 开始的非零输入",
        first: "开始者合并",
        action: "旧块 D、A、C 与开始者 B 汇入名单",
        captions: [
          "取得整个旧块后，再合并清单中从 P 开始的非零输入。",
          "本例旧块中的三份输入分别是 D、A 和 C，再把作为开始者的输入 B 加入名单，合并后得到四份参与者。结束者 A 仍然留在名单中，直到当前配对完成。",
        ],
        targets: ["old", "merge"],
      },
      {
        id: "SP38",
        text: "按原始编号去重，同一份输入只留一次",
        first: "合并单位是身份而非几何位置",
        action: "将重复读到的结束身份 A 指向同一名单项",
        captions: [
          "端点记录中也能读到 A 的结束身份，但 A 已在旧块中，不能再加一份。",
          "合并按原始编号去重；相同编号只留一次，不同编号即使同点也不能合并。",
        ],
        targets: ["A", "merge"],
        focus: ["原始编号", "同一份输入"],
      },
      {
        id: "SP39",
        text: "任一包含 P 的非零输入：左侧已活动，或从 P 开始",
        first: "不漏参与者的一般理由",
        action: "对应两路来源，保留完整名单",
        captions: [
          "任取一份包含 P 的非零非竖直输入：左端点若在 P 左边，它就在紧邻左侧活动，已由旧块收集。",
          "若左端点不在左边，只能恰好是 P，便在开始者名单中。这两路覆盖全部非零参与者。",
        ],
        targets: ["old", "B"],
      },
      {
        id: "SP40",
        text: "块外高度不等于 y_P；开始者由真实端点给出",
        first: "不多收旁观者的一般理由",
        action: "保留块边界，指出来源的准确性",
        captions: [
          "反过来，旧块里的成员覆盖 x_P 且精确等高，所以确实经过 P；",
          "块外成员高度不同，不经过 P。",
          "开始者则由真实端点给出。两路没有凭空加入旁观者。点输入稍后单列，当前论证只针对非零输入。",
        ],
      },
    ],
  }),
  page({
    id: "pairs",
    section: 4,
    title: "第四节：四份身份，六条结果",
    source: "第四节：四输入六对",
    diagram: "pairs",
    steps: [
      {
        id: "SP41",
        math: "A,B,C,D\\quad\\longrightarrow\\quad6\\text{ 个输入对}",
        first: "已有无序对枚举用于当前参与者名单",
        action: "显示当前六对共同指向 P，不重演逐行枚举",
        captions: [
          "第一章《逐对检查的基准方法》已经给出无序对的枚举结论。",
          "当前名单包含 A 与 B 这两份输入，还包含 C 与 D 这两份输入。这四份输入对应图中的六个不同输入对，每对的交集都是 P 这个点。",
        ],
        targets: ["identity", "all-pairs"],
      },
      {
        id: "SP43",
        text: "清单：一个 P；结果：六个不同原始输入对",
        first: "合并事件位置不合并结果身份",
        action: "六条输入对分别连向同一 P，不压成一条结果",
        captions: [
          "清单只处理一个 P，求交结果却保留六个输入对的身份。",
          "不能用一条这里有交点代替六条结果。",
          "这里列的是当前已找齐成员之间的报告，不是扫描所有原始输入对。",
        ],
        targets: ["all-pairs", "position", "position"],
      },
    ],
  }),
  page({
    id: "truth",
    section: 4,
    title: "任取一对，为什么完整交集就是 P",
    source: "第四节：报告真实且完整",
    steps: [
      {
        id: "SP44",
        text: "参与者都包含 P，任取两份至少共享 P",
        first: "一般的不多报理由",
        action: "从任意数量的参与者中任取两份，不限四输入",
        captions: [
          "六对只是数值案例，还需要对任意数量的参与者说明理由。",
          "每份参与者已经确认包含 P，所以任取两份，它们至少共享 P，不会报告一个不存在的交集。",
        ],
      },
      {
        id: "SP45",
        text: "若还共享另一点，就有非零长度重叠，与本章条件矛盾",
        first: "完整交集的唯一性",
        action: "引用第一章交集形状，直接接到当前排除条件",
        captions: [
          "引用第一章《我们究竟要求什么》的结论：两条闭线段若有两个不同公共点，就共享非零长度区间。",
          "本章不允许这种重叠，所以这两份的完整交集恰好只有 P。",
          "只要有点输入，也不可能出现第二个公共点。",
        ],
        focus: ["另一点", "非零长度重叠", "非零长度重叠"],
      },
    ],
  }),
  page({
    id: "unique",
    section: 4,
    title: "不漏、不多报，也不重复",
    source: "第四节：局部与跨事件唯一性",
    steps: [
      {
        id: "SP46",
        text: "当前不漏：真实交于 P 的一对，必都在完整名单中",
        first: "当前位置不漏报告",
        action: "将任意真实相交对接到参与者覆盖结论",
        captions: [
          "反过来，任意一对若在当前位置真实相交，两份都包含 P。",
          "参与者已找齐，它们便都在名单中；较小编号那一行必配到较大编号，所以当前位置没有漏报。",
        ],
      },
      {
        id: "SP47",
        text: "本次不重：只找更大编号，不配自身，也不反向再配",
        first: "复用无序对枚举的唯一性",
        action: "引用既有枚举结论，不重演第一章证明",
        captions: [
          "第一章《逐对检查的基准方法》已证明，只找更大原始编号，每个无序对恰好出现一次。",
          "这里直接把它用于当前名单，不配自身，也不把交换次序算成另一对。",
        ],
      },
      {
        id: "SP48",
        text: "跨事件不重：每对至多交于一点，同一精确位置只处理一次",
        first: "跨事件唯一性与本集边界",
        action: "连接唯一交点与唯一事件处理",
        captions: [
          "跨事件也不会重复：本章每对非空交集只能是一个点，而同一精确位置只处理一次。",
          "这是已到达位置的完整报告理由；",
          "没有端点提示的共点为何一定被预约，到下集再证明，不能提前假定已经解决。",
        ],
      },
    ],
  }),
  page({
    id: "points-input",
    section: 5,
    title: "第五节：点输入也有自己的身份",
    source: "第五节：两份重合点输入",
    diagram: "points",
    steps: [
      {
        id: "SP49",
        math: "Z_1:P\\longrightarrow P,\\quad Z_2:P\\longrightarrow P",
        first: "点输入 Z1、Z2；独立的 C 与两点案例",
        action: "只取 C，再用同尺度两幅图分别显示两个点身份",
        captions: [
          "现在只取 C，再取两份新输入 Z_1、Z_2，它们的两个端点都等于 P。",
          "两份各只有一个点，却有不同原始编号。图分开显示这两个重合身份，位置和尺度相同，没有挪动点。",
        ],
        targets: ["Z1", "Z2"],
      },
      {
        id: "SP50",
        text: "菱形只辨认点输入，不表示有面积",
        first: "点输入标记含义",
        action: "提示两幅图的同位置菱形与同一 C",
        captions: [
          "菱形只帮助辨认零长度输入，不表示它有面积。两幅图里的 C 是同一条线段。",
          "这些是新选取的点输入，不是把四输入案例悄悄换掉后仍声称同一组输入。",
        ],
        targets: ["Z1", "Z2"],
      },
      {
        id: "SP51",
        text: "点输入单列角色，在 P 的清单中按原始编号留一次",
        first: "点角色与去重",
        action: "每份点身份各进名单一次，不同时放进开始和结束名单",
        captions: [
          "若把点输入同时当开始者和结束者拼接，同一个编号可能被放两次。",
          "因此另设点输入角色，与非零开始者、结束者分开；在这个位置按原始编号各留一次。",
        ],
        targets: ["Z1", "Z2"],
        focus: ["原始编号", "点输入"],
      },
    ],
  }),
  page({
    id: "points-report",
    section: 5,
    title: "收进当前名单，再分别报告",
    source: "第五节：点与线段、点与点",
    diagram: "points",
    steps: [
      {
        id: "SP52",
        text: "先找齐非零参与者，再合并这里的点输入",
        first: "最终名单的第三路来源",
        action: "从 C 到 Z1、Z2，显示完整名单",
        captions: [
          "到达 P，先按前面的方法找齐非零参与者，再合并这里的点输入。",
          "这次名单包含线段 C，还有点输入 Z_1 和点输入 Z_2。同一位置不合并不同身份，同一身份也不重复加入。",
        ],
        targets: ["C", "points"],
      },
      {
        id: "SP53",
        math: "(C,Z_1),\\quad(C,Z_2),\\quad(Z_1,Z_2)",
        first: "三份参与者的三条结果",
        action: "依次提示线段与点、另一点、两点配对",
        captions: [
          "结果分别是 C 与 Z_1、",
          "C 与 Z_2，",
          "还有点输入 Z_1 与点输入 Z_2 之间的配对，",
          "每一对的完整交集都是 P。",
          "点与线段、点与点的精确判断引用第三章《从任意端点求出完整交集》第二节，",
          "这里新增的是它们在扫描中的收集与去向。",
        ],
        targets: ["CZ1", "CZ2", "Z1Z2", "P", "reference", "reference"],
      },
      {
        id: "SP54",
        text: "点输入只在 x=x_P 存在，不进入右侧活动顺序",
        first: "点输入的右侧去向",
        action: "点保留在当前位置，两侧成员只显示 C",
        captions: [
          "点输入只在横坐标等于 x_P 时存在；任意更大的横坐标都没有它的点。",
          "所以配对后不进入右侧活动顺序，不给它安排在 C 上方或下方，",
          "也不用凭空指定直线或斜率。",
          "本例两侧都只有 C。",
        ],
        targets: ["points", "C", "C", "C"],
        focus: ["不进入右侧活动顺序", null, null, null],
      },
    ],
  }),
  page({
    id: "pure-points",
    section: 5,
    title: "没有非零线段，事件仍然成立",
    source: "第五节：纯点与单点边界",
    diagram: "pure",
    steps: [
      {
        id: "SP55",
        text: "只取 Z_1、Z_2：报告一对，两侧活动顺序均空",
        first: "纯点事件",
        action: "不显示 C，单独配对两份点身份",
        captions: [
          "如果只取点输入 Z_1 和点输入 Z_2，没有非零线段，仍报告这一对对应 P。",
          "两侧活动顺序都为空，不能因为没有旧块或新块，就把当前点配对跳过去。",
        ],
        targets: ["Z1Z2", "points"],
      },
      {
        id: "SP56",
        text: "只取 Z_1：没有不同输入可配，结果为空",
        first: "单点输入事件",
        action: "只保留 Z1，不制造自配对",
        captions: [
          "若只取 Z_1，当前只有一个原始身份，配不出不同输入对。",
          "结果为空，但这个已知端点事件仍正常处理完毕。没有结果，不等于没有事件。",
        ],
        targets: ["Z1", "Z1"],
      },
    ],
  }),
  page({
    id: "point-endpoints",
    section: 5,
    title: "点落在闭端点，仍先参加这一次",
    source: "第五节：点与闭端点",
    diagram: "endpoint-point",
    steps: [
      {
        id: "SP57",
        text: "只取 A、Z_1：先报告，再让 A 结束",
        first: "点落结束端点",
        action: "左图显示 A、Z1，报告后标明无右侧成员",
        captions: [
          "点恰好落在闭端点也一样。先单独取 A 与 Z_1，报告这一对对应 P，然后 A 结束。",
          "点输入不进入右侧，这一案例右侧没有活动成员。",
        ],
        targets: ["AZ1", "Z1"],
      },
      {
        id: "SP58",
        text: "只取 B、Z_1：先报告，再由 B 单独继续",
        first: "点落开始端点",
        action: "右图独立显示 B、Z1，再提示 B 的继续",
        captions: [
          "再单独取 B 与 Z_1，先报告当前配对，然后只有 B 向右继续。",
          "这是另一个两输入案例，与左图分别处理；左图的非零输入记作 A，右图的非零输入记作 B。两次画出的 Z_1 不能算作两个身份，不能把两个案例误拼成四个身份。",
        ],
        targets: ["BZ1", "B"],
      },
      {
        id: "SP59",
        text: "多份点身份各与非零参与者配对，点之间也按编号配对",
        first: "任意多个同位置点的一般推广",
        action: "引用已建立的角色与无序配对规则",
        captions: [
          "更多同位置点输入时，每份都分别与每条非零参与者配对，点身份之间也按原始编号配对。",
          "点只有 P，不会带来另一个交点；",
          "保留不同身份、同一编号一次的规则，",
          "让先前的不漏、不多报、不重复理由继续成立。",
        ],
      },
    ],
  }),
  page({
    id: "closing",
    section: 5,
    title: "本集停在完整报告，下集再让扫描继续",
    source: "第一至五节：完成点与衔接",
    steps: [
      {
        id: "SP60",
        text: "旧相遇块＋非零开始者＋点输入，按原始身份合并",
        first: "完整参与者来源汇合",
        action: "汇合已讲三路，保留角色区别",
        captions: [
          "现在可以说清当前位置的完整名单从哪里来：精确高度找到旧相遇块，补入非零开始者，再合并点输入。",
          "按原始身份各留一次，结束者先参加闭端点报告，点输入只参加这一次。",
        ],
      },
      {
        id: "SP61",
        text: "思考：只处理预约的一对，会在哪一步漏掉其他身份？",
        first: "本集自检窗口",
        action: "只显示问题，保留八秒思考，不提前揭示答案",
        captions: [
          "先停一下：若只处理预约交点的那一对，会在哪一步漏掉其他身份？",
          "试着用旧相遇块、开始者和点输入三路说明，不需要重演整次扫描。",
        ],
        thinkAfter: 8,
      },
      {
        id: "SP62",
        text: "下集：整块更新、新邻接，以及无端点共点的发现理由",
        first: "下集承接而非本集已证结论",
        action: "仅列下集问题，不提前播放换序与发现证明",
        captions: [
          "本集已经解释到站后怎样找齐并完整报告。接下来还要筛选继续成员、排出整个右侧块、检查新增邻接。",
          "没有端点提示的共点为何一定能到站，也留给第四章下集。",
          "到这里，不把当前位置的完整处理当作整次扫描已经证明。",
        ],
      },
    ],
  }),
];

export const pages = Object.fromEntries(
  pageList.map((entry) => [entry.id, entry]),
);
export const shots = pageList.flatMap((entry) =>
  entry.steps.map((step, index) => ({
    ...step,
    page: entry.id,
    section: entry.section,
    source: entry.source,
    visibleStep: index + 1,
    retained: entry.steps.slice(0, index + 1).map((previous) => previous.id),
  })),
);
