type Reference = {
  id: string;
  name: string;
  text: string;
  visibleFrom?: number;
};
export const pageReferences: Record<string, Reference[]> = {
  "block-reuse": [
    {
      id: "squeeze-result",
      name: "第二章《为什么不会漏掉交点》的夹层结论",
      text: "共同存在、左侧无事件且 W 夹在 U、V 之间：y_U(x_P)\\le y_W(x_P)\\le y_V(x_P)。U、V 在 P 等高，则 W 也经过 P。",
      visibleFrom: 3,
    },
  ],
};
