/** Semantic anchors resolved against measured speech by operation-timing.ts. */
export const visualCues: Record<string, { name: string; phrase: string }[]> = {
  OR09: [{ name: "addA", phrase: "加入后只有它自己" }],
  OR10: [{ name: "AB", phrase: "这一对的交集" }],
  OR11: [{ name: "addB", phrase: "再把自己加入" }],
  OR12: [
    { name: "AC", phrase: "先与旧成员 A 配对" },
    { name: "BC", phrase: "再与旧成员 B 配对" },
  ],
  OR13: [{ name: "addC", phrase: "再把输入 C 加入组内" }],
  OR14: [
    { name: "endC", phrase: "输入 C 结束" },
    { name: "endA", phrase: "输入 A 结束" },
    { name: "endB", phrase: "最后一份也结束" },
  ],
  OR16: [
    { name: "addJ1", phrase: "第一份先加入" },
    { name: "J12", phrase: "第二份与已加入的第一份报告完整区间" },
    { name: "addJ2", phrase: "再加入" },
  ],
  OR17: [
    { name: "J13", phrase: "第三份再与前面两份分别配对" },
    { name: "J23", phrase: "第三份再与前面两份分别配对" },
    { name: "addJ3", phrase: "最后加入" },
  ],
  OR19: [
    { name: "BE", phrase: "开始者先与尚未移去的结束者配对" },
    { name: "endB", phrase: "随后旧成员退出" },
  ],
  OR34: [
    { name: "AD", phrase: "水平组的输入 A 与绿色输入配对" },
    { name: "BD", phrase: "再让输入 B 与绿色输入配对" },
  ],
  OR36: [
    { name: "AZ", phrase: "点输入先与水平组中的两份当前成员分别配对" },
    {
      name: "BZ",
      phrase: "点输入先与水平组中的两份当前成员分别配对",
    },
    { name: "DZ", phrase: "再与绿色输入配对" },
  ],
};
