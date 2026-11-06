import { useId } from "react";
import { SvgMathText as Label } from "../../../shared/ui/SemanticMathText";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import {
  point,
  stroke,
  type AttentionMark,
} from "../../../shared/speech/teaching-cues";
import { colors, sweepColors } from "../../colors";
import type { DiagramKind } from "./storyboard";
import type { TimelineRow, VisualState } from "./timeline";
import { inputs, type Name } from "./example";

const ink = "#172c45";
const muted = "#94a3b8";
const objectColors = { ...sweepColors, F: colors.orange };
const has = (state: VisualState, name: string) => state.reached.includes(name);

function Geometry({
  names,
  side,
  state,
}: {
  names: Name[];
  side?: "left" | "right";
  state: VisualState;
}) {
  const id = useId().replace(/:/g, "");
  const unit = side ? 27 : 43;
  const x = (v: number) => (side ? 45 : 110) + v * unit;
  const y = (v: number) => (side ? 355 : 490) - v * unit;
  const width = side ? 370 : 760;
  const height = side ? 435 : 580;
  const marks: AttentionMark[] = [];
  const active = state.target;
  const activeSide = active === "left" || active === "right" ? active : null;
  const selected: Record<string, Name[]> = {
    remove: ["A"],
    keep: ["C", "D"],
    add: ["B"],
    new: ["B", "C", "D"],
    CD: ["C", "D"],
    AB: ["A", "B"],
    touch: ["A", "F"],
    left: ["D", "A", "C"],
    right: ["C", "B", "D"],
  };
  const endpoints = (name: Name): [[number, number], [number, number]] => {
    const input = inputs[name];
    return [
      side === "right" ? [4, 4] : input.start,
      side === "left" ? [4, 4] : input.end,
    ];
  };
  for (const name of names) {
    if (
      (!activeSide || !side || activeSide === side) &&
      (active === name || selected[active ?? ""]?.includes(name))
    ) {
      const [a, b] = endpoints(name);
      marks.push(stroke(...a, ...b, objectColors[name]));
    }
  }
  if (active === "P") marks.push(point(4, 4, colors.amber));
  const labelPositions: Record<Name, [number, number]> =
    side === "right"
      ? { A: [1, 5], B: [7.5, 6.6], C: [8, 1.6], D: [6.2, 9.4], F: [5.5, 4.8] }
      : {
          A: [1.4, 4.7],
          B: [7.5, 6.6],
          C: [1.3, 7.8],
          D: [2.5, 2.2],
          F: [5.5, 4.8],
        };
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label="沿用文章坐标的等比例线段图"
    >
      <defs>
        <marker
          id={id}
          markerWidth={7}
          markerHeight={7}
          refX={6}
          refY={3.5}
          orient="auto"
        >
          <path d="M0 0 L7 3.5 L0 7 Z" fill={muted} />
        </marker>
      </defs>
      {Array.from({ length: 11 }, (_, i) => (
        <g key={i} stroke="#e2e8f0" strokeWidth={1}>
          <line x1={x(i)} y1={y(-1)} x2={x(i)} y2={y(10)} />
          <line x1={x(0)} y1={y(i)} x2={x(10)} y2={y(i)} />
        </g>
      ))}
      <path
        d={`M${x(-0.4)} ${y(0)} H${x(10.5)}`}
        fill="none"
        stroke={muted}
        markerEnd={`url(#${id})`}
      />
      <path
        d={`M${x(0)} ${y(-1.3)} V${y(10.5)}`}
        fill="none"
        stroke={muted}
        markerEnd={`url(#${id})`}
      />
      <Label x={x(10.5)} y={y(0) + 24} fontSize={23}>
        x
      </Label>
      <Label x={x(0) - 18} y={y(10.5)} fontSize={23}>
        y
      </Label>
      <Label x={x(0) - 18} y={y(0) + 22} fontSize={23}>
        O
      </Label>
      <path
        d={`M${x(4)} ${y(-1)} V${y(10)}`}
        stroke={muted}
        strokeDasharray="6 6"
      />
      {names.map((name) => {
        const [a, b] = endpoints(name);
        return (
          <g key={name} data-input={name}>
            <line
              x1={x(a[0])}
              y1={y(a[1])}
              x2={x(b[0])}
              y2={y(b[1])}
              stroke={objectColors[name]}
              strokeWidth={3}
            />
            <Label
              x={x(labelPositions[name][0])}
              y={y(labelPositions[name][1])}
              fontSize={side ? 25 : 30}
              fill={objectColors[name]}
            >
              {name}
            </Label>
          </g>
        );
      })}
      <AttentionMarks
        marks={marks}
        progress={state.progress}
        project={([a, b]) => [x(a), y(b)]}
      />
      <circle cx={x(4)} cy={y(4)} r={5} fill={ink} />
      <Label x={x(4) + 18} y={y(4) + 24} fontSize={25}>
        P
      </Label>
      <Label x={x(4)} y={y(-1) - 2} fontSize={22} align="center">
        4
      </Label>
      {side ? (
        <Label x={width / 2} y={45} fontSize={26} align="center">
          {side === "left" ? "左侧 x<4" : "右侧 x>4"}
        </Label>
      ) : null}
    </svg>
  );
}

function RoleFlow({ state }: { state: VisualState }) {
  const roles = [
    {
      name: "A",
      y: 100,
      text: "结束者",
      target: "remove",
      destination: "退出",
    },
    {
      name: "C、D",
      y: 240,
      text: "穿过者",
      target: "keep",
      destination: "继续",
    },
    { name: "B", y: 380, text: "开始者", target: "add", destination: "加入" },
  ];
  return (
    <svg width={760} height={550} aria-label="当前报告完成后的成员去向">
      <Label x={40} y={35} fontSize={28}>
        当前报告已完成
      </Label>
      {roles.map((r) => (
        <g key={r.target}>
          <Label x={90} y={r.y} fontSize={36}>
            {r.name}
          </Label>
          <Label x={210} y={r.y} fontSize={28}>
            {r.text}
          </Label>
          {has(state, r.target) ? (
            <>
              <path
                d={`M345 ${r.y} H470 l-12 -8 m12 8 l-12 8`}
                stroke={muted}
                fill="none"
                strokeWidth={2}
              />
              <Label x={510} y={r.y} fontSize={30}>
                {r.destination}
              </Label>
            </>
          ) : null}
          <AttentionMarks
            marks={
              state.target === r.target
                ? [stroke(75, r.y + 24, 600, r.y + 24, colors.amber)]
                : []
            }
            progress={state.progress}
          />
        </g>
      ))}
      {has(state, "new") ? (
        <>
          <path
            d="M660 215 V405 M645 215 H660 M645 405 H660"
            stroke={colors.amber}
            fill="none"
            strokeWidth={3}
          />
          <Label x={400} y={490} fontSize={30} align="center">
            继续者组成整个新块
          </Label>
        </>
      ) : null}
    </svg>
  );
}

function EqualSlope({ row, state }: { row: TimelineRow; state: VisualState }) {
  if (row.page === "touch")
    return (
      <Geometry names={has(state, "F") ? ["A", "F"] : ["A"]} state={state} />
    );
  return (
    <svg width={760} height={550} aria-label="被排除的同侧重叠假设">
      <Label x={380} y={40} align="center" fontSize={29}>
        假设：同点、同斜率、都向右延伸
      </Label>
      <line
        x1={140}
        y1={210}
        x2={640}
        y2={210}
        stroke={colors.blue}
        strokeWidth={3}
      />
      <line
        x1={140}
        y1={210}
        x2={480}
        y2={210}
        stroke={colors.orange}
        strokeWidth={3}
        strokeDasharray="10 8"
      />
      <circle cx={140} cy={210} r={5} fill={ink} />
      <Label x={140} y={175} align="center" fontSize={30}>
        P
      </Label>
      {has(state, "overlap") ? (
        <>
          <path
            d="M140 250 v15 H480 v-15"
            fill="none"
            stroke={colors.amber}
            strokeWidth={3}
          />
          <Label x={310} y={310} align="center" fontSize={28}>
            共同的正长度区间
          </Label>
        </>
      ) : null}
      <AttentionMarks
        marks={
          state.target === "overlap"
            ? [stroke(140, 210, 480, 210, colors.amber)]
            : []
        }
        progress={state.progress}
      />
      {has(state, "touch") ? (
        <>
          <Label x={380} y={410} align="center" fontSize={28}>
            仅端点接触：两份分居两侧
          </Label>
          <path d="M100 470 H350" stroke={colors.blue} strokeWidth={3} />
          <path d="M350 470 H640" stroke={colors.orange} strokeWidth={3} />
          <circle cx={350} cy={470} r={5} fill={ink} />
          <Label x={350} y={510} fontSize={28} align="center">
            P
          </Label>
        </>
      ) : null}
    </svg>
  );
}

function GapDiagram({ state }: { state: VisualState }) {
  const showNew = !has(state, "empty");
  const marks: AttentionMark[] =
    state.target === "lower"
      ? [stroke(100, 440, 660, 415, colors.amber)]
      : state.target === "upper"
        ? [stroke(100, 140, 660, 115, colors.amber)]
        : state.target === "outside"
          ? [
              stroke(100, 140, 660, 115, colors.amber),
              stroke(100, 440, 660, 415, colors.amber),
            ]
          : state.target === "interval"
            ? [stroke(290, 520, 510, 520, colors.amber)]
            : state.target === "gap" || state.target === "insert"
              ? [point(370, 280, colors.amber)]
              : [];
  return (
    <svg width={760} height={590} aria-label="原空隙的上下外侧成员，一般示意">
      <Label x={380} y={38} align="center" fontSize={28}>
        一般示意：块外不经过当前点
      </Label>
      <path
        d="M100 140 L660 115 M100 440 L660 415"
        fill="none"
        stroke={muted}
        strokeWidth={3}
      />
      <Label x={115} y={100} fontSize={27}>
        上方外侧
      </Label>
      <Label x={115} y={480} fontSize={27}>
        下方外侧
      </Label>
      <path d="M370 80 V480" stroke={muted} strokeDasharray="6 6" />
      <Label x={370} y={555} fontSize={28} align="center">
        x_P
      </Label>
      <circle cx={370} cy={280} r={5} fill={ink} />
      <Label x={340} y={310} fontSize={27}>
        P
      </Label>
      {showNew ? (
        <path
          d="M370 280 L590 175 M370 280 L590 285 M370 280 L590 360"
          stroke={colors.violet}
          strokeWidth={3}
          fill="none"
        />
      ) : null}
      <path d="M290 500 V520 H510 V500" stroke={muted} fill="none" />
      <AttentionMarks marks={marks} progress={state.progress} />
    </svg>
  );
}

function NeighborDiagram({
  row,
  state,
  empty,
}: {
  row: TimelineRow;
  state: VisualState;
  empty: boolean;
}) {
  const unchanged = has(state, "unchanged");
  const removed = empty && (has(state, "connect") || unchanged);
  const single = row.id === "SU24" && has(state, "single");
  const namedOuter = row.page !== "neighbor-names" || row.visibleStep >= 2;
  const members = removed ? [] : single ? ["K_1"] : ["K_1", "K_2", "K_3"];
  const ys = single ? [300] : [420, 300, 180];
  const lowerY = 520,
    upperY = 80;
  const positions = [lowerY, ...ys.slice(0, members.length), upperY];
  const edges = removed
    ? [[lowerY, upperY]]
    : positions.slice(0, -1).map((y, i) => [y, positions[i + 1]]);
  const sequential = row.id === "SU24" && state.target === "inside";
  const internalCount = Math.max(1, members.length - 1);
  const activeInternal = Math.min(
    internalCount - 1,
    Math.floor(state.progress * internalCount),
  );
  const markProgress = sequential
    ? state.progress * internalCount - activeInternal
    : state.progress;
  const marks: AttentionMark[] = [];
  edges.forEach(([a, b], i) => {
    const target = removed
      ? unchanged
        ? "unchanged"
        : "connect"
      : i === 0
        ? "lower"
        : i === edges.length - 1
          ? "upper"
          : "inside";
    if (state.target === target && (!sequential || i - 1 === activeInternal))
      marks.push(stroke(380, a - 25, 380, b + 25, colors.amber));
  });
  if (state.target === "block")
    marks.push(stroke(275, 440, 275, 160, colors.amber));
  if (state.target === "first") marks.push(point(380, 420, colors.amber));
  if (state.target === "last") marks.push(point(380, 180, colors.amber));
  return (
    <svg width={760} height={600} aria-label="上下邻接顺序示意，从下到上阅读">
      <Label x={110} y={35} fontSize={27}>
        {empty
          ? "移去前后，核对外侧连接"
          : single
            ? "一个成员：没有内部邻接"
            : "从下到上；图示 k=3"}
      </Label>
      {members.length ? (
        <rect x={280} y={130} width={200} height={340} fill="#f5f3ff" rx={12} />
      ) : null}
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={380}
          y1={a - 25}
          x2={380}
          y2={b + 25}
          stroke={muted}
          strokeWidth={2}
          strokeDasharray={removed && !unchanged ? "8 5" : undefined}
        />
      ))}
      {members.map((name, i) => (
        <g key={name}>
          <circle
            cx={380}
            cy={ys[i]}
            r={24}
            fill="#ede9fe"
            stroke={colors.violet}
          />
          <Label x={430} y={ys[i]} fontSize={30}>
            {empty ? "旧成员" : name}
          </Label>
        </g>
      ))}
      <circle cx={380} cy={lowerY} r={20} fill="#e2e8f0" />
      <circle cx={380} cy={upperY} r={20} fill="#e2e8f0" />
      <Label x={430} y={lowerY} fontSize={30}>
        {namedOuter ? "T_-" : "下方"}
      </Label>
      <Label x={430} y={upperY} fontSize={30}>
        {namedOuter ? "T_+" : "上方"}
      </Label>
      {unchanged ? (
        <>
          <circle cx={170} cy={300} r={5} fill={ink} />
          <Label x={170} y={345} align="center" fontSize={27}>
            P
          </Label>
          <Label x={110} y={400} fontSize={26}>
            旧块、新块均空
          </Label>
        </>
      ) : null}
      <AttentionMarks marks={marks} progress={markProgress} />
    </svg>
  );
}

function DiscoveryDiagram({ state }: { state: VisualState }) {
  const paths = ["M80 150 L620 410", "M80 245 L620 315", "M80 390 L620 170"];
  // These three example strokes meet at (350,280); no numerical coordinates claimed.
  const endpoints: [number, number, number, number][] = [
    [80, 150, 620, 410],
    [80, 245, 620, 315],
    [80, 390, 620, 170],
  ];
  const selected =
    state.target === "pair"
      ? [0, 1]
      : state.target === "block"
        ? [0, 1, 2]
        : [];
  return (
    <svg
      width={760}
      height={580}
      aria-label="任意共点 Q 左侧的连续块与邻居，一般示意"
    >
      <Label x={380} y={35} align="center" fontSize={28}>
        一般示意：没有端点提示
      </Label>
      <path
        d="M80 80 L620 80 M80 470 L620 470"
        stroke={muted}
        strokeWidth={2}
      />
      {has(state, "pair")
        ? endpoints
            .slice(0, 2)
            .map(([x, y], i) => (
              <line
                key={i}
                x1={x}
                y1={y}
                x2={350}
                y2={280}
                stroke={[colors.blue, colors.orange][i]}
                strokeWidth={9}
                opacity={0.25}
              />
            ))
        : null}
      {paths.map((d, i) => (
        <path
          key={d}
          d={d}
          stroke={[colors.blue, colors.orange, colors.violet][i]}
          fill="none"
          strokeWidth={3}
        />
      ))}
      <path d="M350 65 V490" stroke={muted} strokeDasharray="6 6" />
      <circle cx={350} cy={280} r={5} fill={ink} />
      <Label x={395} y={240} fontSize={30}>
        Q
      </Label>
      {has(state, "block") ? (
        <path
          d="M135 130 H115 V405 H135"
          fill="none"
          stroke={colors.amber}
          strokeWidth={3}
        />
      ) : null}
      <AttentionMarks
        marks={selected
          .map((i) =>
            stroke(
              ...endpoints[i],
              [colors.blue, colors.orange, colors.violet][i],
            ),
          )
          .concat(state.target === "Q" ? [point(350, 280, colors.amber)] : [])}
        progress={state.progress}
      />
      <Label x={380} y={540} align="center" fontSize={27}>
        {has(state, "schedule")
          ? "此前形成邻接 → 检查 → 预约 Q"
          : has(state, "earlier")
            ? "回看：此前形成并保持的这一次邻接"
            : "只需选块内紧挨着的一对"}
      </Label>
    </svg>
  );
}

function FutureDiagram({ state }: { state: VisualState }) {
  const compared = state.visibleStep >= 2;
  const retained = state.visibleStep >= 3 && has(state, "retain");
  return (
    <svg
      width={760}
      height={560}
      aria-label="真实求交、严格未来与保留的逐步判断"
    >
      <Label x={380} y={45} fontSize={28} align="center">
        先求真实交集，再判断未来
      </Label>
      <Label x={110} y={130} fontSize={28}>
        真实求交
      </Label>
      <path
        d="M260 120 H340 M340 120 V200 H410 M340 120 V95 H410"
        fill="none"
        stroke={muted}
        strokeWidth={2}
      />
      <Label x={435} y={100} fontSize={28}>
        空
      </Label>
      <Label x={435} y={205} fontSize={28}>
        点
      </Label>
      {has(state, "empty") ? (
        <Label x={520} y={100} fontSize={28}>
          不预约
        </Label>
      ) : null}
      {compared ? (
        <>
          <path
            d="M80 340 H680 l-15 -8 m15 8 l-15 8"
            fill="none"
            stroke={muted}
            strokeWidth={2}
          />
          <Label x={680} y={380} fontSize={27}>
            x
          </Label>
          <circle cx={365} cy={340} r={7} fill={ink} />
          <Label x={365} y={305} fontSize={28} align="center">
            当前位置 x_P
          </Label>
          <circle
            cx={560}
            cy={340}
            r={10}
            fill="#f6f8fb"
            stroke={colors.amber}
            strokeWidth={3}
          />
          <Label x={560} y={405} fontSize={27} align="center">
            严格在右侧
          </Label>
          {has(state, "P") ? (
            <Label x={220} y={405} fontSize={27} align="center">
              当前位置与左侧：不加入
            </Label>
          ) : null}
        </>
      ) : null}
      {retained ? (
        <Label x={380} y={495} fontSize={28} align="center">
          已有真实未来位置：保留到取出
        </Label>
      ) : null}
      <AttentionMarks
        marks={
          state.target === "check"
            ? [stroke(110, 155, 250, 155, colors.amber)]
            : state.target === "empty"
              ? [stroke(430, 120, 640, 120, colors.amber)]
              : state.target === "future" || state.target === "retain"
                ? [point(560, 340, colors.amber)]
                : state.target === "P"
                  ? [point(365, 340, colors.amber)]
                  : []
        }
        progress={state.progress}
      />
    </svg>
  );
}

function QueueDiagram({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  if (row.page === "future") return <FutureDiagram state={state} />;
  const hypothesis = row.page === "earliest";
  const scheduled = !hypothesis || has(state, "schedule");
  const arrived = has(state, "arrive");
  const marks =
    state.target === "P"
      ? [point(300, 270, colors.amber)]
      : ["retain", "future", "schedule", "arrive"].includes(state.target ?? "")
        ? [point(580, 270, colors.amber)]
        : state.target === "left" || state.target === "consume"
          ? [stroke(100, 270, 490, 270, colors.amber)]
          : [];
  return (
    <svg
      width={760}
      height={560}
      aria-label={
        hypothesis ? "最早未到达事件的反证示意" : "已知记录保留与按序取出示意"
      }
    >
      <Label x={380} y={45} fontSize={28} align="center">
        {hypothesis
          ? "假设：最早未到达的真实事件"
          : "沿用第二章：保留、有限、按序取出"}
      </Label>
      <path
        d="M70 270 H690 l-15 -8 m15 8 l-15 8"
        fill="none"
        stroke={muted}
        strokeWidth={2}
      />
      <Label x={690} y={315} fontSize={27}>
        x
      </Label>
      {[130, 215, 400].map((at, i) => (
        <g key={at}>
          <circle cx={at} cy={270} r={7} fill={ink} />
          <Label x={at} y={330} fontSize={25} align="center">
            {i === 1 ? "此前事件" : ""}
          </Label>
        </g>
      ))}
      <circle
        cx={580}
        cy={270}
        r={12}
        fill={arrived ? colors.amber : "#f6f8fb"}
        stroke={scheduled ? colors.amber : muted}
        strokeWidth={3}
        strokeDasharray={scheduled ? undefined : "4 4"}
      />
      <Label x={580} y={220} fontSize={29} align="center">
        {hypothesis ? "假定漏点" : "Q"}
      </Label>
      {has(state, "schedule") ? (
        <path
          d="M215 180 Q395 80 580 180"
          fill="none"
          stroke={colors.amber}
          strokeWidth={3}
        />
      ) : null}
      {has(state, "all") ? (
        <Label x={380} y={435} fontSize={29} align="center">
          到站 → 找齐全体 → 报告全部输入对
        </Label>
      ) : scheduled ? (
        <Label x={380} y={435} fontSize={29} align="center">
          {arrived ? "必然到达，与漏点假设矛盾" : "真实未来位置保留到取出"}
        </Label>
      ) : (
        <Label x={580} y={435} fontSize={26} align="center">
          尚未推出已经登记
        </Label>
      )}
      <AttentionMarks marks={marks} progress={state.progress} />
    </svg>
  );
}

function UnifiedFlow({ state }: { state: VisualState }) {
  const entries = [
    ["take", "取位置"],
    ["collect", "找参与者"],
    ["report", "报告"],
    ["update", "更新"],
    ["check", "检查"],
  ];
  return (
    <svg width={760} height={580} aria-label="同点事件的数学处理阶段">
      {entries.map(([key, text], i) => {
        const shown = has(state, key);
        const y = 65 + i * 105;
        return (
          <g key={key} visibility={shown ? "visible" : "hidden"}>
            {i ? (
              <path
                d={`M380 ${y - 72} v35 l-8 -12 m8 12 l8 -12`}
                stroke={muted}
                fill="none"
                strokeWidth={2}
              />
            ) : null}
            <rect
              x={225}
              y={y - 27}
              width={310}
              height={60}
              rx={8}
              fill={key === "report" ? "#fef3c7" : "#e2e8f0"}
            />
            <Label x={380} y={y + 4} fontSize={31} align="center">
              {text}
            </Label>
            <AttentionMarks
              marks={
                state.target === key
                  ? [stroke(230, y + 38, 530, y + 38, colors.amber)]
                  : []
              }
              progress={state.progress}
            />
          </g>
        );
      })}
    </svg>
  );
}

function CaseDiagram({ row, state }: { row: TimelineRow; state: VisualState }) {
  const cases =
    row.page === "cases-nonzero"
      ? [
          {
            key: "endpoint",
            names: "A、B",
            before: "A",
            count: "一对",
            after: "B",
          },
          {
            key: "interior",
            names: "B、C",
            before: "C",
            count: "一对",
            after: "C、B",
          },
          {
            key: "mixed",
            names: "A、B、C、D",
            before: "D、A、C",
            count: "六对",
            after: "C、B、D",
          },
        ]
      : [
          {
            key: "line-points",
            names: "C、Z_1、Z_2",
            before: "C",
            count: "三对",
            after: "C",
          },
          {
            key: "points",
            names: "Z_1、Z_2 ／ Z_1",
            before: "空",
            count: "一对 ／ 无",
            after: "空",
          },
          {
            key: "touch",
            names: "A、F",
            before: "A",
            count: "一对",
            after: "F",
          },
        ];
  return (
    <svg
      width={760}
      height={570}
      aria-label="每行独立案例的旧顺序、结果与新顺序"
    >
      <Label x={380} y={30} align="center" fontSize={27}>
        每行独立取输入；顺序均从下到上
      </Label>
      {cases.map((c, i) => (
        <g key={c.key} visibility={i < row.visibleStep ? "visible" : "hidden"}>
          <Label x={30} y={100 + i * 160} fontSize={28}>
            {c.names}
          </Label>
          <Label x={95} y={160 + i * 160} fontSize={27} align="center">
            {c.before}
          </Label>
          <path
            d={`M210 ${155 + i * 160} H300 m-10 -7 l10 7 l-10 7 M445 ${155 + i * 160} H535 m-10 -7 l10 7 l-10 7`}
            fill="none"
            stroke={muted}
          />
          <Label x={370} y={160 + i * 160} fontSize={26} align="center">
            {c.count}
          </Label>
          <Label x={635} y={160 + i * 160} fontSize={27} align="center">
            {c.after}
          </Label>
          <AttentionMarks
            marks={
              state.target === c.key
                ? [stroke(30, 195 + i * 160, 725, 195 + i * 160, colors.amber)]
                : []
            }
            progress={state.progress}
          />
        </g>
      ))}
    </svg>
  );
}

export function UpdateDiagram({
  kind,
  row,
  state,
}: {
  kind: DiagramKind;
  row: TimelineRow;
  state: VisualState;
}) {
  switch (kind) {
    case "members":
      return row.visibleStep === 1 ? (
        <Geometry names={["A", "B", "C", "D"]} state={state} />
      ) : (
        <RoleFlow state={state} />
      );
    case "order":
      return (
        <div style={{ display: "flex", gap: 20 }}>
          <Geometry names={["D", "A", "C"]} side="left" state={state} />
          <Geometry names={["C", "B", "D"]} side="right" state={state} />
        </div>
      );
    case "equal":
      return <EqualSlope row={row} state={state} />;
    case "gap":
      return <GapDiagram state={state} />;
    case "neighbors":
      return <NeighborDiagram row={row} state={state} empty={false} />;
    case "empty":
      return <NeighborDiagram row={row} state={state} empty />;
    case "discovery":
      return <DiscoveryDiagram state={state} />;
    case "queue":
      return <QueueDiagram row={row} state={state} />;
    case "flow":
      return <UnifiedFlow state={state} />;
    case "cases":
      return <CaseDiagram row={row} state={state} />;
  }
}
