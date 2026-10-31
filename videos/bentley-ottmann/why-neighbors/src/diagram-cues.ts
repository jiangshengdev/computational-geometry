/** Exact phrases in the existing WAV transcript; no synthetic animation clock. */
export const diagramCues: Record<string, Record<string, string>> = {
  opening: {
    height: "先研究高度差",
    stable: "再证明没有事件就不会换序",
    adjacent: "接着证明两条线段交叉之前必定相邻",
    check: "然后把几何结论接到扫描规则",
    contradiction: "一步步推出矛盾",
  },
  conditions: {
    horizontal: "水平线段可以出现",
    overlap: "我们排除线段重叠",
    contact: "也排除端点落在另一条线段上的接触",
    triple: "还排除三条或更多线段经过同一个点",
    distinct: "所有端点和交点的横坐标各不相同",
  },
  recall: {
    order: "按照高度从下往上排列",
    neighbor: "它们才是直接相邻的邻居",
    endpoints: "所有端点一开始就登记到待处理清单",
    future: "也把它登记进去",
    unique: "同一交叉只保留一份记录",
    take: "保留到按位置取出",
    report: "到达时再报告",
  },
  "general-lines": { positive: "差为正", zero: "差为零", negative: "差为负" },
  "common-interval": {
    left: "把左端位置叫作小写字母 u",
    right: "右端位置叫作小写字母 v",
    positive: "先研究左端高度差为正",
    negative: "右端高度差为负的情况",
  },
  "no-events": {
    crossing: "编号十四就保证中间有交点",
    contradiction: "这却与区间内没有交点矛盾",
  },
  "w-exists": {
    endpoint: "这里就出现了一个端点事件",
    same: "端点事件与选定交点的横坐标就相同",
  },
  "lower-bound": {
    left: "在左侧位置 r 处为正",
    right: "在右侧位置 p 处为负",
    crossing: "编号十四保证它们在内部相交",
  },
  "upper-bound": {
    left: "左侧由夹层假设得到负数",
    right: "右侧由新的假设得到正数",
    crossing: "编号十四又保证内部有交点",
  },
  soundness: {
    extension: "因此不会把延长线交点或凭图猜的点报告出来",
    unique: "同一交叉只登记一份",
    pair: "代表同一对输入",
  },
  "local-work": {
    start: "开始时只看插入位置的两侧",
    end: "结束时只连接原来被隔开的两侧",
    swap: "普通交叉只检查换序块外侧的新邻接",
  },
  "no-missing": {
    check: "最后形成邻接时接受检查",
    valid: "检查确认它是合法的未来交点",
    registered: "于是登记",
    kept: "接着记录保留",
    taken: "按序取出",
    reported: "到达并报告",
  },
  closing: {
    height: "两端异号就有内部交点",
    stable: "先排除没有事件时的换序",
    adjacent: "再排除交叉前的夹层",
    check: "接上三类事件的新邻接检查",
    contradiction: "最早漏点就会产生矛盾",
  },
};
export type DiagramCueState = {
  shown: string[];
  active?: string;
  progress: number;
};
