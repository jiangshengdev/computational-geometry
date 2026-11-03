/** Display phrases with explicit spoken equivalents for mathematical notation. */
export type Gesture = { phrase: string; target: string; speechPhrase?: string };
export const cues: Record<string, Gesture[]> = {
  ES07: [{ phrase: "延长线相交", target: "extension" }],
  ES08: [
    { phrase: "判空时", target: "finite" },
    { phrase: "继续查严格未来", target: "gate" },
  ],
  ES09: [{ phrase: "延长线交点", target: "extension" }],
  ES10: [
    { phrase: "H 点", target: "h" },
    { phrase: "K 点", target: "k" },
  ],
  ES11: [
    { phrase: "x_H 小于 x_K", speechPhrase: "x H 小于 x K", target: "order" },
    { phrase: "先处理 H", target: "h" },
  ],
  ES12: [
    { phrase: "较右事件", target: "k" },
    { phrase: "较左事件", target: "h" },
  ],
  ES13: [
    { phrase: "真实交点", target: "record-p" },
    { phrase: "清单中待核对", target: "record-q" },
  ],
  ES14: [
    { phrase: "横坐标相等", target: "record-x" },
    { phrase: "纵坐标也相等", target: "record-y" },
  ],
  ES15: [{ phrase: "保留原来的一份", target: "record-q" }],
  ES17: [
    { phrase: "位置相同", target: "record-x" },
    { phrase: "输入对相同", target: "pair" },
  ],
  ES19: [{ phrase: "x₀", speechPhrase: "x 零", target: "current" }],
  ES20: [
    {
      phrase: "交点横坐标 x_P",
      speechPhrase: "交点横坐标 x P",
      target: "candidate",
    },
    { phrase: "当前位置 x₀", speechPhrase: "当前位置 x 零", target: "current" },
    {
      phrase: "这个差记作 f_P",
      speechPhrase: "这个差记作 f P",
      target: "difference",
    },
  ],
  ES21: [{ phrase: "交点严格在右侧", target: "future-positive" }],
  ES22: [{ phrase: "横坐标与当前位置相等", target: "future-zero" }],
  ES23: [{ phrase: "交点在当前位置左侧", target: "future-negative" }],
  ES28: [{ phrase: "同一个横坐标", target: "scan" }],
  ES29: [
    { phrase: "S₁", speechPhrase: "S 一", target: "s1" },
    { phrase: "S₂", speechPhrase: "S 二", target: "s2" },
  ],
  ES30: [
    { phrase: "同一个横坐标 x", target: "scan" },
    { phrase: "y_i(x)", speechPhrase: "y i 括号 x", target: "height" },
  ],
  ES31: [
    { phrase: "第二份高度", target: "height2" },
    { phrase: "第一份", target: "height1" },
  ],
  ES32: [{ phrase: "两份高度", target: "height" }],
  ES33: [{ phrase: "第二份在第一份上方", target: "height2" }],
  ES37: [
    { phrase: "真实交点 P", target: "intersection" },
    { phrase: "高度相等", target: "intersection" },
  ],
  ES38: [{ phrase: "斜率", target: "slopes" }],
  ES39: [
    { phrase: "右侧高度差", target: "right" },
    { phrase: "左侧相反", target: "left" },
  ],
  ES40: [
    { phrase: "右侧第二份在上", target: "right" },
    { phrase: "左侧就在下", target: "left" },
  ],
  ES41: [{ phrase: "交换", target: "intersection" }],
};
