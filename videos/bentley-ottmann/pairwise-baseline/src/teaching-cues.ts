import {
  point as p,
  stroke as s,
  type TeachingCue,
} from "../../../shared/speech/teaching-cues.ts";

export const teachingCues: Record<string, TeachingCue[]> = {
  D01: [
    {
      phrase: "横坐标零、纵坐标零的点",
      panels: { inputs: [p(0, 0, "#2563a6")] },
    },
    {
      phrase: "横坐标二、纵坐标零的点",
      panels: { inputs: [p(2, 0, "#2563a6")] },
    },
    {
      phrase: "横坐标零、纵坐标一的点",
      panels: { inputs: [p(0, 1, "#8a4e9f")] },
    },
    {
      phrase: "横坐标二、纵坐标一的点",
      panels: { inputs: [p(2, 1, "#8a4e9f")] },
    },
  ],
  D02: [
    {
      phrase: "横坐标零、纵坐标二的点",
      panels: { inputs: [p(0, 2, "#b45309")] },
    },
    {
      phrase: "横坐标二、纵坐标二的点",
      panels: { inputs: [p(2, 2, "#b45309")] },
    },
    {
      phrase: "横坐标零、纵坐标三的点",
      panels: { inputs: [p(0, 3, "#23765a")] },
    },
    {
      phrase: "横坐标二、纵坐标三的点",
      panels: { inputs: [p(2, 3, "#23765a")] },
    },
    {
      phrase: "横坐标范围都是零到二",
      panels: {
        inputs: [
          s(0, 0, 2, 0, "#2563a6"),
          s(0, 1, 2, 1, "#8a4e9f"),
          s(0, 2, 2, 2, "#b45309"),
          s(0, 3, 2, 3, "#23765a"),
        ],
      },
    },
  ],
  D03: [
    {
      phrase: "一个点不可能同时处在两个高度",
      panels: {
        inputs: [
          p(1, 0, "#2563a6"),
          p(1, 1, "#8a4e9f"),
          p(1, 2, "#b45309"),
          p(1, 3, "#23765a"),
        ],
      },
    },
  ],
  D07: [
    { phrase: "先取输入一", panels: { inputs: [s(0, 0, 2, 0, "#2563a6")] } },
    {
      phrase: "与输入二配对",
      panels: { inputs: [s(0, 1, 2, 1, "#8a4e9f")] },
    },
  ],
  D08: [
    { phrase: "仍然取输入一", panels: { inputs: [s(0, 0, 2, 0, "#2563a6")] } },
    {
      phrase: "再与输入三",
      panels: { inputs: [s(0, 2, 2, 2, "#b45309")] },
    },
    {
      phrase: "输入四配对",
      panels: { inputs: [s(0, 3, 2, 3, "#23765a")] },
    },
    {
      phrase: "一与二",
      panels: { inputs: [s(0, 0, 2, 0, "#2563a6"), s(0, 1, 2, 1, "#8a4e9f")] },
    },
    {
      phrase: "一与三",
      panels: { inputs: [s(0, 0, 2, 0, "#2563a6"), s(0, 2, 2, 2, "#b45309")] },
    },
    {
      phrase: "一与四",
      panels: { inputs: [s(0, 0, 2, 0, "#2563a6"), s(0, 3, 2, 3, "#23765a")] },
    },
  ],
  D09: [
    { phrase: "轮到输入二", panels: { inputs: [s(0, 1, 2, 1, "#8a4e9f")] } },
    {
      phrase: "所以检查二与三",
      panels: { inputs: [s(0, 1, 2, 1, "#8a4e9f"), s(0, 2, 2, 2, "#b45309")] },
    },
    {
      phrase: "二与四",
      panels: { inputs: [s(0, 1, 2, 1, "#8a4e9f"), s(0, 3, 2, 3, "#23765a")] },
    },
  ],
  D10: [
    {
      phrase: "输入三只与输入四配对",
      panels: { inputs: [s(0, 2, 2, 2, "#b45309"), s(0, 3, 2, 3, "#23765a")] },
    },
    { phrase: "到了输入四", panels: { inputs: [s(0, 3, 2, 3, "#23765a")] } },
  ],
  D12: [
    {
      phrase: "一与二",
      panels: { inputs: [s(0, 0, 2, 0, "#2563a6"), s(0, 1, 2, 1, "#8a4e9f")] },
    },
    {
      phrase: "一与三",
      panels: { inputs: [s(0, 0, 2, 0, "#2563a6"), s(0, 2, 2, 2, "#b45309")] },
    },
    {
      phrase: "一与四",
      panels: { inputs: [s(0, 0, 2, 0, "#2563a6"), s(0, 3, 2, 3, "#23765a")] },
    },
    {
      phrase: "零与一",
      panels: { inputs: [p(1, 0, "#2563a6"), p(1, 1, "#8a4e9f")] },
    },
    {
      phrase: "零与二",
      panels: { inputs: [p(1, 0, "#2563a6"), p(1, 2, "#b45309")] },
    },
    {
      phrase: "零与三",
      panels: { inputs: [p(1, 0, "#2563a6"), p(1, 3, "#23765a")] },
    },
  ],
  D13: [
    {
      phrase: "二与三",
      panels: { inputs: [s(0, 1, 2, 1, "#8a4e9f"), s(0, 2, 2, 2, "#b45309")] },
    },
    {
      phrase: "二与四",
      panels: { inputs: [s(0, 1, 2, 1, "#8a4e9f"), s(0, 3, 2, 3, "#23765a")] },
    },
    {
      phrase: "三与四",
      panels: { inputs: [s(0, 2, 2, 2, "#b45309"), s(0, 3, 2, 3, "#23765a")] },
    },
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
  ],
  D38: [
    {
      phrase: "几何上只有一段",
      panels: {
        output1: [s(0, 0, 4, 0)],
        output2: [s(0, 0, 4, 0)],
        output3: [s(0, 0, 4, 0)],
      },
    },
  ],
  D40: [
    {
      phrase: "四条互不相交线段",
      panels: {
        inputs: [
          s(0, 0, 2, 0, "#2563a6"),
          s(0, 1, 2, 1, "#8a4e9f"),
          s(0, 2, 2, 2, "#b45309"),
          s(0, 3, 2, 3, "#23765a"),
        ],
      },
    },
  ],
};
