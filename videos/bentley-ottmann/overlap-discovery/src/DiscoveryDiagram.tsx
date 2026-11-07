import { useId } from "react";
import {
  SvgMathText as Label,
  MathText,
} from "../../../shared/ui/SemanticMathText";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import { colors } from "../../colors.ts";
import { pages } from "./storyboard";
import type { TimelineRow, VisualState } from "./timeline";
import { inputs, type Name } from "./example";

const ink = "#172c45",
  muted = "#94a3b8";

/** Article-specific equal-unit viewport: both comparison panels share this map. */
function CoordinatePanel({
  names,
  title,
  scan,
  candidate,
  pointInput,
  emphasis,
  progress,
}: {
  names: Name[];
  title: string;
  scan?: number;
  candidate?: 2 | 4;
  pointInput?: boolean;
  emphasis?: Name;
  progress: number;
}) {
  const uid = useId().replace(/:/g, "");
  const x = (n: number) => 70 + 29 * n,
    y = (n: number) => 215 - 29 * n;
  return (
    <svg
      width={350}
      height={385}
      viewBox="0 0 350 385"
      data-geometry-inputs={names.join(",")}
      aria-label="等比例教学分图"
    >
      <defs>
        <marker
          id={uid}
          markerWidth={6}
          markerHeight={6}
          refX={5}
          refY={3}
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6 Z" fill={muted} />
        </marker>
      </defs>
      <Label x={175} y={35} align="center" fontSize={23}>
        {title}
      </Label>
      {Array.from({ length: 9 }, (_, i) => i - 1).map((n) => (
        <g key={n}>
          <line x1={x(n)} x2={x(n)} y1={y(-4)} y2={y(5)} stroke="#e2e8f0" />
          <line
            x1={x(n)}
            x2={x(n)}
            y1={y(0) - 3}
            y2={y(0) + 3}
            stroke={muted}
          />
        </g>
      ))}
      {Array.from({ length: 10 }, (_, i) => i - 4).map((n) => (
        <line
          key={n}
          x1={x(-1)}
          x2={x(7)}
          y1={y(n)}
          y2={y(n)}
          stroke="#e2e8f0"
        />
      ))}
      <path
        d={`M${x(-1.5)} ${y(0)} H${x(8)}`}
        fill="none"
        stroke={muted}
        markerEnd={`url(#${uid})`}
      />
      <path
        d={`M${x(0)} ${y(-4.5)} V${y(5.5)}`}
        fill="none"
        stroke={muted}
        markerEnd={`url(#${uid})`}
      />
      <Label x={x(0) - 10} y={y(0) + 24} align="right" fontSize={20}>
        O
      </Label>
      <Label x={x(7.8)} y={y(0) + 24} fontSize={20}>
        x
      </Label>
      <Label x={x(0) + 12} y={y(4.4)} fontSize={20}>
        y
      </Label>
      {[1, 2, 3, 4, 6, 7].map((n) => (
        <Label key={n} x={x(n)} y={y(0) + 24} align="center" fontSize={17}>
          {String(n)}
        </Label>
      ))}
      {scan !== undefined ? (
        <>
          <line
            x1={x(scan)}
            x2={x(scan)}
            y1={y(-4)}
            y2={y(5)}
            stroke={colors.amber}
            strokeDasharray="5 5"
          />
          <Label
            x={175}
            y={374}
            align="center"
            fontSize={21}
          >{`x=${scan}，${pointInput ? "当前配对" : "更新后"}`}</Label>
        </>
      ) : null}
      {names.map((name) => {
        const s = inputs[name];
        return (
          <g key={name} stroke={s.color} fill={s.color}>
            <line
              x1={x(s.start[0])}
              y1={y(s.start[1])}
              x2={x(s.end[0])}
              y2={y(s.end[1])}
              strokeWidth={3}
            />
            {[s.start, s.end].map((p, i) => (
              <circle key={i} cx={x(p[0])} cy={y(p[1])} r={3} />
            ))}
            <Label
              x={x(
                name === "K"
                  ? 0
                  : name === "G"
                    ? 6.4
                    : (s.start[0] + s.end[0]) / 2,
              )}
              y={y(name === "K" ? 2 : (s.start[1] + s.end[1]) / 2) - 18}
              align="center"
              fontSize={24}
            >
              {name}
            </Label>
          </g>
        );
      })}
      {candidate !== undefined ? (
        <>
          <circle
            cx={x(candidate)}
            cy={y(0)}
            r={7}
            fill="white"
            stroke={ink}
            strokeWidth={2}
          />
          <Label x={x(candidate) + 15} y={y(0) - 24} fontSize={21}>
            {candidate === 4 ? "Q_1" : "Q_2"}
          </Label>
        </>
      ) : null}
      {pointInput ? (
        <>
          <path
            d={`M${x(2)} ${y(0) - 11} l11 11 l-11 11 l-11 -11 Z`}
            fill="none"
            stroke={colors.violet}
            strokeWidth={2}
          />
          <Label x={x(2) - 15} y={y(0) + 76} align="right" fontSize={21}>
            W
          </Label>
        </>
      ) : null}
      {emphasis ? (
        <AttentionMarks
          marks={[
            {
              kind: "line",
              from: inputs[emphasis].start,
              to: inputs[emphasis].end,
              color: inputs[emphasis].color,
            },
          ]}
          project={(p) => [x(p[0]), y(p[1])]}
          progress={progress}
        />
      ) : null}
    </svg>
  );
}

function Coverage({ row, state }: { row: TimelineRow; state: VisualState }) {
  const n = Number(row.id.slice(2)),
    selected = n >= 5;
  const u = n === 8 ? 650 : 430;
  return (
    <svg
      width={740}
      height={470}
      viewBox="0 0 740 470"
      aria-label="同线成员的独立范围示意，不表示高度"
    >
      <Label x={370} y={35} align="center" fontSize={25}>
        同线成员的独立范围示意
      </Label>
      <line x1={80} x2={685} y1={390} y2={390} stroke={muted} />
      <path d="M675 384 L687 390 L675 396" fill="none" stroke={muted} />
      <Label x={700} y={398} fontSize={24}>
        x
      </Label>
      {[
        [100, 380],
        [150, 580],
        [180, 470],
      ].map(([a, b], i) => (
        <g key={i}>
          <line
            x1={a}
            x2={b}
            y1={125 + i * 90}
            y2={125 + i * 90}
            stroke={i === 1 && selected ? colors.blue : muted}
            strokeWidth={4}
          />
          <circle cx={a} cy={125 + i * 90} r={4} fill={ink} />
          <circle cx={b} cy={125 + i * 90} r={4} fill={ink} />
          {n >= 4 ? (
            <>
              <Label x={a} y={105 + i * 90} align="center" fontSize={24}>
                {i === 1 && selected ? "l_j" : i === 0 ? "l_i" : ""}
              </Label>
              <Label x={b} y={105 + i * 90} align="center" fontSize={24}>
                {i === 1 && selected ? "r_j=R_{G_a}" : i === 0 ? "r_i" : ""}
              </Label>
            </>
          ) : null}
          {i === 1 && selected ? (
            <Label x={80} y={223} align="right" fontSize={24}>
              S_j
            </Label>
          ) : null}
        </g>
      ))}
      <line
        x1={260}
        x2={260}
        y1={65}
        y2={400}
        stroke={colors.amber}
        strokeDasharray="6 5"
      />
      <Label x={260} y={430} align="center" fontSize={28}>
        t
      </Label>
      {n >= 6 ? (
        <>
          <line
            x1={u}
            x2={u}
            y1={185}
            y2={405}
            stroke={colors.orange}
            strokeDasharray="4 5"
          />
          <Label x={u} y={430} align="center" fontSize={28}>
            u
          </Label>
        </>
      ) : null}
      {selected ? (
        <line
          x1={580}
          x2={580}
          y1={215}
          y2={390}
          stroke={colors.blue}
          strokeDasharray="4 5"
        />
      ) : null}
      {n === 7 ? (
        <AttentionMarks
          marks={[
            {
              kind: "line",
              from: [260, 215],
              to: [580, 215],
              color: colors.blue,
            },
          ]}
          progress={state.progress}
        />
      ) : null}
    </svg>
  );
}

function Order({ row, state }: { row: TimelineRow; state: VisualState }) {
  const n = Number(row.id.slice(2));
  const empty = n === 37 && state.phase === 2;
  return (
    <svg
      width={740}
      height={460}
      viewBox="0 0 740 460"
      aria-label="一般组层顺序示意"
    >
      <Label x={370} y={30} align="center" fontSize={24}>
        {empty
          ? "空块退出后，两侧接起"
          : n === 38
            ? "回看非空新块：内部候选"
            : "不同组直线的一般示意"}
      </Label>
      <line x1={90} x2={650} y1={80} y2={80} stroke={muted} strokeWidth={2} />
      <line x1={90} x2={650} y1={380} y2={380} stroke={muted} strokeWidth={2} />
      <Label x={665} y={87} fontSize={22}>
        上侧
      </Label>
      <Label x={665} y={387} fontSize={22}>
        下侧
      </Label>
      {!empty ? (
        [-1, 0, 1].map((s, i) => (
          <g key={s}>
            <line
              x1={150}
              x2={590}
              y1={230 + s * 100}
              y2={230 - s * 100}
              stroke={[colors.blue, colors.orange, colors.emerald][i]}
              strokeWidth={3}
            />
            <circle cx={370} cy={230} r={5} fill={ink} />
          </g>
        ))
      ) : (
        <path
          d="M370 95 V365 M360 105 L370 95 L380 105 M360 355 L370 365 L380 355"
          fill="none"
          stroke={colors.amber}
          strokeWidth={3}
        />
      )}
      <line
        x1={370}
        x2={370}
        y1={65}
        y2={410}
        stroke={muted}
        strokeDasharray="5 5"
      />
      <Label x={370} y={440} align="center" fontSize={23}>
        当前点所在截面
      </Label>
      {n >= 32 && !empty ? (
        <rect
          x={130}
          y={115}
          width={70}
          height={230}
          rx={12}
          fill="none"
          stroke={colors.amber}
          strokeWidth={2}
        />
      ) : null}
      {n >= 35 && !empty ? (
        <>
          <path
            d="M620 345 V115 M610 125 L620 115 L630 125"
            stroke={colors.amber}
            fill="none"
            strokeWidth={2}
          />
          <Label x={630} y={240} fontSize={22}>
            斜率增大
          </Label>
        </>
      ) : null}
      {n === 37 && state.phase === 1 ? (
        <AttentionMarks
          marks={[
            {
              kind: "line",
              from: [590, 80],
              to: [590, 130],
            },
            { kind: "line", from: [590, 330], to: [590, 380] },
          ]}
          progress={state.operationProgress}
        />
      ) : null}
    </svg>
  );
}

function Discovery({ row, state }: { row: TimelineRow; state: VisualState }) {
  const n = Number(row.id.slice(2));
  if (n <= 42)
    return (
      <svg
        width={740}
        height={470}
        viewBox="0 0 740 470"
        aria-label="目标左侧连续块，一般证明示意"
      >
        <Label x={370} y={35} align="center" fontSize={24}>
          尚未假定目标已经到达
        </Label>
        {n >= 41 ? (
          <rect x={350} y={80} width={140} height={300} fill="#fef3c7" />
        ) : null}
        {[-1, 0, 1].map((s, i) => (
          <line
            key={s}
            x1={110}
            x2={590}
            y1={230 + s * 130}
            y2={230 - s * 30}
            stroke={[colors.blue, colors.orange, colors.emerald][i]}
            strokeWidth={3}
          />
        ))}
        <circle
          cx={500}
          cy={230}
          r={10}
          fill="white"
          stroke={ink}
          strokeWidth={2}
        />
        <Label x={520} y={205} fontSize={26}>
          Q_*
        </Label>
        {n >= 41 ? (
          <Label x={420} y={420} align="center" fontSize={24}>
            紧邻左侧无事件间隙
          </Label>
        ) : null}
        {n >= 42 ? (
          <>
            <Label x={170} y={145} fontSize={25}>
              G_a
            </Label>
            <Label x={170} y={217} fontSize={25}>
              G_b
            </Label>
            <rect
              x={340}
              y={170}
              width={30}
              height={74}
              fill="none"
              stroke={colors.amber}
              strokeWidth={3}
            />
          </>
        ) : null}
      </svg>
    );
  const first = n === 44;
  const enough = first || n >= 48 || (n === 47 && state.phase >= 1);
  const ends = first ? [590, 610] : [590, enough ? 610 : 400];
  return (
    <svg
      width={740}
      height={470}
      viewBox="0 0 740 470"
      aria-label="持续邻接期间覆盖阈值示意"
    >
      <Label x={370} y={35} align="center" fontSize={24}>
        {first ? "形成时，两组已经够到目标" : "持续邻接期间的当前覆盖"}
      </Label>
      <line
        x1={520}
        x2={520}
        y1={70}
        y2={335}
        stroke={ink}
        strokeDasharray="6 5"
      />
      <Label x={520} y={365} align="center" fontSize={27}>
        x_*
      </Label>
      {ends.map((end, i) => (
        <g key={i}>
          <Label x={65} y={145 + 110 * i} fontSize={27}>
            {i ? "G_b" : "G_a"}
          </Label>
          <line
            x1={155}
            x2={end}
            y1={140 + 110 * i}
            y2={140 + 110 * i}
            stroke={i ? colors.orange : colors.blue}
            strokeWidth={4}
          />
          <circle
            cx={end}
            cy={140 + 110 * i}
            r={5}
            fill={i ? colors.orange : colors.blue}
          />
          <Label x={end} y={115 + 110 * i} align="center" fontSize={24}>
            {i ? "R_{G_b}" : "R_{G_a}"}
          </Label>
        </g>
      ))}
      <line
        x1={155}
        x2={155}
        y1={80}
        y2={300}
        stroke={muted}
        strokeDasharray="4 5"
      />
      <Label x={155} y={330} align="center" fontSize={23}>
        当前
      </Label>
      {n === 47 ? (
        <AttentionMarks
          marks={[
            {
              kind: "line",
              from: [400, 250],
              to: [610, 250],
              color: colors.orange,
            },
          ]}
          progress={state.progress}
        />
      ) : null}
      {n >= 45 ? (
        <>
          <path
            d="M100 410 H650 M640 404 L650 410 L640 416"
            stroke={muted}
            fill="none"
          />
          <circle cx={180} cy={410} r={4} fill={ink} />
          <circle cx={390} cy={410} r={4} fill={colors.amber} />
          <circle cx={620} cy={410} r={7} stroke={ink} fill="white" />
          <Label x={180} y={450} align="center" fontSize={21}>
            形成邻接
          </Label>
          <Label x={390} y={450} align="center" fontSize={21}>
            加入延长
          </Label>
          <Label x={620} y={450} align="center" fontSize={23}>
            Q_*
          </Label>
        </>
      ) : null}
    </svg>
  );
}

export function DiscoveryDiagram({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const kind = pages[row.page].diagram,
    n = Number(row.id.slice(2));
  if (kind === "coverage") return <Coverage row={row} state={state} />;
  if (kind === "order") return <Order row={row} state={state} />;
  if (kind === "discovery") return <Discovery row={row} state={state} />;
  if (kind === "gap") {
    const introduction = n <= 27,
      scan =
        n === 28
          ? state.phase
            ? 1
            : 0
          : n === 29
            ? 2
            : n === 30
              ? 3
              : undefined;
    const names: Name[] = introduction
      ? n === 26
        ? ["I", "J"]
        : ["I", "J", "K"]
      : scan === 0
        ? ["I", "K"]
        : scan === 3
          ? ["J", "K"]
          : ["K"];
    return (
      <div style={{ textAlign: "center" }}>
        <CoordinatePanel
          names={names}
          title={introduction ? "独立四输入案例" : "当前活动成员"}
          scan={scan}
          candidate={n >= 27 ? 2 : undefined}
          pointInput={n === 27 || n === 29}
          emphasis={n === 30 ? "J" : n === 26 ? "I" : "K"}
          progress={state.progress}
        />
        <div style={{ fontSize: 24, marginTop: 18 }}>
          <MathText colorize={false}>
            {introduction
              ? "1 < x < 3：水平输入存在空隙"
              : scan === 3
                ? "水平组：J"
                : scan === 0
                  ? "水平组：I"
                  : "水平组：空"}
          </MathText>
        </div>
      </div>
    );
  }
  const intro = n <= 17;
  const scan =
    n === 18
      ? 0
      : n <= 20
        ? 1
        : n === 23
          ? state.phase === 2
            ? 4
            : 2
          : n === 24
            ? [4, 6, 7][state.phase]
            : 7;
  const f: Name[] = n < 23 ? ["F"] : [];
  const g: Name[] = n >= 16 && (intro || n >= 19) && scan < 7 ? ["G"] : [];
  const h: Name[] = n >= 17 && (intro || scan < 6) ? ["H"] : [];
  return (
    <div style={{ width: 740, textAlign: "center" }}>
      <div style={{ display: "flex", gap: 20 }}>
        <CoordinatePanel
          names={[...f, ...h]}
          title={intro ? (n >= 17 ? "输入 F 与 H" : "输入 F") : "短成员分图"}
          scan={intro ? undefined : scan}
          candidate={n >= 17 ? 4 : undefined}
          emphasis={n === 15 ? "F" : undefined}
          progress={state.progress}
        />
        {n >= 16 ? (
          <CoordinatePanel
            names={[...g, ...h]}
            title={
              intro ? (n >= 17 ? "输入 G 与同一份 H" : "输入 G") : "长成员分图"
            }
            scan={intro ? undefined : scan}
            candidate={n >= 17 ? 4 : undefined}
            emphasis={n === 16 || n === 19 ? "G" : n === 17 ? "H" : undefined}
            progress={state.progress}
          />
        ) : null}
      </div>
      <div style={{ fontSize: 25, marginTop: 18 }}>
        <MathText colorize={false}>
          {intro
            ? "各子图单位相同，重叠成员保持原几何位置"
            : `G_2：${[...f, ...g].join("、") || "空"}；G_3：${h.join("") || "空"}`}
        </MathText>
      </div>
      {n >= 18 ? (
        <div style={{ fontSize: 24, marginTop: 15 }}>
          <MathText colorize={false}>
            {n === 18
              ? "候选未预约：4 > 2"
              : n === 19
                ? "当前最远右端：2 → 7"
                : n === 20
                  ? state.phase === 2
                    ? "Q_1 已预约"
                    : state.phase === 0
                      ? "1 < 4 ≤ 7"
                      : "4 ≤ 6"
                  : "已发现的位置继续保留；到站按实际成员报告"}
          </MathText>
        </div>
      ) : null}
    </div>
  );
}
