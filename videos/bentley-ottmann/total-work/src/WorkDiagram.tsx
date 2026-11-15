import { SvgMathText, MathText } from "../../../shared/ui/SemanticMathText";
import { colors, inputColors } from "../../colors.ts";
import { pages } from "./storyboard";
import type { TimelineRow, VisualState } from "./timeline";
import trace from "./case-evidence.json";
const ink = "#172c45",
  muted = "#64748b";
const label = (x: number, y: number, text: string, fill = ink, size = 28) => (
  <SvgMathText x={x} y={y} fontSize={size} fill={fill}>
    {text}
  </SvgMathText>
);
const centered = (
  x: number,
  y: number,
  text: string,
  fill = ink,
  size = 28,
) => (
  <SvgMathText
    x={x}
    y={y}
    fontSize={size}
    fill={fill}
    align="center"
    verticalAlign="middle"
  >
    {text}
  </SvgMathText>
);
const pairs = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];
const pairNames = pairs.map(([a, b]) => `S_${a},S_${b}`);
const inputs = [
  [-3, -3, 3, 3],
  [-3, 3, 3, -3],
  [-1, -2, 0, 0],
  [0, 0, 2, 1],
];
function Multiway({ row, state }: { row: TimelineRow; state: VisualState }) {
  const count = 4;
  const reports =
    row.id === "TW03"
      ? Math.min(6, Math.floor(state.progress * 7))
      : row.id === "TW14"
        ? 6
        : 0;
  const x = (v: number) => 260 + 58 * v,
    y = (v: number) => 250 - 58 * v;
  const selected = row.id === "TW01" ? state.inputSelected : undefined;
  return (
    <>
      {label(18, 30, "原点的一次事件（真实案例）")}
      <path
        d="M30 250 H485"
        fill="none"
        stroke={muted}
        strokeWidth={1.5}
        markerEnd="url(#tw-axis)"
      />
      <path
        d="M260 445 V45"
        fill="none"
        stroke={muted}
        strokeWidth={1.5}
        markerEnd="url(#tw-axis)"
      />
      {label(470, 280, "x")}
      {label(275, 95, "y")}
      {label(275, 284, "O")}
      {[-3, -2, -1, 1, 2, 3].map((v) => (
        <g key={v} stroke="#cbd5e1">
          <line x1={x(v)} x2={x(v)} y1={y(-3)} y2={y(3)} />
          <line x1={x(-3)} x2={x(3)} y1={y(v)} y2={y(v)} />
        </g>
      ))}
      {inputs.slice(0, count).map(([a, b, c, d], i) => (
        <g key={i}>
          <line
            x1={x(a)}
            y1={y(b)}
            x2={x(c)}
            y2={y(d)}
            stroke={inputColors[i]}
            strokeWidth={3}
          />
          <circle cx={x(a)} cy={y(b)} r={4} fill={inputColors[i]} />
          <circle cx={x(c)} cy={y(d)} r={4} fill={inputColors[i]} />
          {(selected === i || (selected === 1 && i === 0)) && state.active ? (
            <line
              x1={x(a)}
              y1={y(b)}
              x2={x(c)}
              y2={y(d)}
              stroke={inputColors[i]}
              strokeWidth={9}
              opacity={0.28}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={0}
            />
          ) : null}
          {label(
            525,
            100 + 63 * i,
            `S_${i}：${["穿过", "穿过", "结束", "开始"][i]}`,
            inputColors[i],
          )}
        </g>
      ))}
      {row.id !== "TW01" && (
        <>
          {label(525, 380, "报告前均保留")}
          {label(525, 430, row.page === "participants" ? "h_p=4" : "参与组：4")}
          {row.id !== "TW13" &&
            label(
              525,
              475,
              row.id === "TW14" ? `c_p=${reports}` : `新输出：${reports}`,
            )}
        </>
      )}
      {pairs.slice(0, reports).map((_, i) => (
        <g key={i}>
          <rect
            x={25 + (i % 3) * 160}
            y={455 + Math.floor(i / 3) * 46}
            width={150}
            height={40}
            rx={5}
            fill="#e2e8f0"
          />
          {centered(
            100 + (i % 3) * 160,
            475 + Math.floor(i / 3) * 46,
            pairNames[i],
            ink,
            24,
          )}
        </g>
      ))}
    </>
  );
}
function Ledger({ row, state }: { row: TimelineRow; state: VisualState }) {
  const events = trace.multiway.events;
  const revealed = state.ledgerCount;
  if (row.page === "quantities" && row.step < 3)
    return (
      <>
        {label(25, 60, "同一份输入的两种计数")}
        {label(50, 155, "原始身份", muted)}
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <circle cx={90 + i * 150} cy={230} r={28} fill={inputColors[i]} />
            {centered(90 + i * 150, 290, `S_${i}`)}
          </g>
        ))}
        {label(50, 365, "n=4；k=6")}
        {row.step === 2 && (
          <>
            {label(50, 440, "事件位置：一次只计一个")}
            {label(50, 500, "参与组：跨事件重复参加就再次计入")}
          </>
        )}
      </>
    );
  if (row.page === "sum" || row.page === "closing")
    return (
      <>
        {label(30, 45, "累计账本")}
        {[
          ["事件", "E", "2n+k"],
          ["参与组", "H", row.id === "TW18" ? "各次参与量之和" : "E+2k"],
          ["新结果", "k", "每个原始对只支付一次"],
        ].map(([t, a, b], i) => (
          <g key={t}>
            <rect
              x={25}
              y={85 + i * 135}
              width={740}
              height={105}
              rx={9}
              fill={i === 1 ? "#fef3c7" : "#e2e8f0"}
            />
            {label(45, 125 + i * 135, t)}
            {label(230, 125 + i * 135, a)}
            {label(360, 125 + i * 135, b, ink, i === 2 ? 27 : 32)}
          </g>
        ))}
        {label(40, 520, "来源：真实位置、当场参与与唯一新输出")}
      </>
    );
  return (
    <>
      {label(25, 30, "全程账本（按实际位置次序）")}
      {label(35, 85, "位置 p")}
      {label(295, 85, "参与组")}
      {label(420, 85, "新输出")}
      {label(590, 85, "累计 H")}
      {events.slice(0, revealed).map((e, i) => (
        <g key={i}>
          <rect
            x={25}
            y={105 + i * 48}
            width={735}
            height={42}
            fill={i === revealed - 1 ? "#fef3c7" : "#edf1f6"}
          />
          {label(35, 135 + i * 48, `(${e.point.join(",")})`, ink, 26)}
          {label(305, 135 + i * 48, String(e.groups))}
          {label(450, 135 + i * 48, String(e.newPairs))}
          {label(
            625,
            135 + i * 48,
            String(events.slice(0, i + 1).reduce((s, v) => s + v.groups, 0)),
          )}
        </g>
      ))}
      {label(
        45,
        515,
        `E=${revealed}，H=${events.slice(0, revealed).reduce((s, e) => s + e.groups, 0)}，k=${events.slice(0, revealed).reduce((s, e) => s + e.newPairs, 0)}`,
      )}
    </>
  );
}
function Sources({ row, state }: { row: TimelineRow; state: VisualState }) {
  return (
    <>
      {label(25, 40, "一般计数：位置合并只会减少数量")}
      {Array.from({ length: 4 }, (_, i) => (
        <g key={i}>
          <line
            x1={80}
            y1={120 + i * 75}
            x2={300}
            y2={120 + i * 75}
            stroke={inputColors[i]}
            strokeWidth={3}
          />
          <circle cx={80} cy={120 + i * 75} r={7} fill={inputColors[i]} />
          <circle cx={300} cy={120 + i * 75} r={7} fill={inputColors[i]} />
        </g>
      ))}
      {label(65, 460, "每份至多两个端点")}
      {label(115, 510, "总量 ≤2n")}
      {row.step >= 2 && (
        <>
          {label(420, 105, "非端点位置 → 原始见证对")}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle cx={455} cy={190 + i * 85} r={7} fill={colors.emerald} />
              <path
                d={`M480 ${190 + i * 85} H570`}
                stroke={muted}
                markerEnd="url(#tw-axis)"
              />
              {label(600, 200 + i * 85, `(i_${i + 1},j_${i + 1})`, ink, 27)}
            </g>
          ))}
          {label(420, 465, "同一对至多见证一处")}
          {label(470, 515, "总量 ≤k")}
        </>
      )}
      {row.step === 3 && state.active && (
        <rect
          x={400}
          y={70}
          width={385}
          height={465}
          fill="none"
          stroke={colors.amber}
          strokeWidth={3}
        />
      )}
    </>
  );
}
function GroupPairs({ row, state }: { row: TimelineRow; state: VisualState }) {
  const pos = [
    [140, 155],
    [600, 155],
    [140, 395],
    [600, 395],
  ];
  const n =
    row.id === "TW15" ? Math.min(6, 1 + Math.floor(state.progress * 6)) : 6;
  return (
    <>
      {label(20, 35, "组对 → 一个不同的原始见证对")}
      {pairs.slice(0, n).map(([a, b], i) => (
        <line
          key={i}
          x1={pos[a][0]}
          y1={pos[a][1]}
          x2={pos[b][0]}
          y2={pos[b][1]}
          stroke={i === n - 1 && state.active ? colors.amber : "#94a3b8"}
          strokeWidth={3}
        />
      ))}
      {pos.map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r={42}
            fill="#f6f8fb"
            stroke={inputColors[i]}
            strokeWidth={3}
          />
          <circle cx={x} cy={y} r={7} fill={inputColors[i]} />
          {centered(x, y + 65, `G_${i}`, inputColors[i])}
        </g>
      ))}
      {row.id === "TW17" ? (
        <>{label(40, 510, "单组：记在事件；零组：没有组贡献")}</>
      ) : (
        label(75, 520, "每组非空；选出的成员都包含当前位置")
      )}
    </>
  );
}
function Overlap({ row, state }: { row: TimelineRow; state: VisualState }) {
  const event =
    row.id === "TW20"
      ? -1
      : row.id === "TW21"
        ? state.captionSource < 1
          ? 0
          : 1
        : row.id === "TW22"
          ? 2
          : 3;
  const x = (v: number) => 150 + 85 * v;
  const ranges = [
    [0, 6],
    [0, 6],
    [2, 3],
  ];
  const results = event < 0 ? 0 : event === 0 ? 1 : 3;
  const active =
    event < 0
      ? [0, 1, 2]
      : event === 0
        ? [0, 1]
        : event === 1
          ? [0, 1, 2]
          : event === 2
            ? !state.membersRemoved
              ? [0, 1, 2]
              : [0, 1]
            : !state.membersRemoved
              ? [0, 1]
              : [];
  return (
    <>
      {label(20, 45, "同线输入分行展示；坐标均为 y=0")}
      {ranges.map(([a, b], i) => (
        <g key={i}>
          {label(20, 110 + i * 70, `S_${i}`, inputColors[i])}
          <path
            d={`M120 ${100 + i * 70} H720`}
            stroke="#cbd5e1"
            markerEnd="url(#tw-axis)"
          />
          <line
            x1={x(a)}
            y1={100 + i * 70}
            x2={x(b)}
            y2={100 + i * 70}
            stroke={active.includes(i) ? inputColors[i] : "#94a3b8"}
            strokeWidth={4}
          />
          {[a, b].map((v) => (
            <circle
              key={v}
              cx={x(v)}
              cy={100 + i * 70}
              r={5}
              fill={active.includes(i) ? inputColors[i] : "#94a3b8"}
            />
          ))}
          {event >= 0 && (
            <line
              x1={x([0, 2, 3, 6][event])}
              x2={x([0, 2, 3, 6][event])}
              y1={85 + i * 70}
              y2={115 + i * 70}
              stroke={colors.amber}
              strokeWidth={3}
            />
          )}
        </g>
      ))}
      {[0, 2, 3, 6].map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={272} y2={282} stroke={muted} />
          {centered(x(v), 305, String(v), ink, 25)}
        </g>
      ))}
      {label(20, 350, "已报告的完整区间（独立结果行）", ink, 25)}
      {[
        [0, 6],
        [2, 3],
        [2, 3],
      ]
        .slice(0, results)
        .map(([a, b], i) => (
          <g key={i}>
            {label(
              20,
              390 + i * 43,
              ["S_0,S_1", "S_0,S_2", "S_1,S_2"][i],
              ink,
              24,
            )}
            <line
              x1={x(a)}
              x2={x(b)}
              y1={380 + i * 43}
              y2={380 + i * 43}
              stroke={colors.emerald}
              strokeWidth={4}
            />
            <circle cx={x(a)} cy={380 + i * 43} r={4} fill={colors.emerald} />
            <circle cx={x(b)} cy={380 + i * 43} r={4} fill={colors.emerald} />
          </g>
        ))}
      {label(
        20,
        530,
        event < 0
          ? "三份身份；同一条支撑直线"
          : `x=${[0, 2, 3, 6][event]}；新输出 ${[1, 2, 0, 0][event]}；${active.length ? "组保留" : "组为空"}`,
      )}
    </>
  );
}
function Expansion({ row, state }: { row: TimelineRow; state: VisualState }) {
  if (row.id === "TW26") {
    const hasPoint = state.captionSource < 1;
    return (
      <>
        {label(20, 40, "单组：点输入决定是否展开")}
        <rect
          x={70}
          y={95}
          width={210}
          height={270}
          rx={12}
          fill="#edf1f6"
          stroke={inputColors[0]}
        />
        {centered(175, 140, "G_0", inputColors[0])}
        {hasPoint ? (
          <>
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <circle
                  cx={175}
                  cy={210 + i * 55}
                  r={10}
                  fill={inputColors[0]}
                />
                <line
                  x1={185}
                  x2={585}
                  y1={210 + i * 55}
                  y2={265}
                  stroke={colors.amber}
                  strokeWidth={2}
                />
              </g>
            ))}
            <circle cx={595} cy={265} r={10} fill={inputColors[1]} />
            {centered(595, 210, "一份点输入", inputColors[1])}
            {label(40, 425, "每份成员 → 一个新的点—段结果")}
            {label(40, 490, "点输入至少一份，足够支付展开")}
          </>
        ) : (
          <>
            {centered(175, 240, "成员表保留")}
            {centered(175, 295, "不展开")}
            {label(420, 260, "没有点输入")}
            {label(40, 425, "单组无点：不访问整个旧成员表")}
            {label(40, 490, "零组：没有非零成员可展开")}
          </>
        )}
      </>
    );
  }
  return (
    <>
      {label(20, 40, "一般关系：每份展开成员都有当场支付者")}
      {[0, 1].map((g) => (
        <g key={g}>
          <rect
            x={70 + g * 420}
            y={95}
            width={210}
            height={270}
            rx={12}
            fill="#edf1f6"
            stroke={inputColors[g]}
          />
          {centered(175 + g * 420, 140, `G_${g}`, inputColors[g])}
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={175 + g * 420}
              cy={210 + i * 55}
              r={10}
              fill={inputColors[g]}
            />
          ))}
        </g>
      ))}
      {row.step >= 2 &&
        [0, 1, 2].map((i) => (
          <line
            key={i}
            x1={185}
            x2={585}
            y1={210 + i * 55}
            y2={210 + i * 55}
            stroke={colors.amber}
            strokeWidth={state.active ? 3 : 2}
          />
        ))}
      {label(
        40,
        425,
        row.step === 1
          ? "M_p：所有参与成员；t_p：此处点输入"
          : "每个成员至少参加一个跨组新结果",
      )}
      {label(
        40,
        490,
        row.step === 3
          ? "单组有点由点—段支付；单组无点不展开"
          : row.step === 1
            ? "只展开需要报告的相关成员"
            : "结果两端各计一次：M_p≤2c_p",
      )}
    </>
  );
}
const budget = [
  ["准备／成员索引", "n"],
  ["定位／局部更新", "E+H+n"],
  ["局部组排序", "H"],
  ["邻接／预约／弹出", "E+H+n"],
  ["输出／必要展开", "n+k"],
  ["临时记录／清理", "E+H+n+k"],
];
function Budget({ row, state }: { row: TimelineRow; state: VisualState }) {
  const count =
    row.page === "maintenance"
      ? row.step === 1
        ? 1
        : row.step === 2
          ? 2
          : 3
      : 6;
  return (
    <>
      {label(20, 35, "累计量 × 对应单次成本")}
      {budget.slice(0, count).map(([t, q], i) => (
        <g key={t}>
          <rect
            x={20}
            y={75 + i * 65}
            width={750}
            height={58}
            fill={i === count - 1 && state.active ? "#fef3c7" : "#edf1f6"}
          />
          {label(35, 114 + i * 65, t, ink, 27)}
          {label(410, 114 + i * 65, q, ink, 29)}
        </g>
      ))}
      {label(30, 510, "有序维护乘 log(n+1)；基本记录按累计量")}
    </>
  );
}
function Neighbors({ row, state }: { row: TimelineRow; state: VisualState }) {
  const xs = [70, 230, 390, 550, 710];
  const count = state.neighborCount;
  return (
    <>
      {label(25, 35, "当前新块与两侧边界（非执行轨迹）")}
      <rect x={175} y={100} width={430} height={195} fill="#edf1f6" rx={10} />
      {label(250, 115, "新块：r 个组")}
      {xs.map((x, i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={220}
            r={23}
            fill={i > 0 && i < 4 ? colors.blue : muted}
          />
          {centered(
            x,
            275,
            i === 0 ? "外侧" : i === 4 ? "外侧" : `G_${i}`,
            ink,
            24,
          )}
        </g>
      ))}
      {[1, 2, 0, 3].slice(0, count).map((i) => (
        <path
          key={i}
          d={`M${xs[i]} 200 Q${xs[i] + 80} 60 ${xs[i + 1]} 200`}
          stroke={colors.amber}
          fill="none"
          strokeWidth={3}
        />
      ))}
      {label(40, 330, "来自本次参与组：r≤h_p")}
      {label(40, 390, "内部 r−1 对 + 两端至多 2 对")}
      {row.id === "TW35" ? (
        <>
          {label(40, 450, "同一候选位置 → 队列已有记录")}
          {label(40, 510, "仍做查找和尝试；保留一份位置")}
        </>
      ) : (
        <>
          {label(40, 450, "空块：只可能连接两侧")}
          {label(40, 510, "覆盖变化：相关邻接也要检查")}
        </>
      )}
    </>
  );
}
function Costs({ row }: { row: TimelineRow }) {
  const cols = [
    {
      title: "普通求交",
      lines: [
        "原点这一事件",
        "定位与局部排序",
        "必要成员展开",
        "六条原始对结果",
      ],
      color: colors.blue,
    },
    {
      title: "精确数值",
      lines: [
        "同一次比较或算术",
        "分子、分母长度",
        "乘除、约分及存取",
        "单次成本会变化",
      ],
      color: colors.orange,
    },
    {
      title: "教学记录",
      lines: [
        "同一真实事件",
        "全活动与结果快照",
        "格式化和保存",
        "传输与展示另计",
      ],
      color: colors.violet,
    },
  ];
  return (
    <div style={{ height: 550 }}>
      <svg width={800} height={110} viewBox="0 0 800 110" data-geometry-inputs>
        {label(25, 65, "同一原点事件")}
        {inputs.map(([a, b, c, d], i) => (
          <line
            key={i}
            x1={425 + a * 14}
            y1={55 - b * 14}
            x2={425 + c * 14}
            y2={55 - d * 14}
            stroke={inputColors[i]}
            strokeWidth={3}
          />
        ))}
        {label(530, 65, "四组，六个新结果")}
      </svg>
      <div style={{ display: "flex", gap: 18 }}>
        {cols.map((c, i) => (
          <div
            key={c.title}
            style={{
              width: 254,
              height: 430,
              borderTop: `4px solid ${c.color}`,
              background: "#edf1f6",
              padding: 18,
              boxSizing: "border-box",
              visibility: i < row.step ? "visible" : "hidden",
            }}
          >
            <div style={{ fontSize: 30, color: c.color, marginBottom: 32 }}>
              {c.title}
            </div>
            {c.lines.map((t) => (
              <div
                key={t}
                style={{ fontSize: 27, lineHeight: 1.6, marginBottom: 20 }}
              >
                <MathText colorize={false}>{t}</MathText>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
export function WorkDiagram({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const kind = pages[row.page].diagram;
  if (kind === "costs") return <Costs row={row} />;
  const diagrams = {
    multiway: Multiway,
    ledger: Ledger,
    sources: Sources,
    pairs: GroupPairs,
    overlap: Overlap,
    expansion: Expansion,
    budget: Budget,
    neighbors: Neighbors,
  };
  const Diagram = diagrams[kind as keyof typeof diagrams];
  return (
    <svg width={800} height={550} viewBox="0 0 800 550" data-geometry-inputs>
      <defs>
        <marker
          id="tw-axis"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill={muted} />
        </marker>
      </defs>
      {Diagram ? <Diagram row={row} state={state} /> : null}
    </svg>
  );
}
