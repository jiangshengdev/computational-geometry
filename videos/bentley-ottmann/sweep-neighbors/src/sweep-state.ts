import { sweepColors } from "../../colors.ts";
export type InputId = "A" | "B" | "C" | "D";
export type PointId = "P" | "Q" | "R";
export const inputs: Record<
  InputId,
  { from: [number, number]; to: [number, number]; color: string }
> = {
  A: { from: [0, 1], to: [10, 1], color: sweepColors.A },
  B: { from: [1, 3], to: [3, 3], color: sweepColors.B },
  C: { from: [2, 6], to: [9, -1], color: sweepColors.C },
  D: { from: [4, 0], to: [8, 4], color: sweepColors.D },
};
export const intersections: Record<
  PointId,
  { at: [number, number]; pair: [InputId, InputId] }
> = {
  P: { at: [7, 1], pair: ["A", "C"] },
  Q: { at: [5, 1], pair: ["A", "D"] },
  R: { at: [6, 2], pair: ["C", "D"] },
};
export type Event = { x: number; label: string; point?: PointId };
const endpoints: Event[] = [
  { x: 0, label: "A 开始" },
  { x: 1, label: "B 开始" },
  { x: 2, label: "C 开始" },
  { x: 3, label: "B 结束" },
  { x: 4, label: "D 开始" },
  { x: 8, label: "D 结束" },
  { x: 9, label: "C 结束" },
  { x: 10, label: "A 结束" },
];
export type SweepState = {
  x: number;
  order: InputId[];
  before: InputId[];
  discovered: PointId[];
  reported: PointId[];
  queue: Event[];
  shown: InputId[];
  records: number;
  candidate?: boolean;
  stage: string;
  definition?: boolean;
};
const initial: SweepState = {
  x: -0.6,
  order: [],
  before: [],
  discovered: [],
  reported: [],
  queue: endpoints,
  shown: ["A", "B", "C", "D"],
  records: 3,
  stage: "尚未处理事件",
};
function update(base: SweepState, patch: Partial<SweepState>): SweepState {
  return { ...base, ...patch };
}
function at(
  x: number,
  before: InputId[],
  order: InputId[],
  discovered: PointId[],
  reported: PointId[],
  queued: PointId[],
  stage: string,
): SweepState {
  return {
    ...initial,
    x,
    before,
    order,
    discovered,
    reported,
    stage,
    queue: [
      ...endpoints.filter((e) => e.x > x),
      ...queued.map((point) => ({
        x: intersections[point].at[0],
        label: point + " 交叉",
        point,
      })),
    ].sort((a, b) => a.x - b.x),
  };
}
const aStart = at(0, [], ["A"], [], [], [], "处理后");
const bStart = at(1, ["A"], ["A", "B"], [], [], [], "处理后");
const cStart = at(2, ["A", "B"], ["A", "B", "C"], [], [], [], "处理后");
const bEnd = at(3, ["A", "B", "C"], ["A", "C"], [], [], [], "处理后，尚未检查");
const pFound = update(bEnd, { discovered: ["P"], stage: "发现 P，待登记" });
const pQueued = at(
  3,
  bEnd.before,
  bEnd.order,
  ["P"],
  [],
  ["P"],
  "处理后，已登记 P",
);
const dStart = at(
  4,
  ["A", "C"],
  ["D", "A", "C"],
  ["P"],
  [],
  ["P"],
  "处理后，尚未检查",
);
const qFound = update(dStart, {
  discovered: ["P", "Q"],
  stage: "发现 Q，待登记",
});
const qQueued = at(
  4,
  dStart.before,
  dStart.order,
  ["P", "Q"],
  [],
  ["P", "Q"],
  "处理后，已登记 Q",
);
const qArrive = at(
  5,
  ["D", "A", "C"],
  ["D", "A", "C"],
  ["P", "Q"],
  ["Q"],
  ["P"],
  "已报告，尚未换序",
);
const qSwap = update(qArrive, {
  order: ["A", "D", "C"],
  stage: "处理后，尚未检查",
});
const rFound = update(qSwap, {
  discovered: ["P", "Q", "R"],
  stage: "发现 R，待登记",
});
const rQueued = at(
  5,
  qArrive.before,
  qSwap.order,
  ["P", "Q", "R"],
  ["Q"],
  ["P", "R"],
  "处理后，已登记 R",
);
const rArrive = at(
  6,
  ["A", "D", "C"],
  ["A", "D", "C"],
  ["P", "Q", "R"],
  ["Q", "R"],
  ["P"],
  "已报告，尚未换序",
);
const rSwap = update(rArrive, { order: ["A", "C", "D"], stage: "处理后" });
const pArrive = at(
  7,
  ["A", "C", "D"],
  ["A", "C", "D"],
  ["P", "Q", "R"],
  ["Q", "R", "P"],
  [],
  "已报告，尚未换序",
);
const pSwap = update(pArrive, { order: ["C", "A", "D"], stage: "处理后" });
export const states: Record<string, SweepState> = {
  blank: update(initial, { shown: [], records: 0 }),
  inputA: update(initial, { shown: ["A"], records: 0 }),
  inputB: update(initial, { shown: ["A", "B"], records: 0 }),
  inputC: update(initial, { shown: ["A", "B", "C"], records: 0 }),
  inputD: update(initial, { records: 0 }),
  activeIntro: update(initial, {
    x: 2.5,
    order: ["A", "B", "C"],
    records: 1,
    definition: true,
    stage: "定义示意",
  }),
  neighborIntro: update(initial, {
    x: 2.5,
    order: ["A", "B", "C"],
    records: 1,
    definition: true,
    stage: "定义示意",
  }),
  queueIntro: update(initial, { records: 2 }),
  resultIntro: initial,
  initial,
  aStart,
  bStart,
  cStart,
  candidate: update(cStart, { candidate: true }),
  bEnd,
  pFound,
  pQueued,
  dStart,
  qFound,
  qQueued,
  qArrive,
  qSwap,
  rFound,
  rQueued,
  rArrive,
  rSwap,
  pArrive,
  pSwap,
  dEnd: at(
    8,
    pSwap.order,
    ["C", "A"],
    pSwap.discovered,
    pSwap.reported,
    [],
    "处理后",
  ),
  cEnd: at(
    9,
    ["C", "A"],
    ["A"],
    pSwap.discovered,
    pSwap.reported,
    [],
    "处理后",
  ),
  aEnd: at(10, ["A"], [], pSwap.discovered, pSwap.reported, [], "扫描结束"),
};
