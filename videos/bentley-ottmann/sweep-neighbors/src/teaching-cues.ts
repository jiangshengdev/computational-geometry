import {
  point,
  stroke,
  type TeachingCue,
} from "../../../shared/speech/teaching-cues.ts";
import {
  inputs,
  intersections,
  type InputId,
  type PointId,
} from "./sweep-state.ts";
const lines = (...ids: InputId[]) =>
  ids.map((id) =>
    stroke(...inputs[id].from, ...inputs[id].to, inputs[id].color),
  );
const mark = (id: PointId) => [point(...intersections[id].at)];
const cue = (
  phrase: string,
  marks: ReturnType<typeof lines> = [],
  keys: string[] = [],
): TeachingCue => ({ phrase, panels: { scan: marks }, keys });
const ends = (id: InputId, left: string, right: string, whole: string) => [
  cue(left, [point(...inputs[id].from, inputs[id].color)]),
  cue(right, [point(...inputs[id].to, inputs[id].color)]),
  cue(whole, lines(id)),
];
export const teachingCues: Record<string, TeachingCue[]> = {
  S07: [
    cue("先看 A", lines("A")),
    cue("横坐标零、纵坐标一的点", [point(0, 1, inputs.A.color)]),
    cue("横坐标十、纵坐标一的点", [point(10, 1, inputs.A.color)]),
    cue("O 表示原点", [point(0, 0)]),
  ],
  S08: ends(
    "B",
    "横坐标一、纵坐标三的点",
    "横坐标三、纵坐标三的点",
    "是一条较短的水平线段",
  ),
  S09: ends(
    "C",
    "横坐标二、纵坐标六的点",
    "横坐标九、纵坐标负一的点",
    "向右下方延伸",
  ),
  S10: ends(
    "D",
    "横坐标四、纵坐标零的点",
    "横坐标八、纵坐标四的点",
    "向右上方延伸",
  ),
  S11: [
    { ...cue("让一条竖直辅助线从左向右移动"), name: "intro-scan" },
    cue("这就是扫描线", [stroke(2.5, -1, 2.5, 6)]),
    cue("输入叫活动线段", lines("A", "B", "C")),
    cue("从下到上排列", [], ["order"]),
  ],
  S12: [
    cue("最下面是 A 这条线段", lines("A")),
    cue("中间是 B 这条线段", lines("B")),
    cue("最上面是 C 这条线段", lines("C")),
    cue("A 与 B 是一对邻居", lines("A", "B")),
    cue("B 与 C 是另一对邻居", lines("B", "C")),
    cue("A 与 C 之间还隔着 B", lines("B")),
  ],
  S13: [cue("第二份记录是待处理清单", [], ["queue"])],
  S14: [
    cue("第三份记录保存已报告结果", [], ["results"]),
    cue("只登记到清单", [], ["queue"]),
    cue("才报告对应输入对的交集", [], ["results"]),
  ],
  S18: [
    cue("A 开始", [point(0, 1, inputs.A.color)]),
    cue("把 A 放入活动顺序", [], ["order"]),
    cue("清单移去这个端点", [], ["queue"]),
  ],
  S19: [
    cue("B 从这里开始", [point(1, 3, inputs.B.color)]),
    cue("这时 A 与 B 成为一对新邻居", lines("A", "B")),
  ],
  S20: [
    cue("两条水平线段高度不同", lines("A", "B")),
    cue("结果记录也仍为空", [], ["results"]),
  ],
  S21: [
    cue("C 开始", [point(2, 6, inputs.C.color)]),
    cue("新出现的邻居是 B 与 C", lines("B", "C")),
  ],
  S22: [
    cue("检查 B 与 C", lines("B", "C")),
    cue("横坐标五、纵坐标三的点", [point(5, 3)]),
  ],
  S23: [
    cue("线段 bee 在横坐标为三的位置结束", [point(3, 3, inputs.B.color)]),
    cue("候选点的横坐标五超过三", [point(5, 3)]),
    cue("线段 A 和线段 C 之间还隔着 bee", lines("B")),
  ],
  S24: [cue("只检查它与上下邻居", lines("B", "C"))],
  S25: [
    cue("移去中间的 B", lines("B")),
    cue("A 与 C 成为邻居", lines("A", "C")),
  ],
  S26: [
    cue("检查 A 与 C", lines("A", "C")),
    cue("把它记作 P", mark("P")),
    cue("空心圆表示已经发现", mark("P")),
  ],
  S27: [
    cue("P 在 A 的两端之间", lines("A")),
    cue("也在 C 的两端之间", lines("C")),
    cue("横坐标七大于当前的三", mark("P")),
  ],
  S28: [
    cue("把 P 按横坐标七放入清单", [], ["P"]),
    cue("此时还没有报告结果", [], ["results"]),
  ],
  S30: [cue("原来被 B 隔开的上下两条", lines("A", "C"))],
  S32: [
    cue("横坐标四、纵坐标零的点", [point(4, 0, inputs.D.color)]),
    cue("此时只有线段 D 和线段 A 成为新的邻居", lines("D", "A")),
  ],
  S33: [cue("检查 D 与 A", lines("D", "A")), cue("记作 Q", mark("Q"))],
  S34: [
    cue("Q 在 A 和 D 的范围内", lines("A", "D")),
    cue("横坐标五大于当前的四", mark("Q")),
  ],
  S35: [
    cue("把 queue 加入清单", [], ["Q"]),
    cue("queue 排在 P 前面", [], ["queue"]),
  ],
  S36: [
    cue("扫描线到达 Q", mark("Q")),
    cue("输入对 A 与 D", lines("A", "D")),
    cue("实心圆表示已经报告", mark("Q"), ["results"]),
  ],
  S37: [
    cue("D 位于 A 下方", [
      point(4.65, 0.65, inputs.D.color),
      point(4.65, 1, inputs.A.color),
    ]),
    cue("D 升到 A 上方", [
      point(5.35, 1.35, inputs.D.color),
      point(5.35, 1, inputs.A.color),
    ]),
    cue("A 位于 D 下方", [], ["order"]),
  ],
  S38: [
    cue("A 与 D 仍互相相邻", lines("A", "D")),
    cue("新的邻居是 D 与 C", lines("D", "C")),
    cue("这个交点的名称是 R 点", mark("R")),
  ],
  S39: [
    cue("R 在 C 和 D 的范围内", lines("C", "D")),
    cue("把 R 登记到清单", [], ["R"]),
    cue("结果区仍然只有已经到达的 Q", mark("Q"), ["results"]),
  ],
  S40: [
    cue("A 与 C 之间暂时隔着 D", lines("D")),
    cue("先前登记的 P", [], ["P"]),
  ],
  S41: [cue("继续保留 P", mark("P"), ["P"])],
  S42: [
    cue("横坐标六的 R", mark("R"), ["R"]),
    cue("横坐标七的 P", mark("P"), ["P"]),
  ],
  S43: [cue("交换的就是 A 与 D", lines("A", "D"))],
  S44: [
    cue("这两条线段互相仍是邻居", lines("A", "D")),
    cue("新出现的外侧邻接", lines("D", "C")),
  ],
  S45: [cue("交换块两侧的新邻居", lines("D", "C"))],
  S46: [cue("刚交叉的这一对", lines("A", "D"))],
  S47: [
    cue("输入对 C 与 D", lines("C", "D")),
    cue("图中改成实心圆", mark("R"), ["results"]),
  ],
  S48: [
    cue("D 低于 C", [
      point(5.7, 1.7, inputs.D.color),
      point(5.7, 2.3, inputs.C.color),
    ]),
    cue("D 高于 C", [
      point(6.3, 2.3, inputs.D.color),
      point(6.3, 1.7, inputs.C.color),
    ]),
    cue("C 位于 D 下方", [], ["order"]),
  ],
  S49: [
    cue("新的邻居是 A 与 C", lines("A", "C")),
    cue("得到的仍是 P", mark("P")),
  ],
  S50: [
    cue("P 已经在清单中", [], ["P"]),
    cue("结果区也不能提前增加它", [], ["results"]),
  ],
  S51: [
    cue("输入对 A 与 C", lines("A", "C")),
    cue("P 也变成实心圆", mark("P"), ["results"]),
  ],
  S52: [
    cue("C 在 A 上方", [
      point(6.7, 1.3, inputs.C.color),
      point(6.7, 1, inputs.A.color),
    ]),
    cue("C 降到 A 下方", [
      point(7.3, 0.7, inputs.C.color),
      point(7.3, 1, inputs.A.color),
    ]),
    cue("C 位于 A 下方", [], ["order"]),
  ],
  S53: [
    cue("新的邻居是 A 与 D", lines("A", "D")),
    cue("这对邻居的交点是 queue", mark("Q")),
  ],
  S54: [cue("Q 已经位于扫描线左侧", mark("Q"))],
  S55: [
    cue("D 在这里结束", [point(8, 4, inputs.D.color)]),
    cue("移去后只剩两条线段", [], ["order"]),
  ],
  S56: [
    cue("C 在这里结束", [point(9, -1, inputs.C.color)]),
    cue("只剩 A", lines("A")),
  ],
  S57: [
    cue("A 也结束", [point(10, 1, inputs.A.color)]),
    cue("活动顺序和待处理清单都变空", [], ["order", "queue"]),
  ],
  S58: [
    cue("A 与 D 对应 queue", mark("Q"), ["results"]),
    cue("C 与 D 对应 R", mark("R"), ["results"]),
    cue("A 与 C 对应 P", mark("P"), ["results"]),
  ],
};
