import captions from "./full-captions.json" with { type: "json" };

export const lessonPages = {
  closed: {
    title: "闭线段与点输入",
    ids: ["U05", "U06", "U07"],
    lines: [
      "闭线段：包含两端之间所有点，也包含端点",
      "(5,0) 在延长线上，却不在线段上",
      "两个端点都是 (2,0)：只包含一个点",
    ],
    diagram: "closed",
    holdAfterSeconds: 3,
  },
  identity: {
    title: "几何重合，身份仍然不同",
    ids: ["U08", "U09", "U10"],
    lines: [
      "输入 1、2：(0,0) 到 (4,0)",
      "输入 3：(4,0) 到 (0,0)",
      "位置相同，仍保留三个输入身份",
    ],
    diagram: "identity",
    holdAfterSeconds: 3,
  },
  pairs: {
    title: "检查对象是无序输入对",
    ids: ["U11", "U12"],
    lines: [
      "1 与 2、2 与 1：同一个无序输入对",
      "取两份不同输入；排除输入与自身配对",
    ],
    diagram: "",
    holdAfterSeconds: 3,
  },
  empty: {
    title: "交集：两份输入共同包含的全部点",
    ids: ["U13", "U14", "U15"],
    lines: [
      "固定 A：(0,0) 到 (4,0)；y 表示纵坐标，y=0",
      "另一份：(0,1) 到 (4,1)；y=1",
      "纵坐标不能同时为 0 和 1：空交集，不留结果",
    ],
    diagram: "empty",
    holdAfterSeconds: 3,
  },
  crossing: {
    title: "内部交叉：一个公共点",
    ids: ["U16", "U17", "U18"],
    lines: [
      "另一份：(2,-1) 到 (2,1)；x 表示横坐标，x=2",
      "还要满足 A 的 y=0：唯一候选 (2,0)",
      "0≤2≤4，-1≤0≤1：交集恰好是 (2,0)",
    ],
    diagram: "crossing",
    holdAfterSeconds: 5,
  },
  touching: {
    title: "闭线段包含端点：端点接触也算相交",
    ids: ["U19", "U20"],
    lines: ["另一份：(4,0) 到 (6,0)", "公共点满足 x≤4 且 x≥4：交集是 (4,0)"],
    diagram: "touching",
    holdAfterSeconds: 5,
  },
  points: {
    title: "零长度输入仍按定义判断",
    ids: ["U21", "U22", "U23"],
    lines: [
      "点输入 (2,0) 在 A 上：交集为 (2,0)",
      "点输入 (5,0) 超出 A 的范围：空交集",
      "两份点输入：同点时交于一点，异点时为空",
    ],
    diagram: "points",
    holdAfterSeconds: 3,
  },
  overlap: {
    title: "完整重叠区间：两个方向都要说明",
    ids: ["U24", "U25", "U26", "U27"],
    lines: [
      "A：0≤x≤4；B：2≤x≤6；两者 y=0",
      "公共点必须满足 2≤x≤4",
      "反过来，2≤x≤4 同时满足两份输入范围",
      "完整交集：(2,0) 到 (4,0)；长度 4-2=2，也包含 (3,0)",
    ],
    diagram: "overlap",
    holdAfterSeconds: 5,
  },
  third: {
    title: "第三份输入不拆分原来的完整区间",
    ids: ["U28", "U29"],
    lines: [
      "加入 C：(3,-1) 到 (3,1)",
      "A 与 C、B 与 C：各有点结果 (3,0)；A 与 B：仍是完整区间",
    ],
    diagram: "third",
    holdAfterSeconds: 3,
  },
  question: {
    title: "从例子走向一般证明",
    ids: ["U30"],
    lines: ["为什么不会出现两段分开的公共部分？"],
    diagram: "",
    holdAfterSeconds: 3,
  },
  common: {
    title: "两个不同公共点，确定同一条直线",
    ids: ["U31", "U32", "U33"],
    lines: [
      "至少一份为点输入：交集只能为空或一点",
      "两份非零：讨论零个、一个、至少两个公共点",
      "P≠Q：两条所在直线都经过 P、Q，必定同线",
    ],
    diagram: "common",
    holdAfterSeconds: 5,
  },
  order: {
    title: "沿共同直线确定前后顺序",
    ids: ["U34", "U35"],
    lines: [
      "非竖直：按横坐标递增，一个横坐标对应一个点",
      "竖直：按纵坐标递增，一个纵坐标对应一个点",
    ],
    diagram: "order",
    holdAfterSeconds: 5,
  },
  bounds: {
    title: "确定完整公共部分的两端",
    ids: ["U36", "U37", "U38"],
    lines: [
      "L：两个较前端点中，更靠后的那个",
      "R：两个较后端点中，更靠前的那个",
      "任何公共点都不能早于 L，也不能晚于 R",
    ],
    diagram: "bounds",
    holdAfterSeconds: 5,
  },
  converse: {
    title: "反方向：中间每个点都属于交集",
    ids: ["U39", "U40", "U41"],
    lines: [
      "L 到 R 间每个点，都在两条线段各自的范围内",
      "已有 P≠Q 两个公共点，因此 L 必定在 R 前",
      "完整非零闭区间，中间不能断开；全部情况：空、点、非零区间",
    ],
    diagram: "converse",
    holdAfterSeconds: 5,
  },
  answer: {
    title: "回到开场：逐对回答",
    ids: ["U42", "U43", "U44", "U45"],
    lines: [
      "水平输入、竖直输入、原点输入：留下哪些结果？",
      "1 与 2：完整交集是 (0,0)",
      "1 与 3：完整交集是 (0,0)",
      "2 与 3：完整交集是 (0,0)",
    ],
    diagram: "answer",
    holdAfterSeconds: 3,
  },
  records: {
    title: "一个相交位置，三条输入对记录",
    ids: ["U46"],
    lines: [
      "一个相交位置，三个相交输入对：保留三条结果",
      "只写原点，会丢掉哪些输入彼此相交的信息",
    ],
    diagram: "records",
    holdAfterSeconds: 3,
  },
  repeated: {
    title: "重合输入也逐对保留完整交集",
    ids: ["U47", "U48"],
    lines: [
      "重看三份重合输入：(0,0) 到 (4,0)",
      "1 与 2、1 与 3、2 与 3：每对都是完整区间",
    ],
    diagram: "repeated",
    holdAfterSeconds: 3,
  },
  summary: {
    title: "我们究竟要求什么",
    ids: ["U49", "U50", "U51"],
    lines: [
      "找出原始输入中交集非空的无序输入对",
      "每个相交输入对保留一条结果：身份与完整交集",
      "点或完整非零重叠区间；空交集不留结果",
    ],
    diagram: "",
    holdAfterSeconds: 3,
  },
  next: {
    title: "下集：怎样把每一对都检查一遍",
    ids: ["U52"],
    lines: ["四条互不相交的线段：没有结果，还要做多少检查？"],
    diagram: "",
    holdAfterSeconds: 3,
  },
};

export const continuationShots = Object.entries(lessonPages).flatMap(
  ([page, data]) =>
    data.ids.map((id, index) => ({
      id,
      page,
      step: page === "records" ? 2 : index + 1,
      caption: captions[id as keyof typeof captions],
      ...(["U30", "U42"].includes(id) ? { pauseAfter: 5 } : {}),
    })),
);
