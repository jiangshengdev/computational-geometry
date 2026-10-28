import captions from "./full-captions.json" with { type: "json" };
export const lessonPages = {
  opening: {
    title: "没有交集，还要检查吗？",
    ids: ["D01", "D02", "D03", "D04"],
    lines: [
      "输入 1：(0,0) 到 (2,0)；输入 2：(0,1) 到 (2,1)",
      "输入 3：(0,2) 到 (2,2)；输入 4：(0,3) 到 (2,3)",
      "四个高度不同：任何两份输入都没有公共点",
      "逐对检查方法，一共还要检查多少对？",
    ],
    diagram: "inputs",
    holdAfterSeconds: 3,
  },
  recap: {
    title: "回顾：每个相交输入对的完整交集",
    ids: ["D05", "D06"],
    lines: [
      "无序输入对 → 一个点或完整重叠区间",
      "取一对 → 求完整交集 → 空的略过，非空的记录",
    ],
    diagram: "",
    holdAfterSeconds: 3,
  },
  enumerate: {
    title: "从小编号开始，只找更大编号",
    ids: ["D07", "D08", "D09", "D10"],
    lines: [
      "输入 1：先与输入 2 配对",
      "输入 1：1 与 2、1 与 3、1 与 4",
      "输入 2：2 与 3、2 与 4",
      "输入 3：3 与 4；输入 4：没有新的一对",
    ],
    diagram: "enumerate",
    holdAfterSeconds: 5,
  },
  six: {
    title: "六次检查，零条结果",
    ids: ["D11", "D12", "D13", "D14"],
    lines: [
      "3+2+1+0=6：检查六对",
      "1 与 2、1 与 3、1 与 4：高度不同，均为空",
      "2 与 3、2 与 4、3 与 4：同样均为空",
      "检查 6 对 ／ 结果 0 条",
    ],
    diagram: "six",
    holdAfterSeconds: 5,
  },
  complete: {
    title: "为什么不会漏掉一对？",
    ids: ["D15", "D16", "D17"],
    lines: [
      "更多输入时，为什么仍然不漏、不重？",
      "任取两份不同输入：较小编号 i，较大编号 j，i<j",
      "第 i 行包含所有更大编号，其中一定包括 j",
    ],
    diagram: "proof",
    holdAfterSeconds: 5,
  },
  unique: {
    title: "只出现一次，也不会与自身配对",
    ids: ["D18", "D19", "D20"],
    lines: [
      "i<j：只能出现在第 i 行，第 j 行不会回头",
      "第 i 行中，每个更大编号只列一次",
      "更大编号排除相同编号：没有自身配对",
    ],
    diagram: "proof",
    holdAfterSeconds: 5,
  },
  correct: {
    title: "基准方法正确性的条件",
    ids: ["D21", "D22"],
    lines: [
      "单对完整交集正确，加上枚举不漏不重：每个相交输入对恰好留一条结果",
      "枚举证明不替代单对求交证明；作为后续算法的对照基准",
    ],
    diagram: "",
    holdAfterSeconds: 3,
  },
  small: {
    title: "不足两份输入",
    ids: ["D33", "D34"],
    lines: [
      "n=0 或 n=1：选不出两份不同输入，检查零对",
      "代入公式也是零；负一不是选择数量",
    ],
    diagram: "small",
    holdAfterSeconds: 5,
  },
  growth: {
    title: "输入增多，检查次数增长",
    ids: ["D35", "D36"],
    lines: [
      "10 份：45 对",
      "100 份：4950 对",
      "1000 份：499500 对；即使全部不相交",
    ],
    diagram: "growth",
    holdAfterSeconds: 5,
  },
  output: {
    title: "输出本身也需要工作",
    ids: ["D37", "D38"],
    lines: [
      "n 份输入，每份都是 (0,0) 到 (4,0)",
      "每对都相交：结果数也是 n(n-1) 除以 2",
    ],
    diagram: "output",
    holdAfterSeconds: 3,
  },
  cost: {
    title: "检查次数不是完整运行时间",
    ids: ["D39"],
    lines: [
      "几何判断与计算",
      "保存每一条结果",
      "精确数值运算：数字越长，运算可能越费力",
      "本章只数检查对数，不把每次检查当固定耗时",
    ],
    diagram: "",
    holdAfterSeconds: 3,
  },
  next: {
    title: "下一章：扫描线为什么只需关注邻居",
    ids: ["D40"],
    lines: [
      "四条互不相交线段：检查 6 对，结果 0 条",
      "能否利用位置关系少检查一些对，仍然找全结果？",
    ],
    diagram: "inputs",
    holdAfterSeconds: 3,
  },
};
export const continuationShots = Object.entries(lessonPages).flatMap(
  ([page, data]) =>
    data.ids.map((id, index) => ({
      id,
      page,
      step:
        page === "cost"
          ? 4
          : page === "next"
            ? 2
            : page === "growth"
              ? index + 2
              : index + 1,
      caption: captions[id as keyof typeof captions],
      ...(["D04", "D15"].includes(id) ? { pauseAfter: 5 } : {}),
    })),
);
