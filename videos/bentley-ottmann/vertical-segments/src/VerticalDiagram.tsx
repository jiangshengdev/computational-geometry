import {
  SvgMathText as Label,
  MathText,
} from "../../../shared/ui/SemanticMathText";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import { colors } from "../../colors.ts";
import { pages } from "./storyboard";
import { inputs, actualEvents, N } from "./example";
import type { TimelineRow, VisualState } from "./timeline";
export const objectColors = {
  V: colors.blue,
  A: colors.orange,
  B: colors.violet,
  W: colors.emerald,
  Z_1: colors.orange,
  Z_2: colors.violet,
};
type Input = "V" | "A" | "B";
const ink = "#172c45",
  muted = "#94a3b8";
const original = Object.fromEntries(
  (["V", "A", "B"] as const).map((name) => [
    name,
    inputs[name].map(([x, y]) => [Number(x), Number(y)]),
  ]),
) as Record<Input, [[number, number], [number, number]]>;
const smooth = (n: number) => n * n * (3 - 2 * n);
// Equal units on both axes. Only this explicitly labelled diagram uses s_vis.
const project = (x: number, y: number, shear: number): [number, number] => [
  240 + (x + shear * y) * 100,
  425 - y * 100,
];
function PointLabel({
  x,
  y,
  children,
  color = ink,
}: {
  x: number;
  y: number;
  children: string;
  color?: string;
}) {
  return (
    <Label
      x={x}
      y={y}
      fill={color}
      fontSize={25}
      align="center"
      verticalAlign="middle"
    >
      {children}
    </Label>
  );
}
function Line({
  a,
  b,
  color,
  width = 3,
  dash = false,
}: {
  a: [number, number];
  b: [number, number];
  color: string;
  width?: number;
  dash?: boolean;
}) {
  return (
    <line
      x1={a[0]}
      y1={a[1]}
      x2={b[0]}
      y2={b[1]}
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dash ? "7 6" : undefined}
    />
  );
}
function eventIndex(n: number) {
  if (n < 26) return -1;
  if (n === 26) return 0;
  if (n === 27) return 1;
  if (n <= 31) return 2;
  if (n <= 38) return 3;
  if (n <= 41) return 4;
  if (n === 42) return 5;
  if (n === 43) return 6;
  return 7;
}
function orderAt(n: number): Input[] {
  const i = eventIndex(n);
  return i < 0 ? [] : (actualEvents[i].order as Input[]);
}
export function VerticalDiagram({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const n = Number(row.id.slice(2)),
    kind = pages[row.page].diagram,
    m = smooth(state.motion);
  const overlap = kind === "overlap",
    points = kind === "points",
    scan = kind === "scan",
    restore = kind === "restore";
  let shear = kind === "original" ? 0 : 0.5;
  if (n === 7 || n === 8) shear = 0;
  if (n === 9 || n === 53 || n === 58) shear = 0.5 * m;
  if (n === 52 || n === 57) shear = 0;
  if (n === 48 || n === 50) shear = 0.5 * (1 - m);
  if (n === 51) shear = 0;
  if (n === 55) shear = 0.5;
  if (n === 56 || n === 62) shear = 0.5 * (1 - m);
  if (n >= 63) shear = 0;
  const shown: Input[] =
    overlap || points
      ? ["V"]
      : n < 2
        ? []
        : n < 3
          ? ["V"]
          : n < 4
            ? ["V", "A"]
            : ["V", "A", "B"];
  const showP = n >= 3 && !overlap && !points,
    showQ = n >= 4 && !overlap && !points;
  const p = project(0, 1, shear),
    q = project(0, 2, shear);
  let order = orderAt(n === 32 ? 31 : n === 39 ? 38 : n),
    before = order;
  if (n === 33) {
    before = ["V", "A", "B"];
    order = ["A", "V", "B"];
  }
  if (n === 40) {
    before = ["A", "V", "B"];
    order = ["A", "B", "V"];
  }
  const swapping = n === 33 || n === 40;
  const candidate =
    n >= 29 && n <= 31 ? "P′" : n >= 35 && n <= 38 ? "Q′" : null;
  const pendingP = n === 31 && state.motion === 1;
  const pendingQ = n === 38 && state.motion === 1;
  const reports =
    n >= 39 ? ["(V,A)：P′", "(V,B)：Q′"] : n >= 32 ? ["(V,A)：P′"] : [];
  const event = actualEvents[Math.max(0, eventIndex(n))];
  const eventX =
    Number(event.point[0] - event.point[1]) / Number(N) +
    0.5 * Number(event.point[1]);
  const focus: Input | undefined = row.action.includes("-V")
    ? "V"
    : row.action.includes("-A")
      ? "A"
      : row.action.includes("-B")
        ? "B"
        : undefined;
  const emphasis = state.active ? Math.sin(Math.PI * state.motion) ** 2 : 0;
  const restoredP = n >= 49 || (n === 48 && state.motion === 1);
  const restoredQ = n >= 51 || (n === 50 && state.motion === 1);
  return (
    <div>
      <svg width={800} height={600} viewBox="0 0 800 600" data-geometry-inputs>
        <defs>
          <marker
            id="vertical-axis-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path
              d="M0,0 L6,3 L0,6"
              fill="none"
              stroke={muted}
              strokeWidth="1.5"
            />
          </marker>
        </defs>
        <PointLabel x={285} y={20}>
          {shear === 0
            ? "原坐标图：等比例"
            : state.motion > 0 &&
                state.motion < 1 &&
                [9, 48, 50, 53, 56, 58, 62].includes(n)
              ? "放大示意的变换过程"
              : "放大示意：s_{\\mathrm{vis}}=1/2"}
        </PointLabel>
        {shear !== 0 && (
          <PointLabel x={285} y={56}>
            水平距离不用于实际计算
          </PointLabel>
        )}
        {[-1, 0, 1, 2].map((x) => (
          <Line
            key={"x" + x}
            a={[240 + x * 100, 90]}
            b={[240 + x * 100, 450]}
            color="#e2e8f0"
            width={1}
          />
        ))}
        {[0, 1, 2, 3].map((y) => (
          <Line
            key={"y" + y}
            a={[95, 425 - y * 100]}
            b={[530, 425 - y * 100]}
            color="#e2e8f0"
            width={1}
          />
        ))}
        <line
          x1={95}
          y1={425}
          x2={545}
          y2={425}
          stroke={muted}
          strokeWidth={2}
          markerEnd="url(#vertical-axis-arrow)"
        />
        <line
          x1={240}
          y1={452}
          x2={240}
          y2={85}
          stroke={muted}
          strokeWidth={2}
          markerEnd="url(#vertical-axis-arrow)"
        />
        <PointLabel x={555} y={447}>
          {shear === 0 ? "x" : "x′"}
        </PointLabel>
        <PointLabel x={175} y={100}>
          {shear === 0 ? "y" : "y′"}
        </PointLabel>
        <PointLabel x={220} y={446}>
          O
        </PointLabel>
        {[1, 2, 3].map((y) => (
          <g key={y}>
            <line
              x1={235}
              y1={425 - y * 100}
              x2={245}
              y2={425 - y * 100}
              stroke={muted}
            />
            <PointLabel x={205} y={425 - y * 100}>
              {String(y)}
            </PointLabel>
          </g>
        ))}
        {[-1, 1, 2].map((x) => (
          <g key={x}>
            <line
              x1={240 + x * 100}
              y1={420}
              x2={240 + x * 100}
              y2={430}
              stroke={muted}
            />
            <PointLabel x={240 + x * 100} y={451}>
              {String(x)}
            </PointLabel>
          </g>
        ))}
        {shown.map((name) => {
          const ends = original[name].map(([x, y]) => project(x, y, shear)) as [
            [number, number],
            [number, number],
          ];
          return (
            <g key={name} data-input={name}>
              <Line
                a={ends[0]}
                b={ends[1]}
                color={objectColors[name]}
                dash={overlap && name === "V"}
              />
              {ends.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={4} fill={objectColors[name]} />
              ))}
              <PointLabel
                x={name === "V" ? ends[1][0] + 30 : ends[1][0] + 27}
                y={name === "V" ? ends[1][1] - 15 : ends[1][1] - 20}
                color={objectColors[name]}
              >
                {name}
              </PointLabel>
              {focus === name && state.active && (
                <AttentionMarks
                  marks={[
                    {
                      kind: "line",
                      from: ends[0],
                      to: ends[1],
                      color: objectColors[name],
                    },
                  ]}
                  progress={state.motion}
                />
              )}
            </g>
          );
        })}
        {showP && (
          <>
            <circle cx={p[0]} cy={p[1]} r={5} fill={ink} />
            <PointLabel x={p[0] + 27} y={p[1] + 23}>
              {shear === 0 ? "P" : "P′"}
            </PointLabel>
          </>
        )}
        {showQ && (
          <>
            <circle cx={q[0]} cy={q[1]} r={5} fill={ink} />
            <PointLabel x={q[0] + 25} y={q[1] - 23}>
              {shear === 0 ? "Q" : "Q′"}
            </PointLabel>
          </>
        )}
        {n === 5 && (
          <circle
            cx={state.motion < 0.5 ? p[0] : q[0]}
            cy={state.motion < 0.5 ? p[1] : q[1]}
            r={19}
            fill="none"
            stroke={colors.amber}
            strokeWidth={4}
            opacity={emphasis}
          />
        )}
        {scan && n >= 26 && n <= 44 && (
          <>
            <line
              x1={240 + eventX * 100}
              y1={100}
              x2={240 + eventX * 100}
              y2={425}
              stroke={colors.amber}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <PointLabel x={685} y={105}>
              {n === 32 || n === 39
                ? "更新前顺序"
                : swapping && state.motion < 1
                  ? "顺序更新中"
                  : "处理后顺序"}
            </PointLabel>
            {order.map((name, i) => {
              const old = before.indexOf(name);
              const index = swapping ? old + (i - old) * m : i;
              const x =
                  685 +
                  (swapping && old !== i
                    ? Math.sin(Math.PI * m) * (i > old ? 55 : -55)
                    : 0),
                y = 410 - index * 85;
              return (
                <g key={name} data-order-member={name}>
                  <line
                    x1={x - 40}
                    y1={y}
                    x2={x + 40}
                    y2={y}
                    stroke={objectColors[name]}
                    strokeWidth={3}
                  />
                  <circle cx={x} cy={y} r={20} fill="#f6f8fb" />
                  <PointLabel x={x} y={y} color={objectColors[name]}>
                    {name}
                  </PointLabel>
                </g>
              );
            })}
            {!order.length && (
              <PointLabel x={685} y={325}>
                空
              </PointLabel>
            )}
            {candidate && (
              <circle
                cx={candidate === "P′" ? p[0] : q[0]}
                cy={candidate === "P′" ? p[1] : q[1]}
                r={20}
                fill="none"
                stroke={colors.amber}
                strokeWidth={3}
                opacity={emphasis}
              />
            )}
            {n >= 34 && n <= 38 && (
              <line
                x1={627}
                y1={325}
                x2={627}
                y2={240}
                stroke={colors.blue}
                strokeWidth={4}
                strokeDasharray={n === 34 ? "8 5" : undefined}
              />
            )}
            <PointLabel x={300} y={510}>
              {pendingP
                ? "待处理：P′"
                : n >= 32 && n < 38
                  ? "已取出 P′；Q′ 尚未登记"
                  : pendingQ
                    ? "待处理：Q′"
                    : n === 31
                      ? "通过两项判断后登记 P′"
                      : n === 38
                        ? "通过两项判断后登记 Q′"
                        : n >= 39
                          ? "交点清单：空"
                          : "交点清单：尚无预约"}
            </PointLabel>
            <PointLabel x={390} y={555}>
              {reports.length ? "已报告：" + reports.join("；") : "已报告：无"}
            </PointLabel>
          </>
        )}
        {restore && (
          <>
            <PointLabel x={670} y={125}>
              原图答案
            </PointLabel>
            {n <= 48 && (
              <>
                <line
                  x1={p[0]}
                  y1={p[1]}
                  x2={p[0]}
                  y2={p[1]}
                  stroke={colors.amber}
                  strokeWidth={4}
                />
                <circle cx={p[0]} cy={p[1]} r={8} fill={colors.amber} />
              </>
            )}
            {n >= 49 && (
              <circle cx={q[0]} cy={q[1]} r={8} fill={colors.amber} />
            )}
            {restoredP && (
              <PointLabel x={675} y={220}>
                (V,A)：(0,1)
              </PointLabel>
            )}
            {restoredQ && (
              <PointLabel x={675} y={280}>
                (V,B)：(0,2)
              </PointLabel>
            )}
          </>
        )}
        {overlap && (
          <>
            {n === 55 && (
              <>
                <circle cx={p[0]} cy={p[1]} r={5} fill={objectColors.W} />
                <circle cx={q[0]} cy={q[1]} r={5} fill={objectColors.W} />
                <circle
                  cx={state.captionIndex === 0 ? p[0] : q[0]}
                  cy={state.captionIndex === 0 ? p[1] : q[1]}
                  r={18}
                  fill="none"
                  stroke={colors.amber}
                  strokeWidth={4}
                  opacity={
                    state.active
                      ? Math.sin(Math.PI * state.captionProgress) ** 2
                      : 0
                  }
                />
              </>
            )}
            <Line a={p} b={q} color={objectColors.W} width={7} />
            <PointLabel
              x={(p[0] + q[0]) / 2 + 45}
              y={(p[1] + q[1]) / 2}
              color={objectColors.W}
            >
              W
            </PointLabel>
            {(n === 54 || n === 56) && state.active && (
              <AttentionMarks
                marks={[{ kind: "line", from: p, to: q, color: colors.amber }]}
                progress={state.motion}
              />
            )}
            {n >= 54 && (
              <>
                <PointLabel x={660} y={160}>
                  完整结果
                </PointLabel>
                <Line
                  a={[660, 230]}
                  b={[660, 340]}
                  color={objectColors.W}
                  width={7}
                />
                <circle cx={660} cy={230} r={5} fill={objectColors.W} />
                <circle cx={660} cy={340} r={5} fill={objectColors.W} />
                <PointLabel x={660} y={385}>
                  (V,W)
                </PointLabel>
              </>
            )}
            <PointLabel x={320} y={510}>
              {n >= 56 && state.motion === 1
                ? "还原整段：[(0,1),(0,2)]"
                : n >= 53
                  ? "实际新范围：[s,2s]"
                  : "完整重叠：[(0,1),(0,2)]"}
            </PointLabel>
          </>
        )}
        {points && (
          <>
            <circle
              cx={p[0]}
              cy={p[1]}
              r={13}
              fill="none"
              stroke={objectColors.Z_1}
              strokeWidth={3}
            />
            <path
              d={`M ${p[0]} ${p[1] - 19} l19 19 -19 19 -19 -19 Z`}
              fill="none"
              stroke={objectColors.Z_2}
              strokeWidth={3}
            />
            <PointLabel x={p[0] + 92} y={p[1] - 20} color={objectColors.Z_1}>
              Z₁
            </PointLabel>
            <PointLabel x={p[0] + 92} y={p[1] + 25} color={objectColors.Z_2}>
              Z₂
            </PointLabel>
            <line
              x1={p[0] + 20}
              y1={p[1]}
              x2={p[0] + 62}
              y2={p[1]}
              stroke={muted}
            />
            <PointLabel x={640} y={120}>
              {n >= 63 ? "已保留结果" : "同点结果"}
            </PointLabel>
            {n >= 60 && (
              <PointLabel x={640} y={200}>
                (V,Z₁)
              </PointLabel>
            )}
            {n >= 60 &&
              (n > 60 ||
                row.captions
                  .slice(0, state.captionIndex + 1)
                  .some((c) => c.text.includes("再与第二份"))) && (
                <PointLabel x={640} y={260}>
                  (V,Z₂)
                </PointLabel>
              )}
            {n >= 61 && (
              <PointLabel x={640} y={320}>
                (Z₁,Z₂)
              </PointLabel>
            )}
            {n >= 63 && (
              <PointLabel x={640} y={390} color={objectColors.V}>
                仅 V 活动
              </PointLabel>
            )}
            <PointLabel x={330} y={510}>
              {n > 62 || (n === 62 && state.motion === 1)
                ? "每对恢复为 (0,1)"
                : n >= 58
                  ? "实际共同位置：P′=(s,1)"
                  : "同一位置，两份点输入身份"}
            </PointLabel>
          </>
        )}
        {!scan && !overlap && !points && !restore && (
          <PointLabel x={350} y={535}>
            教学示意；名称始终保留原始输入身份
          </PointLabel>
        )}
      </svg>
      <div style={{ fontSize: 22, color: ink, textAlign: "center" }}>
        <MathText colorize={false}>
          {shear !== 0
            ? "坐标表与候选计算使用实际 s=1/262144"
            : "输入的闭端点与内部都保留"}
        </MathText>
      </div>
    </div>
  );
}
