import {
  point as p,
  stroke as s,
  type TeachingCue,
} from "../../../shared/speech/teaching-cues.ts";

export const teachingCues: Record<string, TeachingCue[]> = {
  D01: [
    { phrase: "横坐标零、纵坐标零的点", panels: { inputs: [p(0, 0)] } },
    { phrase: "横坐标二、纵坐标零的点", panels: { inputs: [p(2, 0)] } },
    { phrase: "横坐标零、纵坐标一的点", panels: { inputs: [p(0, 1)] } },
    { phrase: "横坐标二、纵坐标一的点", panels: { inputs: [p(2, 1)] } },
  ],
  D02: [
    { phrase: "横坐标零、纵坐标二的点", panels: { inputs: [p(0, 2)] } },
    { phrase: "横坐标二、纵坐标二的点", panels: { inputs: [p(2, 2)] } },
    { phrase: "横坐标零、纵坐标三的点", panels: { inputs: [p(0, 3)] } },
    { phrase: "横坐标二、纵坐标三的点", panels: { inputs: [p(2, 3)] } },
    {
      phrase: "横坐标范围都是零到二",
      panels: {
        inputs: [s(0, 0, 2, 0), s(0, 1, 2, 1), s(0, 2, 2, 2), s(0, 3, 2, 3)],
      },
    },
  ],
  D03: [
    {
      phrase: "一个点不可能同时处在两个高度",
      panels: { inputs: [p(1, 0), p(1, 1), p(1, 2), p(1, 3)] },
    },
  ],
  D07: [
    { phrase: "先取输入一", panels: { inputs: [s(0, 0, 2, 0)] } },
    {
      phrase: "与输入二配对",
      keys: ["1 与 2"],
      panels: { inputs: [s(0, 1, 2, 1)] },
    },
  ],
  D08: [
    { phrase: "仍然取输入一", panels: { inputs: [s(0, 0, 2, 0)] } },
    {
      phrase: "再与输入三",
      keys: ["1 与 3"],
      panels: { inputs: [s(0, 2, 2, 2)] },
    },
    {
      phrase: "输入四配对",
      keys: ["1 与 4"],
      panels: { inputs: [s(0, 3, 2, 3)] },
    },
    { phrase: "一与二", keys: ["1 与 2"] },
    { phrase: "一与三", keys: ["1 与 3"] },
    { phrase: "一与四", keys: ["1 与 4"] },
  ],
  D09: [
    { phrase: "轮到输入二", panels: { inputs: [s(0, 1, 2, 1)] } },
    {
      phrase: "所以检查二与三",
      keys: ["2 与 3"],
      panels: { inputs: [s(0, 1, 2, 1), s(0, 2, 2, 2)] },
    },
    {
      phrase: "二与四",
      keys: ["2 与 4"],
      panels: { inputs: [s(0, 1, 2, 1), s(0, 3, 2, 3)] },
    },
  ],
  D10: [
    {
      phrase: "输入三只与输入四配对",
      keys: ["3 与 4"],
      panels: { inputs: [s(0, 2, 2, 2), s(0, 3, 2, 3)] },
    },
    { phrase: "到了输入四", panels: { inputs: [s(0, 3, 2, 3)] } },
  ],
  D11: [
    { phrase: "三加二加一加零", keys: ["row-counts"] },
    { phrase: "一共检查六对", keys: ["checks"] },
  ],
  D12: [
    { phrase: "一与二", panels: { inputs: [s(0, 0, 2, 0), s(0, 1, 2, 1)] } },
    { phrase: "一与三", panels: { inputs: [s(0, 0, 2, 0), s(0, 2, 2, 2)] } },
    { phrase: "一与四", panels: { inputs: [s(0, 0, 2, 0), s(0, 3, 2, 3)] } },
    { phrase: "零与一", panels: { inputs: [p(1, 0), p(1, 1)] } },
    { phrase: "零与二", panels: { inputs: [p(1, 0), p(1, 2)] } },
    { phrase: "零与三", panels: { inputs: [p(1, 0), p(1, 3)] } },
    { phrase: "因此这三对交集为空", keys: ["empty"] },
  ],
  D13: [
    { phrase: "二与三", panels: { inputs: [s(0, 1, 2, 1), s(0, 2, 2, 2)] } },
    { phrase: "二与四", panels: { inputs: [s(0, 1, 2, 1), s(0, 3, 2, 3)] } },
    { phrase: "三与四", panels: { inputs: [s(0, 2, 2, 2), s(0, 3, 2, 3)] } },
    { phrase: "所以交集同样为空", keys: ["empty"] },
  ],
  D14: [
    { phrase: "这个逐对检查方法检查六对", keys: ["checks"] },
    { phrase: "最后没有结果", keys: ["empty"] },
  ],
  D16: [
    { phrase: "把较小的编号叫作 i", keys: ["i"] },
    { phrase: "较大的叫作 j", keys: ["j"] },
    { phrase: "因此 i 小于 j", keys: ["i", "j"] },
  ],
  D17: [
    { phrase: "处理编号 i 那一行时", keys: ["row-i"] },
    {
      phrase: "其中一定包括 j",
      through: "这一对必定被检查到",
      keys: ["row-i", "j-entry"],
    },
  ],
  D18: [
    { phrase: "较小编号 i 那一行", keys: ["row-i"] },
    { phrase: "较大编号 j 那一行", through: "不会回头找 i", keys: ["row-j"] },
  ],
  D19: [
    { phrase: "每个更大的编号只列一次", keys: ["row-i"] },
    { phrase: "j 也只出现一次", keys: ["j-entry"] },
  ],
  D20: [
    { phrase: "编号更大", keys: ["i", "j"] },
    {
      phrase: "也排除了相同编号",
      through: "不会把输入与自身配对",
      keys: ["self"],
    },
  ],
  D33: [
    { phrase: "没有输入", keys: ["zero"] },
    { phrase: "只有一份输入时", keys: ["one"] },
    { phrase: "都选不出两份不同的输入", keys: ["zero", "one"] },
  ],
  D34: [
    { phrase: "代入公式也都得到零", keys: ["zero-formula", "one-formula"] },
    {
      phrase: "零份输入时出现的负一只是代数表达式的一部分",
      through: "不能解释成有负一 种选择",
      keys: ["zero-formula"],
    },
  ],
  D35: [
    { phrase: "十份输入需要检查四十五对", keys: ["ten"] },
    {
      phrase: "一百份输入",
      through: "需要检查四千九百五十对",
      keys: ["hundred"],
    },
  ],
  D36: [
    { phrase: "一千份输入需要检查四十九万九千五百对", keys: ["thousand"] },
    { phrase: "检查对数和相交对数是两个不同的数量", keys: ["thousand"] },
  ],
  D37: [
    {
      phrase: "横坐标零、纵坐标零的点",
      panels: { output1: [p(0, 0)], output2: [p(0, 0)], output3: [p(0, 0)] },
    },
    {
      phrase: "横坐标四、纵坐标零的点",
      panels: { output1: [p(4, 0)], output2: [p(4, 0)], output3: [p(4, 0)] },
    },
    {
      phrase: "交集都是这条完整线段",
      panels: {
        output1: [s(0, 0, 4, 0)],
        output2: [s(0, 0, 4, 0)],
        output3: [s(0, 0, 4, 0)],
      },
    },
    { phrase: "输入身份仍然不同", keys: ["output1", "output2", "output3"] },
  ],
  D38: [
    {
      phrase: "如果要求逐条列出这些结果",
      through: "输出它们本身的工作",
      keys: ["output-count"],
    },
    {
      phrase: "几何上只有一段",
      panels: {
        output1: [s(0, 0, 4, 0)],
        output2: [s(0, 0, 4, 0)],
        output3: [s(0, 0, 4, 0)],
      },
    },
    { phrase: "不代表只需输出一条记录", keys: ["output-count"] },
  ],
  D40: [
    {
      phrase: "四条互不相交线段",
      panels: {
        inputs: [s(0, 0, 2, 0), s(0, 1, 2, 1), s(0, 2, 2, 2), s(0, 3, 2, 3)],
      },
    },
  ],
};
