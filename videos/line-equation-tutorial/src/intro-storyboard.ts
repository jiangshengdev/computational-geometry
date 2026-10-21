import { chapters } from "./timeline";

// Intro visual content recovered from the original #189 implementation.
const visuals: Record<string, { kicker: string; title: string; note: string }> =
  {
    "189-1": {
      kicker: "从看图估计，到准确计算",
      title: "交点的坐标\n是多少？",
      note: "看图可以估计，怎样准确算出来？",
    },
    "189-2": {
      kicker: "交点同时满足两个条件",
      title: "同时在\n两条直线上",
      note: "分别写成方程，再联立求交点。",
    },
    "189-3": {
      kicker: "这一节，先解决第一步",
      title: "知道两个端点，\n怎样写出\n直线方程？",
      note: "求交点，是后面的任务。",
    },
    "189-4": {
      kicker: "从两个点，到整条直线",
      title: "一个等式，\n怎样表示\n一条直线？",
      note: "用一个等式描述这整条直线。",
    },
  };

export const scenes = chapters[0].rows.map((row) => ({
  ...row,
  ...visuals[row.id],
}));
