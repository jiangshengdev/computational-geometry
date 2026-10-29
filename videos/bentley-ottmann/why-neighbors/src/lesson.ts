import { proofPages } from "./storyboard.ts";
import { captionPlans } from "./caption-plan.ts";
import {
  left,
  equals,
  type TeachingGroup,
} from "../../../shared/math/math-lines.ts";

type Line = { text?: string; math?: string };
export type Page = {
  title: string;
  lines: Line[];
  groups: TeachingGroup[];
  holdAfterSeconds: number;
  diagram?: "difference" | "position" | "adjacent" | "neighbors" | "missed";
  basis?: string;
};
const text = (value: string): Line => ({ text: value });
const math = (value: string): Line => ({ math: value });
const page = (
  title: string,
  lines: Line[],
  extra: Partial<Page> = {},
): Page => ({
  title,
  lines,
  groups: [left(lines.length)],
  holdAfterSeconds: 1,
  ...extra,
});
export const pages: Record<string, Page> = {
  bridge: page("为什么不会漏掉交点", [
    text("一个案例成功，还不是一般证明"),
    text("只在本章已说明的简化条件下证明"),
  ]),
  conditions: page("本章的简化条件", [
    text("线段不竖直、有长度"),
    text("无重叠、端点接触、多线共点"),
    text("端点和交点的横坐标互不相同"),
    text("结果仍按原始无序输入对记录"),
  ]),
  difference: page(
    "顺序颠倒，意味着高度差变号",
    [text("没有端点：活动成员不变"), text("上下顺序颠倒：高度差改变正负")],
    { diagram: "difference" },
  ),
  linear: page(
    "两条直线的高度差",
    [
      math("y=mx+b"),
      text("m、b 是固定的数"),
      math("d(x)=ax+b"),
      text("a、b 是高度差的系数"),
    ],
    { diagram: "difference" },
  ),
  constant: page(
    "先排除常数情形",
    [
      math("a=0"),
      text("高度差为常数，不会变号"),
      text("常数为零：两条直线重合"),
      text("同时活动一段区间：重叠，已排除"),
    ],
    { basis: "d(x)=ax+b" },
  ),
  position: page(
    "从左边的位置走向右边",
    [
      math("u<v,\\quad d(u)>0,\\quad d(v)<0"),
      text("t：从 u 向 v 走过的路程比例"),
      math("x=u+t(v-u),\\quad 0<t<1"),
    ],
    { diagram: "position" },
  ),
  expand: page(
    "代入、展开、分组",
    [
      math("d(u+t(v-u))=a(u+t(v-u))+b"),
      math("{}=au+at(v-u)+b"),
      math("{}=(au+b)+t(av-au)"),
    ],
    { groups: [equals(3)], holdAfterSeconds: 2, basis: "d(x)=ax+b" },
  ),
  substitute: page(
    "把两端的高度差代回来",
    [
      math("au+b=d(u)"),
      math("av-au=(av+b)-(au+b)"),
      math("{}=d(v)-d(u)"),
      math("d(u+t(v-u))=d(u)+t(d(v)-d(u))"),
    ],
    {
      groups: [equals(3), left(1)],
      holdAfterSeconds: 2,
      basis: "d(u+t(v-u))=(au+b)+t(av-au)",
    },
  ),
  solve: page(
    "找一个高度差等于零的位置",
    [
      math("d(u)+t(d(v)-d(u))=0"),
      math("t(d(v)-d(u))=-d(u)"),
      math("d(u)=t(d(u)-d(v))"),
    ],
    {
      groups: [equals(3)],
      holdAfterSeconds: 2,
      basis: "d(u+t(v-u))=d(u)+t(d(v)-d(u))",
    },
  ),
  fraction: page(
    "这个位置确实在两端之间",
    [
      math("d(u)>0,\\quad d(v)<0"),
      math("d(u)-d(v)>d(u)>0"),
      math("t=\\frac{d(u)}{d(u)-d(v)}"),
      math("0<t<1"),
    ],
    { holdAfterSeconds: 2, basis: "d(u)=t(d(u)-d(v))" },
  ),
  noEvents: page(
    "没有事件，就不会换序",
    [
      text("两条线段在 u 与 v 之间已经相交"),
      text("从负变正：交换相减次序，结论相同"),
      text("无端点、无交点：成员和上下顺序不变"),
    ],
    { diagram: "position" },
  ),
  choose: page(
    "任取一个交点",
    [
      text("p：交点的横坐标；U、V：交叉线段"),
      text("有限事件，横坐标各不相同"),
      text("选足够靠近的 u：中间没有其他事件"),
    ],
    { diagram: "adjacent" },
  ),
  between: page(
    "假设还隔着一条线段",
    [
      text("U 在下，V 在上，中间夹着 W"),
      text("没有事件：W 一直夹在两者之间"),
      text("W 不能中途结束，也不能恰在 p 结束"),
    ],
    { diagram: "adjacent" },
  ),
  squeeze: page(
    "到交点处，中间高度只能相等",
    [
      text("y_U(p)：U 在横坐标 p 处的高度"),
      math("y_U(p)\\le y_W(p)\\le y_V(p)"),
      math("y_U(p)=y_V(p)"),
      text("三线共点，与简化条件矛盾"),
    ],
    { diagram: "adjacent", holdAfterSeconds: 2 },
  ),
  adjacent: page(
    "交叉前必定成为邻居",
    [text("不要求从一开始就是邻居"), text("只要求交叉前已经成为邻居")],
    { diagram: "adjacent" },
  ),
  newNeighbors: page(
    "每对新邻居，形成时就检查",
    [
      text("初始为空；开始只检查插入位置两侧"),
      text("结束：连接原两侧，缺侧则无新邻接"),
      text("交叉：只在交换块外侧"),
      text("无事件：不会突然出现新邻接"),
    ],
    { diagram: "neighbors", holdAfterSeconds: 2 },
  ),
  earliest: page(
    "假设有漏点，选最早的一个",
    [text("不能预先假定所有交点都已处理"), text("p：漏掉的交点中的最小横坐标")],
    { diagram: "missed", holdAfterSeconds: 2 },
  ),
  earlier: page(
    "只使用 p 左侧已处理的事件",
    [
      text("所有端点最初就在清单中"),
      text("p 左侧没有漏点：此前事件已正确处理"),
      text("交叉前已相邻：形成邻接时已检查"),
    ],
    { diagram: "missed", holdAfterSeconds: 2 },
  ),
  contradiction: page(
    "清单不可能跳过这个交点",
    [
      text("横坐标为 p 的交点在两段内且位于未来"),
      text("加入清单；暂时失邻也不删除"),
      text("按位置取出，不可能跳过 p"),
      text("与漏掉 p 矛盾：不存在第一个漏点"),
    ],
    { diagram: "missed", holdAfterSeconds: 2 },
  ),
  correct: page("不多报，也不重复报告", [
    text("求交与范围检查：报告的点真实有效"),
    text("同一交叉只登记一次，到达时才报告"),
    text("每对至多一个交点：同一输入对不重复"),
  ]),
  work: page("省下的是哪些工作", [
    text("开始最多检查 2 对；结束最多 1 对"),
    text("普通交叉最多检查 2 对"),
    text("无事件时，不用更新活动顺序"),
    text("避免每次变化都重新检查所有输入对"),
  ]),
  limits: page("局部检查少，不等于总成本固定", [
    text("总检查数不固定，也不保证求交次数更少"),
    text("同一对线段可能再次成为邻居"),
    text("交点多，必须输出的结果也多"),
    text("维护顺序和清单同样有代价"),
  ]),
  next: page("从邻居规则，走向精确判断", [
    text("不断更新的邻居，足以发现所有交点"),
    text("下一章：怎样让几何判断保持精确"),
  ]),
};

// The narrative groups in storyboard.ts may span several physical pages.
// Each row reveals complete lines before their corresponding spoken clauses.
const placement: [string, number][] = [
  ["bridge", 2],
  ["conditions", 4],
  ["difference", 2],
  ["linear", 4],
  ["constant", 4],
  ["position", 1],
  ["position", 3],
  ["expand", 3],
  ["substitute", 4],
  ["solve", 3],
  ["fraction", 4],
  ["noEvents", 3],
  ["choose", 1],
  ["choose", 3],
  ["between", 2],
  ["between", 3],
  ["squeeze", 1],
  ["squeeze", 4],
  ["adjacent", 2],
  ["newNeighbors", 1],
  ["newNeighbors", 2],
  ["newNeighbors", 4],
  ["earliest", 2],
  ["earlier", 2],
  ["earlier", 3],
  ["contradiction", 3],
  ["contradiction", 4],
  ["correct", 3],
  ["work", 4],
  ["limits", 4],
  ["next", 2],
];
export const shots = proofPages
  .flatMap((group) => group.shots)
  .map(([id, caption, action], index) => ({
    id,
    caption,
    captionPlan: captionPlans[id],
    action,
    page: placement[index][0],
    step: placement[index][1],
    ...(id === "N15" || id === "N23" ? { pauseAfter: 5 } : {}),
  }));
export type Shot = (typeof shots)[number];
