// Confirmed narration and scene boundaries: CNB #189, Resolution comment.
export const fps = 30;
export const durationInFrames = 40 * fps;
export const scenes = [
  {
    id: "01-intersection",
    start: 0,
    end: 8,
    kicker: "从看图估计，到准确计算",
    title: "交点的坐标\n是多少？",
    note: "看图可以估计，怎样准确算出来？",
    narration:
      "这两条线段相交了。交点的坐标是多少？看图可以估计，但怎样才能准确算出来？",
  },
  {
    id: "02-equations",
    start: 8,
    end: 18,
    kicker: "交点同时满足两个条件",
    title: "同时在\n两条直线上",
    note: "分别写成方程，再联立求交点。",
    narration:
      "交点同时在这两条线段所在的直线上。如果把两条直线分别写成方程，就可以联立方程，求出交点。",
  },
  {
    id: "03-endpoints",
    start: 18,
    end: 29,
    kicker: "这一节，先解决第一步",
    title: "知道两个端点，\n怎样写出\n直线方程？",
    note: "求交点，是后面的任务。",
    narration:
      "不过，求交点是后面的任务。这一节，我们先解决第一步：知道两个端点，怎样写出它们所在直线的方程？",
  },
  {
    id: "04-line",
    start: 29,
    end: 40,
    kicker: "从两个点，到整条直线",
    title: "一个等式，\n怎样表示\n一条直线？",
    note: "用一个等式描述这整条直线。",
    narration:
      "我们知道了点的位置，接下来要用一个等式描述这整条直线。先来看看：一个等式，怎样表示一条直线？",
  },
] as const;
