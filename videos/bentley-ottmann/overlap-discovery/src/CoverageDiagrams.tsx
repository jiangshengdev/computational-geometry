import { SvgMathText as Label } from "../../../shared/ui/SemanticMathText";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import { colors } from "../../colors.ts";
import type { TimelineRow, VisualState } from "./timeline";

const ink = "#172c45",
  muted = "#94a3b8";

// These are aligned one-dimensional ranges, not displaced geometric inputs.
function Range({
  start,
  end,
  y,
  color,
  label,
  endpoint,
}: {
  start: number;
  end: number;
  y: number;
  color: string;
  label: string;
  endpoint?: string;
}) {
  return (
    <g>
      <Label x={80} y={y} align="right" verticalAlign="middle" fontSize={24}>
        {label}
      </Label>
      <line x1={start} x2={end} y1={y} y2={y} stroke={color} strokeWidth={4} />
      <circle cx={start} cy={y} r={4} fill={color} />
      <circle cx={end} cy={y} r={5} fill={color} />
      {endpoint ? (
        <Label x={end} y={y - 24} align="center" fontSize={25}>
          {endpoint}
        </Label>
      ) : null}
    </g>
  );
}

function RangeAxis({
  current = 170,
  target,
  targetLabel = "x_Q",
}: {
  current?: number;
  target?: number;
  targetLabel?: string;
}) {
  return (
    <g>
      <path
        d="M110 370 H690 M680 364 L690 370 L680 376"
        fill="none"
        stroke={muted}
        strokeWidth={2}
      />
      <Label x={705} y={378} fontSize={24}>
        x
      </Label>
      <line
        x1={current}
        x2={current}
        y1={90}
        y2={380}
        stroke={muted}
        strokeDasharray="5 5"
      />
      <Label x={current} y={411} align="center" fontSize={25}>
        t
      </Label>
      {target !== undefined ? (
        <>
          <line
            x1={target}
            x2={target}
            y1={90}
            y2={380}
            stroke={ink}
            strokeDasharray="6 5"
          />
          <Label x={target} y={411} align="center" fontSize={25}>
            {targetLabel}
          </Label>
        </>
      ) : null}
    </g>
  );
}

export function CandidateCoverage({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const n = Number(row.id.slice(2));
  const candidate = n > 10 || (n === 10 && state.phase >= 1);
  const target = 470;
  const emphasis = n === 11 ? state.phase : -1;
  return (
    <svg
      width={740}
      height={470}
      viewBox="0 0 740 470"
      aria-label="两组覆盖共用横坐标，不表示几何高度"
    >
      <Label x={370} y={35} align="center" fontSize={25}>
        两组覆盖范围 · 共用横坐标
      </Label>
      <RangeAxis target={candidate ? target : undefined} />
      <Range
        start={170}
        end={620}
        y={160}
        color={colors.blue}
        label="G_a"
        endpoint="R_{G_a}"
      />
      <Range
        start={170}
        end={560}
        y={280}
        color={colors.orange}
        label="G_b"
        endpoint="R_{G_b}"
      />
      {candidate
        ? [160, 280].map((y) => (
            <circle
              key={y}
              cx={target}
              cy={y}
              r={7}
              fill="white"
              stroke={ink}
              strokeWidth={2}
            />
          ))
        : null}
      {emphasis >= 1 && emphasis <= 3 ? (
        <AttentionMarks
          marks={[
            {
              kind: "line",
              from: [
                emphasis === 1 ? 170 : target,
                emphasis === 1 ? 370 : emphasis === 2 ? 160 : 280,
              ],
              to: [
                emphasis === 1 ? target : emphasis === 2 ? 620 : 560,
                emphasis === 1 ? 370 : emphasis === 2 ? 160 : 280,
              ],
            },
          ]}
          progress={state.operationProgress}
        />
      ) : null}
      <Label x={370} y={455} align="center" fontSize={23}>
        {candidate ? "同一候选位置，分别检查两组" : "每组各有自己的覆盖上限"}
      </Label>
    </svg>
  );
}

export function EndingCoverage({ state }: { state: VisualState }) {
  const removed = state.phase >= 1;
  const empty = state.phase >= 2;
  return (
    <svg
      width={740}
      height={470}
      viewBox="0 0 740 470"
      aria-label="结束者与继续者的独立范围，不表示几何高度"
    >
      <Label x={370} y={35} align="center" fontSize={25}>
        {empty
          ? "另一种情形：没有继续者和新成员"
          : "同线成员范围 · 比较结束与继续"}
      </Label>
      <RangeAxis current={300} />
      {!removed ? (
        <Range
          start={120}
          end={300}
          y={150}
          color={muted}
          label="结束者"
          endpoint="t"
        />
      ) : (
        <Label x={300} y={150} align="center" fontSize={23}>
          结束者已移去
        </Label>
      )}
      {!empty ? (
        <>
          <Range
            start={170}
            end={620}
            y={280}
            color={colors.blue}
            label="继续者"
            endpoint="R_{G_a}"
          />
          <line
            x1={620}
            x2={620}
            y1={290}
            y2={370}
            stroke={colors.blue}
            strokeDasharray="5 5"
          />
        </>
      ) : null}
      <Label x={370} y={455} align="center" fontSize={24}>
        {empty
          ? "空组不再提供覆盖"
          : removed
            ? "移除结束者，最远右端保持原位"
            : "结束者到 t；继续者还在右侧"}
      </Label>
    </svg>
  );
}

export function NeighborCoverage({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const n = Number(row.id.slice(2));
  const extended = n === 22 || state.phase >= 1;
  const checking = n !== 22 && state.phase >= 2;
  return (
    <svg
      width={740}
      height={470}
      viewBox="0 0 740 470"
      aria-label="活动组顺序与覆盖范围示意，不表示几何线段"
    >
      <Label x={370} y={35} align="center" fontSize={25}>
        活动组顺序与覆盖范围示意
      </Label>
      <Range start={170} end={590} y={110} color={muted} label="上邻组" />
      <Range
        start={170}
        end={extended ? 630 : 420}
        y={225}
        color={colors.blue}
        label="当前组"
      />
      <Range start={170} end={570} y={365} color={muted} label="下邻组" />
      {extended ? (
        <Range
          start={280}
          end={n === 22 ? 510 : 630}
          y={285}
          color={colors.orange}
          label="加入者"
        />
      ) : null}
      {extended ? (
        <line
          x1={630}
          x2={630}
          y1={200}
          y2={315}
          stroke={colors.blue}
          strokeDasharray="4 5"
        />
      ) : null}
      <Label x={extended ? 630 : 420} y={195} align="center" fontSize={23}>
        最远右端
      </Label>
      {checking ? (
        <>
          <path
            d="M115 225 V110 H150 M140 104 L150 110 L140 116 M115 225 V365 H150 M140 359 L150 365 L140 371"
            stroke={colors.amber}
            fill="none"
            strokeWidth={3}
          />
          {state.phase === 2 || (n === 21 && state.phase === 3) ? (
            <AttentionMarks
              marks={[
                {
                  kind: "line",
                  from: [115, 225],
                  to: [115, state.phase === 2 ? 110 : 365],
                },
                ...(n === 39
                  ? [
                      {
                        kind: "line" as const,
                        from: [115, 225] as [number, number],
                        to: [115, 365] as [number, number],
                      },
                    ]
                  : []),
              ]}
              progress={state.operationProgress}
            />
          ) : null}
        </>
      ) : null}
      <Label x={370} y={440} align="center" fontSize={24}>
        {n === 22
          ? "新成员未超过原上限，邻接也未变"
          : checking
            ? "覆盖延长：检查更新后的上下邻组"
            : "邻接保持，覆盖可以变化"}
      </Label>
    </svg>
  );
}

export function ThresholdCoverage({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const n = Number(row.id.slice(2));
  const revisit = n === 47 && state.phase >= 3;
  const firstCase = n === 44;
  const aEnough = !revisit || state.phase >= 4;
  const bEnough =
    firstCase ||
    n >= 48 ||
    (n === 47 && (revisit ? state.phase >= 5 : state.phase >= 1));
  const booked =
    (firstCase && state.phase >= 1) || (n === 48 && state.phase >= 1);
  const ends = [aEnough ? 590 : 370, bEnough ? 640 : 400];
  return (
    <svg
      width={740}
      height={580}
      viewBox="0 0 740 580"
      aria-label="持续邻接期间两组覆盖首次同时足够"
    >
      <Label x={370} y={35} align="center" fontSize={24}>
        {firstCase
          ? "形成邻接时，两组已经足够"
          : revisit
            ? "回看：两组先后够到目标"
            : "持续邻接期间的当前覆盖"}
      </Label>
      <RangeAxis target={520} targetLabel="x_*" />
      {ends.map((end, i) => (
        <Range
          key={i}
          start={170}
          end={end}
          y={150 + i * 130}
          color={i ? colors.orange : colors.blue}
          label={i ? "G_b" : "G_a"}
          endpoint={i ? "R_{G_b}" : "R_{G_a}"}
        />
      ))}
      {n === 47 &&
      (state.phase === 1 || state.phase === 4 || state.phase === 5) ? (
        <AttentionMarks
          marks={[
            {
              kind: "line",
              from: [
                state.phase === 4 ? 370 : 400,
                state.phase === 4 ? 150 : 280,
              ],
              to: [
                state.phase === 4 ? 590 : 640,
                state.phase === 4 ? 150 : 280,
              ],
              color: state.phase === 4 ? colors.blue : colors.orange,
            },
          ]}
          progress={state.operationProgress}
        />
      ) : null}
      {booked ? (
        <>
          <circle cx={520} cy={370} r={9} fill={colors.emerald} />
          <Label x={650} y={410} align="center" fontSize={23}>
            已预约
          </Label>
        </>
      ) : null}
      <Label x={370} y={458} align="center" fontSize={23}>
        {revisit
          ? state.phase === 3
            ? "形成邻接：两组都不足"
            : state.phase === 4
              ? "较早加入：一组足够，另一组仍不足"
              : "最后一次加入：两组同时足够，补检"
          : firstCase
            ? "形成邻接时检查"
            : n === 46
              ? "固定成员不伸长；新成员加入改变覆盖"
              : n >= 47
                ? "新成员加入 → 覆盖延长 → 补检"
                : "回看形成邻接以后、目标以前"}
      </Label>
      {n >= 45 ? (
        <g>
          <path
            d="M120 510 H650 M640 504 L650 510 L640 516"
            stroke={muted}
            fill="none"
            strokeWidth={2}
          />
          <circle cx={150} cy={510} r={5} fill={ink} />
          <circle cx={370} cy={510} r={5} fill={colors.amber} />
          <circle
            cx={620}
            cy={510}
            r={8}
            fill="white"
            stroke={ink}
            strokeWidth={2}
          />
          <Label x={150} y={551} align="center" fontSize={22}>
            形成邻接
          </Label>
          <Label x={370} y={551} align="center" fontSize={22}>
            加入延长
          </Label>
          <Label x={620} y={551} align="center" fontSize={24}>
            Q_*
          </Label>
        </g>
      ) : null}
    </svg>
  );
}
