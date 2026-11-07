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
  OR21: [
    { name: "endsI", phrase: "第一份的左端横坐标" },
    { name: "endsJ", phrase: "另一份的左端横坐标" },
  ],
  OR22: [{ name: "orders", phrase: "两份的开始位置只有" }],
  OR23: [
    { name: "overlap", phrase: "如果两份相交" },
    { name: "apart", phrase: "否则第一份在第二份开始以前已经结束" },
  ],
  OR24: [
    { name: "inside", phrase: "它仍然穿过当前位置" },
    { name: "touch", phrase: "若恰好等于它的右端" },
    { name: "kept", phrase: "它作为结束者仍保留到报告以后" },
  ],
  OR26: [
    { name: "first", phrase: "先处理者已经在组里" },
    { name: "pair", phrase: "后处理者必能配到它" },
  ],
  OR27: [
    { name: "once", phrase: "这对就在后加入者的这一次加入中产生" },
    { name: "noRepeat", phrase: "以后的结束和外部交叉不再枚举旧同线成员对" },
  ],
  OR28: [
    { name: "sharedPoint", phrase: "而且都包含当前点" },
    { name: "apart", phrase: "分离的同线输入不会同时进入这样的配对名单" },
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
  OR38: [
    { name: "groupPair", phrase: "先逐个取不同的无序组对" },
    {
      name: "expand",
      phrase: "再把一组每个当前参与成员与另一组每个当前参与成员配对",
    },
    { name: "unique", phrase: "同一组对只展开一次" },
  ],
  OR39: [{ name: "pointOnly", phrase: "却已经共享当前点" }],
  OR40: [
    { name: "pointIdentities", phrase: "同位置不同点身份之间也各配一次" },
    { name: "pointsOnly", phrase: "即使没有非零组仍然执行" },
  ],
};
