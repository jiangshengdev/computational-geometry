type Reference = {
  id: string;
  name: string;
  text: string;
  visibleFrom?: number;
};
export const pageReferences: Record<string, Reference[]> = {
  "block-bounds": [
    {
      id: "sign-change",
      name: "第二章的变号工具",
      text: "两段覆盖整区间；固定相减次序，端点高度差异号，则区间内部相交。",
    },
  ],
};
