import {
  SvgMathText as Label,
  MathText,
} from "../../../shared/ui/SemanticMathText";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import { colors } from "../../colors.ts";
import {
  inputs,
  names,
  events,
  xy,
  scanLabel,
  groupLabel,
  results,
  type Group,
  type Input,
} from "./example";
import { shownInputs, type TimelineRow, type VisualState } from "./timeline";
export const objectColors = {
  A: colors.blue,
  B: colors.orange,
  C: colors.violet,
  D: colors.emerald,
  V: colors.red,
  H: colors.cyan,
  Z: colors.pink,
};
const ink = "#172c45",
  muted = "#64748b";
const project = ([x, y]: readonly number[], shear = 0): [number, number] => [
  105 + (x + shear * y) * 40,
  250 - y * 40,
];
const smooth = (p: number) => p * p * (3 - 2 * p);
function Text({
  x,
  y,
  children,
  size = 24,
  color = ink,
}: {
  x: number;
  y: number;
  children: string;
  size?: number;
  color?: string;
}) {
  return (
    <Label
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      align="center"
      verticalAlign="middle"
    >
      {children}
    </Label>
  );
}
function Order({ row, state }: { row: TimelineRow; state: VisualState }) {
  const swapping = row.phase === "update",
    p = smooth(state.motion),
    before = state.previous.order;
  const all = [...new Set([...before, ...state.order])];
  const groupColor = (g: Group) =>
    g === "G" ? colors.orange : objectColors[g];
  return (
    <g data-order data-phase={row.phase}>
      <Text x={658} y={60} size={23}>
        {swapping && p < 1
          ? "顺序更新中"
          : state.updated
            ? "更新后顺序"
            : "事件前顺序"}
      </Text>
      <Text x={658} y={90} size={19}>
        从下到上；非几何高度
      </Text>
      {!all.length && (
        <Text x={658} y={265}>
          空
        </Text>
      )}
      {all.map((g) => {
        const old = before.indexOf(g),
          next = state.order.indexOf(g),
          moving = swapping && old >= 0 && next >= 0;
        if (!swapping && next < 0) return null;
        if (swapping && ((next < 0 && p === 1) || (old < 0 && p === 0)))
          return null;
        const i = moving ? old + (next - old) * p : next < 0 ? old : next;
        const x =
          640 +
          (swapping && next < 0
            ? 104 * p
            : swapping && old < 0
              ? -104 * (1 - p)
              : moving && old !== next && row.action === "swap"
                ? Math.sin(Math.PI * p) * (next > old ? 104 : -104)
                : 0);
        const y = 402 - i * 86;
        const opacity = swapping ? (old < 0 ? p : next < 0 ? 1 - p : 1) : 1;
        const members =
          swapping && (next < 0 || (old >= 0 && p < 0.5))
            ? state.previous.members
            : state.members;
        const width = g === "G" && members.length > 1 ? 128 : 100;
        return (
          <g key={g} opacity={opacity} data-order-member={g}>
            <rect
              x={x - width / 2}
              y={y - 24}
              width={width}
              height={48}
              rx={8}
              fill="#f6f8fb"
              stroke={groupColor(g)}
              strokeWidth={2}
            />
            <Text x={x} y={y} size={24} color={groupColor(g)}>
              {groupLabel(g, members)}
            </Text>
          </g>
        );
      })}
    </g>
  );
}
function Geometry({ row, state }: { row: TimelineRow; state: VisualState }) {
  const shear = row.view === "shear" ? smooth(state.motion) / 8 : 0;
  const shown = shownInputs(row);
  const labels: Record<Input, [number, number]> = {
    A: [133, 281],
    B: [290, 280],
    C: [386, 280],
    D: [408, 418],
    V: [258, 180],
    H: [407, 324],
    Z: [269, 134],
  };
  const evt = row.event ? events[row.event - 1] : undefined;
  return (
    <g>
      <Text x={270} y={20} size={23}>
        {row.view === "shear"
          ? "放大剪切示意；不用于计算"
          : "原坐标主图：等比例"}
      </Text>
      {Array.from({ length: 11 }, (_, i) => i - 1).map((x) => (
        <g key={"x" + x}>
          <line
            x1={105 + x * 40}
            y1={65}
            x2={105 + x * 40}
            y2={430}
            stroke="#e2e8f0"
          />
          <line
            x1={105 + x * 40}
            y1={246}
            x2={105 + x * 40}
            y2={254}
            stroke={muted}
          />
          {x !== 0 && x % 2 === 0 && (
            <Text x={105 + x * 40} y={268} size={17}>
              {String(x)}
            </Text>
          )}
        </g>
      ))}
      {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((y) => (
        <g key={"y" + y}>
          <line
            x1={50}
            y1={250 - y * 40}
            x2={490}
            y2={250 - y * 40}
            stroke="#e2e8f0"
          />
          <line
            x1={101}
            y1={250 - y * 40}
            x2={109}
            y2={250 - y * 40}
            stroke={muted}
          />
          {y !== 0 && y % 2 === 0 && (
            <Text x={86} y={250 - y * 40} size={17}>
              {String(y)}
            </Text>
          )}
        </g>
      ))}
      <path
        d="M50 250 H500 M105 435 V50"
        fill="none"
        stroke={muted}
        strokeWidth={2}
      />
      <path
        d="M491 244 L500 250 L491 256 M99 59 L105 50 L111 59"
        fill="none"
        stroke={muted}
        strokeWidth={2}
      />
      <Text x={512} y={252} size={22}>
        {shear ? "x′" : "x"}
      </Text>
      <Text x={108} y={39} size={22}>
        {shear ? "y′" : "y"}
      </Text>
      <Text x={88} y={268} size={19}>
        O
      </Text>
      {names
        .filter((name) => shown.includes(name))
        .sort((a) => (a === "A" ? 1 : -1))
        .map((name) => {
          const [a, b] = inputs[name].map((pt) => project(pt, shear)),
            color = objectColors[name];
          const ends = name === "Z" ? [a] : [a, b];
          const [lx, ly] = labels[name];
          return (
            <g key={name} data-input={name}>
              {name === "Z" && (
                <line
                  x1={a[0] + 9}
                  y1={a[1] - 9}
                  x2={a[0] + 30}
                  y2={a[1] - 29}
                  stroke={color}
                  strokeWidth={1}
                />
              )}
              {name === "B" && (
                <line
                  x1={b[0] + 3}
                  y1={b[1] + 3}
                  x2={b[0] + 16}
                  y2={b[1] + 20}
                  stroke={color}
                  strokeWidth={1}
                />
              )}
              {name === "Z" ? (
                <path
                  d={`M${a[0]} ${a[1] - 10} l10 10 -10 10 -10 -10 Z`}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                />
              ) : (
                <line
                  x1={a[0]}
                  y1={a[1]}
                  x2={b[0]}
                  y2={b[1]}
                  stroke={color}
                  strokeWidth={3}
                  strokeDasharray={name === "A" ? "7 5" : undefined}
                />
              )}
              {ends.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={3.5} fill={color} />
              ))}
              <Text
                x={lx + (shear ? 40 * shear * inputs[name][1][1] : 0)}
                y={ly}
                color={color}
              >
                {name}
              </Text>
              {row.action === "introduce" &&
                row.focus === name &&
                state.active && (
                  <AttentionMarks
                    marks={[{ kind: "line", from: a, to: b, color }]}
                    progress={state.motion}
                  />
                )}
            </g>
          );
        })}
      {evt && (
        <>
          <circle
            cx={project(evt.point)[0]}
            cy={project(evt.point)[1]}
            r={13}
            stroke={colors.amber}
            strokeWidth={2}
            fill="none"
          />
          <Text
            x={270}
            y={459}
            size={22}
          >{`E_{${evt.n}}：${xy(evt.point)} → ${scanLabel(evt.point)}`}</Text>
        </>
      )}
      {row.candidate && (
        <>
          <circle
            cx={
              project(
                row.candidate === "P"
                  ? [3, 0]
                  : row.candidate === "Q"
                    ? [3, 2]
                    : [5, 0],
              )[0]
            }
            cy={project(row.candidate === "Q" ? [3, 2] : [5, 0])[1]}
            r={8}
            fill="#f6f8fb"
            stroke={colors.amber}
            strokeWidth={2}
          />
          <Text
            x={row.candidate === "R" ? 305 : 225}
            y={row.candidate === "Q" ? 120 : 218}
            size={23}
          >
            {row.candidate}
          </Text>
        </>
      )}
      {row.view === "shear" && (
        <Text x={285} y={460} size={21}>
          仅此图使用八分之一；实际 s 不变
        </Text>
      )}
      <Order row={row} state={state} />
    </g>
  );
}
function Coverage({ row, state }: { row: TimelineRow; state: VisualState }) {
  const candidate = row.candidate === "R" ? 5 : 3;
  const end = state.updated ? state.right : state.previous.right;
  const xx = (x: number) => 65 + x * 57;
  return (
    <g>
      <Text x={400} y={22}>
        独立范围示意：各行共用 x′ 刻度
      </Text>
      <Text x={400} y={58} size={21}>
        上下分行区分身份，不表示几何高度
      </Text>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((x) => (
        <g key={x}>
          <line x1={xx(x)} y1={95} x2={xx(x)} y2={417} stroke="#e2e8f0" />
          <Text x={xx(x)} y={106} size={21}>
            {String(x)}
          </Text>
        </g>
      ))}
      {(["A", "B", "C"] as Input[]).map((name, i) => {
        const y = 165 + i * 80,
          [a, b] = inputs[name],
          active = state.members.includes(name),
          color = objectColors[name];
        return (
          <g key={name} data-range={name}>
            <line
              x1={xx(a[0])}
              y1={y}
              x2={xx(b[0])}
              y2={y}
              stroke={color}
              strokeWidth={3}
              strokeDasharray={!active ? "6 5" : undefined}
            />
            <circle cx={xx(a[0])} cy={y} r={4} fill={color} />
            <circle cx={xx(b[0])} cy={y} r={4} fill={color} />
            <Text
              x={665}
              y={y}
              color={color}
            >{`${name}：${active ? "活动" : "当前不活动"}`}</Text>
          </g>
        );
      })}
      <line
        x1={xx(candidate)}
        y1={128}
        x2={xx(candidate)}
        y2={345}
        stroke={colors.amber}
        strokeDasharray="5 5"
      />
      <Text x={xx(candidate)} y={373} size={23}>
        {row.candidate === "R" ? "R′=5" : "P′=3"}
      </Text>
      <Text x={630} y={373} size={24}>
        {end === null ? "G 当前为空" : `R_G=${end}`}
      </Text>
      {row.id === "CS36" && state.active && (
        <circle
          cx={xx(state.motion < 0.5 ? 1 : 2)}
          cy={state.motion < 0.5 ? 245 : 165}
          r={16}
          fill="none"
          stroke={colors.amber}
          strokeWidth={3}
          opacity={Math.sin(Math.PI * ((state.motion * 2) % 1)) ** 2}
        />
      )}
      {row.id === "CS38" && (
        <line
          x1={xx(2)}
          y1={392}
          x2={xx(2 + 2 * smooth(state.motion))}
          y2={392}
          stroke={colors.orange}
          strokeWidth={5}
        />
      )}
      {state.results.length > 0 && (
        <>
          <Text x={164} y={415} size={22}>
            独立结果：A/B
          </Text>
          <line
            x1={xx(1)}
            y1={450}
            x2={xx(2)}
            y2={450}
            stroke={colors.amber}
            strokeWidth={4}
          />
          <circle cx={xx(1)} cy={450} r={5} fill={colors.amber} />
          <circle cx={xx(2)} cy={450} r={5} fill={colors.amber} />
          <Text x={385} y={450} size={23}>
            完整闭区间 [1,2]，高度为零
          </Text>
        </>
      )}
    </g>
  );
}
function Ledger({ state }: { state: VisualState }) {
  return (
    <g>
      <Text x={400} y={20}>
        逐步形成的事件表（均为处理后）
      </Text>
      <Text x={75} y={61} size={19}>
        原位置
      </Text>
      <Text x={355} y={61} size={19}>
        顺序（下到上）
      </Text>
      <Text x={590} y={61} size={19}>
        R_G
      </Text>
      <Text x={715} y={61} size={19}>
        结果／清单
      </Text>
      {events
        .filter((e) => e.n <= state.completed)
        .map((e) => (
          <g key={e.n} data-ledger-event={e.n}>
            <Text
              x={90}
              y={84 + e.n * 32}
              size={19}
            >{`E_{${e.n}} ${xy(e.point)}`}</Text>
            <Text x={355} y={84 + e.n * 32} size={19}>
              {e.order.map((g) => groupLabel(g, e.members)).join("，") || "空"}
            </Text>
            <Text x={590} y={84 + e.n * 32} size={19}>
              {e.right === null ? "无" : String(e.right)}
            </Text>
            <Text
              x={715}
              y={84 + e.n * 32}
              size={19}
            >{`${e.results.length}／${e.queue.length}`}</Text>
          </g>
        ))}
    </g>
  );
}
function Results({ row, state }: { row: TimelineRow; state: VisualState }) {
  const thresholds = [96, 97, 98, 98, 99, 100, 101];
  const shot = Number(row.id.slice(2));
  if (shot >= 103 && shot <= 110) {
    const empty = [
      ["A/C，B/C", "2<6；4<6"],
      ["A/D，C/D", "x=3 不在 [0,2]、[6,8]"],
      ["A/V，C/V", "同一候选 x=3，仍在范围外"],
      ["A/H，B/H，C/H", "5 不在 [0,2]、[1,4]、[6,8]"],
      ["D/H", "y=3-x 与 y=5-x 平行"],
      ["A/Z，B/Z，C/Z", "Z 高度 2，水平输入高度 0"],
      ["D/Z", "x=3 时 D 高度 0，不等于 2"],
    ];
    return (
      <g>
        <Text x={400} y={24}>
          按完整原始输入核对空交集
        </Text>
        <Text x={155} y={77} size={23}>
          未输出的输入对
        </Text>
        <Text x={535} y={77} size={23}>
          为空的具体原因
        </Text>
        {empty.slice(0, shot - 102).map(([pair, reason], i) => (
          <g key={pair}>
            <Text x={155} y={135 + i * 52} size={23}>
              {pair}
            </Text>
            <Text x={535} y={135 + i * 52} size={21}>
              {reason}
            </Text>
          </g>
        ))}
        <Text x={400} y={560} size={22}>
          {shot === 110
            ? "7 对非空 + 14 对空 = 21 对；C 无非空结果"
            : "仅核对本例；一般算法正确性留给下一章"}
        </Text>
      </g>
    );
  }
  return (
    <g>
      <Text x={400} y={24}>
        七对完整交集：身份逐对保留
      </Text>
      <Text x={75} y={70} size={22}>
        原始对
      </Text>
      <Text x={275} y={70} size={22}>
        扫描坐标结果
      </Text>
      <Text x={535} y={70} size={22}>
        还原的原坐标
      </Text>
      <Text x={725} y={70} size={22}>
        类型
      </Text>
      {results.map((r, i) => {
        const y = 117 + i * 48;
        const reveal = shot >= thresholds[i];
        const active = shot === thresholds[i] && state.active;
        return (
          <g key={r.pair.join("/")} data-result-pair={r.pair.join("/")}>
            <Text x={75} y={y} size={24}>
              {r.pair.join("/")}
            </Text>
            <Text x={275} y={y} size={21}>
              {i === 0 ? "[(1,0),(2,0)]" : i < 4 ? "(3,0)" : "(3+2s,2)"}
            </Text>
            <Text x={405} y={y} size={22}>
              {reveal ? "→" : ""}
            </Text>
            {reveal && (
              <Text x={535} y={y} size={21}>
                {i === 0 ? "[(1,0),(2,0)]" : i < 4 ? "(3,0)" : "(3,2)"}
              </Text>
            )}
            <Text x={725} y={y} size={22}>
              {i === 0 ? "闭区间" : "点"}
            </Text>
            {active && (
              <line
                x1={434}
                x2={635}
                y1={y + 20}
                y2={y + 20}
                stroke={colors.amber}
                strokeWidth={3}
                opacity={Math.sin(Math.PI * state.motion) ** 2}
              />
            )}
          </g>
        );
      })}
      <line
        x1={90}
        x2={180}
        y1={475}
        y2={475}
        stroke={colors.amber}
        strokeWidth={4}
      />
      {[90, 180].map((x) => (
        <circle key={x} cx={x} cy={475} r={4} fill={colors.amber} />
      ))}
      <Text x={135} y={518} size={21}>
        1 对闭区间
      </Text>
      <circle cx={375} cy={475} r={6} fill={colors.amber} />
      <Text x={375} y={518} size={21}>
        (3,0)：3 对
      </Text>
      <circle cx={645} cy={475} r={6} fill={colors.amber} />
      <Text x={645} y={518} size={21}>
        (3,2)：3 对
      </Text>
      <Text x={400} y={569} size={21}>
        {shot >= 103
          ? "C 没有非空交集；其余 14 对为空"
          : "六对点结果，两个点位置；此处按结果分类，不是坐标图"}
      </Text>
    </g>
  );
}
export function SweepDiagram({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const phase =
    row.phase === "read"
      ? "读取／报告前"
      : row.phase === "report"
        ? "报告中"
        : row.phase === "update"
          ? "更新中"
          : "检查";
  return (
    <div>
      <svg width={800} height={600} viewBox="0 0 800 600" data-geometry-inputs>
        {row.view === "results" ? (
          <Results row={row} state={state} />
        ) : row.view === "coverage" ? (
          <Coverage row={row} state={state} />
        ) : row.view === "ledger" ? (
          <Ledger state={state} />
        ) : (
          <Geometry row={row} state={state} />
        )}
        {Number(row.id.slice(2)) >= 26 &&
          row.view !== "ledger" &&
          row.view !== "results" && (
            <>
              <Text
                x={400}
                y={494}
                size={21}
              >{`待处理（${state.queue.length}）：${state.queue.map((n) => `E_{${n}}`).join("，") || "空"}`}</Text>
              <Text
                x={400}
                y={536}
                size={22}
              >{`累计 ${state.results.length} 对：${state.results.map((r) => r.pair.join("/")).join("，") || "无"}`}</Text>
              <Text x={400} y={578} size={20}>
                {state.results.length
                  ? "A/B 始终为完整区间；其余已报告对为点"
                  : "尚未报告非空交集"}
              </Text>
            </>
          )}
      </svg>
      <div style={{ fontSize: 20, textAlign: "center", color: muted }}>
        <MathText colorize={false}>
          {row.event
            ? `E_{${row.event}} · ${phase}；画面暂定计时，尚无配音`
            : "第八章教学示意；实际判断使用精确扫描坐标"}
        </MathText>
      </div>
    </div>
  );
}
