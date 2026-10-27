export const pages = {
  opening: {
    holdAfterSeconds: 5,
    lines: ["水平输入", "竖直输入", "原点输入", "同图提问"],
  },
};

export const shots = [
  {
    id: "U01",
    page: "opening",
    step: 1,
    caption:
      "先看三份输入。第 1 份从 (-1,0) 到 (1,0)，是一条经过原点的水平线段。",
  },
  {
    id: "U02",
    page: "opening",
    step: 2,
    caption: "第 2 份从 (0,-1) 到 (0,1)，是一条经过原点的竖直线段。",
  },
  {
    id: "U03",
    page: "opening",
    step: 3,
    caption:
      "第 3 份的两个端点都是 (0,0)，它只包含原点这一个点。这仍然是一份独立输入，菱形只是帮助我们认出它，不表示有面积。",
  },
  {
    id: "U04",
    page: "opening",
    step: 4,
    pauseAfter: 5,
    caption:
      "把它们放在一起，公共位置只有原点。求交结果应该记几条？先想一想，我们暂时不揭晓答案。",
  },
];
