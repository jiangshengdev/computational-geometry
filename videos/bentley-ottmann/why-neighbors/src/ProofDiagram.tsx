import { colors, proofColors } from "../../colors.ts";
import { SvgMathText } from "./MathText";
import { pages } from "./lesson";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import type { DiagramCueState } from "./diagram-cues";
const ink = "#172c45",
  grey = "#8999aa";
const label = (x: number, y: number, value: string, color = ink) => (
  <SvgMathText x={x} y={y} fill={color} fontSize={27} colorize>
    {value}
  </SvgMathText>
);
const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = grey,
  dashed = false,
  strokeWidth = dashed ? 2.5 : 3,
) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={color}
    strokeWidth={strokeWidth}
    strokeDasharray={dashed ? "7 7" : undefined}
  />
);
function Axis({ y = 350 }: { y?: number }) {
  return (
    <g>
      {line(60, y, 735, y, grey, false, 2.5)}
      <path d={`M735 ${y} l-15 -7.5 v15 z`} fill={grey} />
      {label(750, y + 8, "x")}
    </g>
  );
}
/** Only the numeric height example has coordinates. Other diagrams are explicitly schematic. */
export function ProofDiagram({
  page,
  step,
  active,
  progress,
  cues = { shown: [], progress: 1 },
}: {
  page: string;
  step: number;
  active: boolean;
  progress: number;
  cues?: DiagramCueState;
}) {
  const kind = pages[page].diagram;
  return (
    <svg width={800} height={500} viewBox="0 0 800 500" data-proof-diagram>
      {kind === "height" ? (
        <Height page={page} step={step} active={active} progress={progress} />
      ) : null}
      {kind === "numeric" || kind === "position" ? (
        <Position
          numeric={kind === "numeric"}
          step={step}
          active={active}
          progress={progress}
        />
      ) : null}
      {kind === "interval" || kind === "sandwich" || kind === "triple" ? (
        <Adjacent page={page} step={step} />
      ) : null}
      {kind === "start" || kind === "end" || kind === "swap" ? (
        <Neighbors
          kind={kind}
          step={step}
          active={active}
          progress={progress}
        />
      ) : null}
      {kind === "missed" ? <Missed page={page} step={step} /> : null}
      {kind === "concept" ? (
        <Concept page={page} step={step} cues={cues} />
      ) : null}
    </svg>
  );
}
function Height({
  page,
  step,
  active,
  progress,
}: {
  page: string;
  step: number;
  active: boolean;
  progress: number;
}) {
  // 50 pixels per unit on both axes. Exact original A and C endpoints.
  const x = (n: number) => 100 + 50 * n,
    y = (n: number) => 370 - 50 * n;
  const at = page === "signs-example" ? Math.min(8, step + 5) : 6;
  return (
    <g>
      {line(70, y(0), 660, y(0), grey, false, 2.5)}
      <path d={`M660 ${y(0)} l-15 -7.5 v15 z`} fill={grey} />
      {line(x(0), 430, x(0), 30, grey, false, 2.5)}
      <path d={`M${x(0)} 30 l-7.5 15 h15 z`} fill={grey} />
      {label(670, 380, "x")}
      {label(70, 55, "y")}
      {label(110, 401, "O")}
      {[2, 4, 6, 8, 10].map((n) => (
        <g key={n}>
          {line(x(n), 365, x(n), 375)}
          {label(x(n) - 7, 410, String(n))}
        </g>
      ))}
      {[-1, 1, 3, 5].map((n) => (
        <g key={n}>
          {line(95, y(n), 105, y(n))}
          {label(45, y(n) + 8, String(n))}
        </g>
      ))}
      {line(x(0), y(1), x(10), y(1), proofColors.A)}
      {label(625, y(1) + 8, "A", proofColors.A)}
      {line(x(2), y(6), x(9), y(-1), proofColors.C)}
      {label(x(2) + 20, y(6), "C", proofColors.C)}
      {line(x(at), 45, x(at), y(0), grey, true)}
      <circle cx={x(at)} cy={y(1)} r={5} fill={proofColors.A} />
      <circle cx={x(at)} cy={y(8 - at)} r={5} fill={proofColors.C} />
      {page === "signs-example" && step >= 2
        ? label(430, 275, "P=(7,1)")
        : null}
      {label(245, 465, `x=${at}：同一位置比较高度`)}
      {active ? (
        <AttentionMarks
          marks={[
            {
              kind: "line",
              from: [x(at), y(1)],
              to: [x(at), y(8 - at)],
              color: colors.amber,
            },
          ]}
          progress={progress}
        />
      ) : null}
    </g>
  );
}
function Position({
  numeric,
  step,
  active,
  progress,
}: {
  numeric: boolean;
  step: number;
  active: boolean;
  progress: number;
}) {
  const start = 145,
    end = 650,
    point = numeric ? 271 : 360;
  const showPart = step >= (numeric ? 2 : 3),
    showPosition = step >= (numeric ? 3 : 4);
  return (
    <g>
      <Axis />
      {line(start, 341, start, 359)}
      {line(end, 341, end, 359)}
      {label(start - 10, 399, numeric ? "2" : "u")}
      {label(end - 10, 399, numeric ? "10" : "v")}
      {line(start, 155, end, 155, colors.blue)}
      {line(start, 147, start, 163, colors.blue)}
      {line(end, 147, end, 163, colors.blue)}
      {label(280, 125, numeric ? "全程 8" : "全程 v-u")}
      {showPart ? (
        <g>
          {line(start, 235, point, 235, colors.violet)}
          {line(point, 227, point, 243, colors.violet)}
          {label(115, 205, numeric ? "已走 2" : "已走 t(v-u)")}
        </g>
      ) : null}
      {showPosition ? (
        <g>
          <circle cx={point} cy={350} r={6} fill={colors.violet} />
          {label(point - 45, 300, numeric ? "位置 4" : "u+t(v-u)")}
        </g>
      ) : null}
      {active && showPart ? (
        <AttentionMarks
          marks={[
            {
              kind: "line",
              from: [start, 235],
              to: [point, 235],
              color: colors.violet,
            },
          ]}
          progress={progress}
        />
      ) : null}
      {label(
        170,
        465,
        numeric
          ? "全程与已走部分从同一起点量起"
          : "一般位置示意；比例严格在零与一之间",
      )}
    </g>
  );
}
function Adjacent({ page, step }: { page: string; step: number }) {
  const showR =
    page === "stable-interval" ||
    page === "assume-between" ||
    page === "squeeze" ||
    (page === "last-event" && step >= 3);
  const showE = page === "last-event" || page === "stable-interval";
  const showW = (page === "assume-between" && step >= 2) || page === "squeeze";
  const triple = page === "squeeze" && step >= 3;
  return (
    <g>
      {label(
        80,
        40,
        page === "squeeze"
          ? "假设导出的矛盾，不是允许输入"
          : page === "assume-between"
            ? "反证的暂时假设，不是实际执行"
            : "任意交点附近的几何示意",
      )}
      {line(90, 330, 680, 94, proofColors.U)}
      {line(90, 94, 680, 330, proofColors.V)}
      {label(60, 330, "U", proofColors.U)}
      {label(60, 105, "V", proofColors.V)}
      <Axis y={410} />
      {line(385, 212, 385, 410, grey, true)}
      {label(380, 455, "p")}
      {showE ? (
        <g>
          {line(190, 400, 190, 420)}
          {label(180, 455, "e")}
        </g>
      ) : null}
      {showR ? (
        <g>
          {line(287, 160, 287, 410, grey, true)}
          {label(280, 455, "r")}
        </g>
      ) : null}
      {showW ? (
        <g>
          {line(250, 212, triple ? 520 : 320, 212, proofColors.W)}
          {label(195, 205, "W", proofColors.W)}
        </g>
      ) : null}
      {triple ? <circle cx={385} cy={212} r={7} fill={ink} /> : null}
      {page === "squeeze" && step >= 3
        ? label(445, 285, "同一位置、同一高度")
        : null}
    </g>
  );
}
function NeighborOrder({
  items,
  x,
  y = 355,
  spacing = 65,
  width = 130,
}: {
  items: string[];
  x: number;
  y?: number;
  spacing?: number;
  width?: number;
}) {
  return (
    <g>
      {items.map((name, index) => (
        <g key={name}>
          {line(
            x,
            y - spacing * index,
            x + width,
            y - spacing * index,
            name === "U" ? proofColors.U : name === "V" ? proofColors.V : ink,
          )}
          {label(x + width + 20, y + 8 - spacing * index, name)}
        </g>
      ))}
    </g>
  );
}
function Neighbors({
  kind,
  step,
  active,
  progress,
}: {
  kind: "start" | "end" | "swap";
  step: number;
  active: boolean;
  progress: number;
}) {
  const before =
    kind === "start"
      ? ["L", "H"]
      : kind === "end"
        ? ["L", "U", "H"]
        : ["L", "U", "V", "H"];
  const after =
    kind === "start"
      ? ["L", "U", "H"]
      : kind === "end"
        ? ["L", "H"]
        : ["L", "V", "U", "H"];
  const changed = step >= (kind === "end" ? 1 : 2),
    checked = step >= (kind === "end" ? 2 : 3);
  return (
    <g>
      {label(100, 45, "局部顺序示意，从下到上")}
      {label(90, 95, "处理前")}
      {label(460, 95, "处理后")}
      <NeighborOrder items={before} x={90} />
      {line(310, 250, 395, 250)}
      <path d="M395 250 l-15 -7.5 v15 z" fill={grey} />
      {changed ? <NeighborOrder items={after} x={460} /> : null}
      {checked
        ? after.slice(0, -1).map((_, index) =>
            kind === "swap" && index === 1 ? null : (
              <g key={index}>
                {line(
                  680,
                  350 - 65 * index,
                  680,
                  295 - 65 * index,
                  colors.amber,
                )}
                {active ? (
                  <AttentionMarks
                    marks={[
                      {
                        kind: "line",
                        from: [680, 350 - 65 * index],
                        to: [680, 295 - 65 * index],
                        color: colors.amber,
                      },
                    ]}
                    progress={progress}
                  />
                ) : null}
              </g>
            ),
          )
        : null}
      {label(145, 450, "缺少的外侧邻居直接跳过")}
    </g>
  );
}
function Missed({ page, step }: { page: string; step: number }) {
  const defined = page !== "earliest" || step >= 2;
  const hasS = page !== "earliest" && (page !== "last-adjacency" || step >= 3);
  const registered =
    (page === "valid-future" && step >= 3) || page === "retain-report";
  const reported = page === "retain-report" && step >= 4;
  return (
    <g>
      {label(80, 45, "最早漏点反证示意，不是执行轨迹")}
      <Axis />
      {defined ? (
        <g>
          <circle
            cx={620}
            cy={350}
            r={8}
            fill={reported ? colors.violet : "none"}
            stroke={colors.violet}
            strokeWidth={3}
          />
          {label(595, 405, "p_*", colors.violet)}
        </g>
      ) : null}
      {hasS ? (
        <g>
          {line(175, 340, 175, 360, colors.blue)}
          {label(165, 405, "s", colors.blue)}
          {label(90, 290, "形成邻接并检查")}
        </g>
      ) : null}
      {registered ? (
        <g>
          {line(185, 170, 610, 170, colors.violet)}
          <path d="M610 170 l-15 -7.5 v15 z" fill={colors.violet} />
          {label(270, 130, "登记或已有记录")}
          {label(260, 220, "保留到按位置取出")}
        </g>
      ) : null}
      {reported
        ? label(370, 465, "必然报告，与漏点假设矛盾")
        : defined
          ? label(400, 465, "假设最早漏掉的交点")
          : null}
    </g>
  );
}

const arrow = (x1: number, y: number, x2: number, color = grey) => (
  <g>
    {line(x1, y, x2, y, color)}
    <path d={`M${x2} ${y} l-12 -6 v12 z`} fill={color} />
  </g>
);
const point = (x: number, y: number, color = ink) => (
  <circle cx={x} cy={y} r={6} fill={color} />
);
const reject = (x: number, y: number) => (
  <g>
    {line(x - 9, y - 9, x + 9, y + 9, colors.orange)}
    {line(x - 9, y + 9, x + 9, y - 9, colors.orange)}
  </g>
);

/** Only the emphasis disappears at phrase end; introduced objects stay. */
function Cue({
  id,
  cues,
  at,
}: {
  id: string;
  cues: DiagramCueState;
  at: [number, number];
}) {
  return cues.active === id ? (
    <AttentionMarks
      marks={[{ kind: "point", at, color: colors.amber }]}
      progress={cues.progress}
    />
  ) : null;
}

function Concept({
  page,
  step,
  cues,
}: {
  page: string;
  step: number;
  cues: DiagramCueState;
}) {
  switch (page) {
    case "conditions":
      return <Conditions cues={cues} />;
    case "recall":
      return <Recall step={step} cues={cues} />;
    case "general-lines":
    case "common-interval":
    case "negative-direction":
    case "sign-change-result":
      return <HeightRelation page={page} step={step} cues={cues} />;
    case "constant":
    case "coincident":
      return <Constant page={page} step={step} />;
    case "division":
      return <RatioParts step={step} />;
    case "midpoint":
      return <Midpoint step={step} />;
    case "no-events":
      return <StableOrder step={step} cues={cues} />;
    case "w-exists":
      return <Existence step={step} cues={cues} />;
    case "lower-bound":
    case "upper-bound":
    case "reverse-between":
      return <Boundary page={page} step={step} cues={cues} />;
    case "adjacency-result":
      return <AdjacencyResult step={step} />;
    case "soundness":
      return <Soundness step={step} cues={cues} />;
    case "local-work":
      return <LocalWork step={step} cues={cues} />;
    case "cost-boundary":
      return <CostBoundary step={step} />;
    case "prior-events":
      return <PriorEvents step={step} />;
    case "opening":
    case "closing":
      return <ProofChain page={page} step={step} cues={cues} />;
    case "new-neighbors":
      return <EventKinds step={step} />;
    case "conditional-check":
      return <CheckPremise step={step} />;
    case "no-missing":
      return <NoMissing step={step} cues={cues} />;
    default:
      throw Error(`Missing concept diagram: ${page}`);
  }
}

function Conditions({ cues }: { cues: DiagramCueState }) {
  const shown = (id: string) => cues.shown.includes(id);
  return (
    <g>
      {label(65, 40, "适用范围：允许与排除的几何情形")}
      {line(70, 130, 240, 80, proofColors.U)}
      {point(70, 130, proofColors.U)}
      {point(240, 80, proofColors.U)}
      {label(60, 175, "有长度、不竖直")}
      {shown("horizontal") ? (
        <g>
          {line(70, 240, 240, 240, proofColors.U)}
          {label(60, 285, "水平线段允许")}
        </g>
      ) : null}
      {shown("overlap") ? (
        <g>
          {line(320, 110, 500, 110, proofColors.U, false, 6)}
          {line(395, 110, 530, 110, proofColors.V, false, 3)}
          {line(395, 130, 500, 130, colors.amber)}
          {reject(455, 75)}
          {label(330, 175, "排除重叠")}
          <Cue id="overlap" cues={cues} at={[450, 110]} />
        </g>
      ) : null}
      {shown("contact") ? (
        <g>
          {line(590, 130, 755, 130, proofColors.U)}
          {line(615, 65, 675, 130, proofColors.V)}
          {point(675, 130)}
          {reject(720, 75)}
          {label(570, 175, "排除端点接触")}
          <Cue id="contact" cues={cues} at={[675, 130]} />
        </g>
      ) : null}
      {shown("triple") ? (
        <g>
          {line(320, 240, 510, 340, proofColors.U)}
          {line(320, 340, 510, 240, proofColors.V)}
          {line(320, 290, 510, 290, proofColors.W)}
          {reject(485, 215)}
          {label(325, 390, "排除三线共点")}
          <Cue id="triple" cues={cues} at={[415, 290]} />
        </g>
      ) : null}
      {shown("distinct") ? (
        <g>
          {line(600, 245, 685, 275, proofColors.U)}
          {point(685, 275)}
          {line(620, 350, 750, 310, proofColors.V)}
          {line(620, 310, 750, 350, proofColors.W)}
          {line(685, 230, 685, 370, grey, true)}
          {reject(735, 235)}
          {label(575, 390, "事件横坐标各异")}
          <Cue id="distinct" cues={cues} at={[685, 330]} />
        </g>
      ) : null}
      {label(100, 465, "排除的情形只作条件示意，不是允许输入")}
    </g>
  );
}

function Recall({ step, cues }: { step: number; cues: DiagramCueState }) {
  const has = (id: string) => cues.shown.includes(id);
  return (
    <g>
      {label(65, 40, "几何位置 → 活动顺序 → 待处理清单")}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          {line(
            70,
            235 - i * 65,
            350,
            215 - i * 65,
            [proofColors.U, proofColors.W, proofColors.V][i],
          )}
          {has("order") ? (
            <g>
              {point(
                210,
                225 - i * 65,
                [proofColors.U, proofColors.W, proofColors.V][i],
              )}
              {line(
                470,
                235 - i * 65,
                570,
                235 - i * 65,
                [proofColors.U, proofColors.W, proofColors.V][i],
              )}
            </g>
          ) : null}
        </g>
      ))}
      {line(210, 60, 210, 265, grey, true)}
      {arrow(100, 285, 300)}
      {has("order") ? (
        <g>
          {arrow(370, 165, 430)}
          {label(450, 285, "从下到上")}
        </g>
      ) : null}
      {has("neighbor") ? (
        <g>
          {line(600, 235, 600, 170, colors.amber)}
          {label(625, 210, "直接相邻")}
          <Cue id="neighbor" cues={cues} at={[600, 202]} />
        </g>
      ) : null}
      {step >= 3 ? (
        <g>
          {has("endpoints") ? (
            <g>
              {label(65, 345, "待处理清单")}
              {line(90, 390, 710, 390)}
              {[160, 290, 540, 650].map((x) => (
                <g key={x}>
                  {point(x, 390)}
                  {line(x, 378, x, 402)}
                </g>
              ))}
              {label(90, 440, "端点初始登记")}
            </g>
          ) : null}
          {has("future") ? (
            <g>
              {point(420, 390, colors.violet)}
              {label(345, 345, "未来交点")}
              <Cue id="future" cues={cues} at={[420, 390]} />
            </g>
          ) : null}
          {has("unique") ? label(340, 440, "只留一份") : null}
          {has("take") ? arrow(90, 470, 420, colors.violet) : null}
          {has("report") ? label(480, 475, "到达再报告") : null}
        </g>
      ) : null}
    </g>
  );
}

function HeightRelation({
  page,
  step,
  cues,
}: {
  page: string;
  step: number;
  cues: DiagramCueState;
}) {
  const general = page === "general-lines";
  const reverse = page === "negative-direction";
  const result = page === "sign-change-result";
  const firstY = reverse ? 140 : 320;
  const otherY = reverse ? 320 : 140;
  const has = (id: string) => cues.shown.includes(id);
  const scanX =
    general && has("negative") ? 600 : general && has("zero") ? 395 : 190;
  const upperY = (x: number) => 120 + ((x - 95) * 220) / 600;
  return (
    <g>
      {label(
        65,
        40,
        result
          ? "已证结论的几何示意"
          : general && step < 3
            ? "任意两条线段的几何示意"
            : "一般几何示意；固定用 V 减 U",
      )}
      {line(95, firstY + 20, 695, otherY - 20, proofColors.U)}
      {line(95, otherY - 20, 695, firstY + 20, proofColors.V)}
      {label(65, firstY + 25, "U")}
      {label(65, otherY - 15, "V")}
      <Axis y={390} />
      {general ||
      (page === "common-interval" && has("left")) ||
      reverse ||
      result ? (
        <g>
          {line(scanX, 105, scanX, 390, grey, true)}
          {label(scanX - 15, 430, general ? "x" : "u")}
        </g>
      ) : null}
      {!general && (page !== "common-interval" || has("right")) ? (
        <g>
          {line(600, 105, 600, 390, grey, true)}
          {label(590, 430, "v")}
          {line(190, 390, 600, 390, colors.amber, false, 5)}
        </g>
      ) : null}
      {(page === "common-interval" && step >= 2) || reverse || result ? (
        <g>
          {label(120, 85, reverse ? "d(u)<0" : result ? "两端异号" : "d(u)")}
          {label(525, 85, reverse ? "d(v)>0" : result ? "内部等高" : "d(v)")}
        </g>
      ) : null}
      {page === "common-interval" && has("positive") ? (
        <g>
          {label(110, 345, "d(u)>0")}
          <Cue id="positive" cues={cues} at={[190, 230]} />
        </g>
      ) : null}
      {page === "common-interval" && has("negative") ? (
        <g>
          {label(535, 345, "d(v)<0")}
          <Cue id="negative" cues={cues} at={[600, 230]} />
        </g>
      ) : null}
      {general && step >= 3 ? (
        <g>
          {line(
            scanX,
            upperY(scanX),
            scanX,
            460 - upperY(scanX),
            colors.amber,
            false,
            5,
          )}
          {label(245, 350, "d(x)=y_V(x)-y_U(x)")}
        </g>
      ) : null}
      {general && step >= 4 ? (
        <g>
          {has("positive") ? (
            <g>
              {point(190, upperY(190), proofColors.V)}
              <Cue id="positive" cues={cues} at={[190, upperY(190)]} />
            </g>
          ) : null}
          {has("zero") ? (
            <g>
              {point(395, 230)}
              <Cue id="zero" cues={cues} at={[395, 230]} />
            </g>
          ) : null}
          {has("negative") ? (
            <g>
              {point(600, upperY(600), proofColors.V)}
              <Cue id="negative" cues={cues} at={[600, upperY(600)]} />
            </g>
          ) : null}
        </g>
      ) : null}
      {result ? (
        <g>
          {point(395, 230)}
          {label(430, 265, "高度差为零")}
        </g>
      ) : null}
      {label(
        115,
        480,
        result
          ? "两种变号方向均适用；图示不替代代数证明"
          : general
            ? "比较同一横坐标处的两个高度"
            : "两条线段都覆盖整个区间，包含两端",
      )}
    </g>
  );
}

function Constant({ page, step }: { page: string; step: number }) {
  if (page === "coincident")
    return (
      <g>
        {label(65, 40, "所在直线重合 ≠ 线段必然重叠")}
        {line(80, 260, 720, 160, grey, true)}
        {step >= 2 ? (
          <g>
            {line(120, 253.75, 670, 167.8125, proofColors.U, false, 6)}
            {line(120, 253.75, 670, 167.8125, proofColors.V, true, 3)}
            {label(100, 120, "U、V 的所在直线重合")}
          </g>
        ) : null}
        {step >= 3 ? (
          <g>
            {line(280, 228.75, 530, 189.6875, colors.amber, false, 8)}
            {label(240, 340, "共同覆盖的非零长度区间")}
            {label(280, 400, "重叠，已被排除")}
          </g>
        ) : null}
        {label(100, 470, "一般示意；只在共同覆盖区间讨论重叠")}
      </g>
    );
  return (
    <g>
      {label(65, 40, "高度差不随位置变化")}
      {label(65, 100, "\\alpha=0")}
      {[1, -1].map((sign, i) =>
        step >= i + 2 ? (
          <g key={sign}>
            {line(75 + i * 380, 280, 345 + i * 380, 220, proofColors.U)}
            {line(
              75 + i * 380,
              280 - sign * 80,
              345 + i * 380,
              220 - sign * 80,
              proofColors.V,
            )}
            {label(90 + i * 380, 160, sign > 0 ? "\\beta>0" : "\\beta<0")}
            {label(
              65 + i * 380,
              400,
              sign > 0 ? "V 始终在 U 上方" : "V 始终在 U 下方",
            )}
            {[125, 285].map((x) => (
              <g key={x}>
                {line(
                  x + i * 380,
                  280 - ((x - 75) * 60) / 270,
                  x + i * 380,
                  280 - ((x - 75) * 60) / 270 - sign * 80,
                  colors.amber,
                  false,
                  4,
                )}
              </g>
            ))}
          </g>
        ) : null,
      )}
      {label(120, 470, "两种情况分别示意；固定次序的高度差不变")}
    </g>
  );
}

function RatioParts({ step }: { step: number }) {
  return (
    <g>
      {label(65, 40, "正的分母由两个正的部分组成")}
      {line(360, 180, 650, 180, colors.orange, false, 8)}
      {label(425, 145, "-d(v)>0")}
      {step >= 2 ? (
        <g>
          {line(120, 180, 360, 180, colors.blue, false, 8)}
          {label(175, 145, "d(u)>0")}
          {line(120, 300, 650, 300, colors.violet, false, 5)}
          {label(235, 355, "d(u)-d(v)")}
          {[120, 360, 650].map((x) => (
            <g key={x}>
              {line(x, 165, x, 195)}
              {line(x, 285, x, 315)}
            </g>
          ))}
        </g>
      ) : null}
      {step >= 3 ? (
        <g>
          {arrow(120, 410, 360, colors.blue)}
          {label(385, 425, "分子只是全长的一部分")}
        </g>
      ) : null}
      {label(145, 480, "长度关系示意；不指定两端高度差的数值")}
    </g>
  );
}

function Midpoint({ step }: { step: number }) {
  return (
    <g>
      {label(65, 40, "平均值对应两个位置的中点")}
      <Axis y={310} />
      {[
        [160, "e"],
        [390, "r"],
        [620, "p"],
      ].map(([x, name]) => (
        <g key={name}>
          {line(Number(x), 300, Number(x), 320)}
          {label(Number(x) - 10, 365, String(name))}
        </g>
      ))}
      {step >= 2 ? (
        <g>
          {line(160, 170, 390, 170, colors.blue, false, 5)}
          {label(185, 130, "r-e>0")}
        </g>
      ) : null}
      {step >= 3 ? (
        <g>
          {line(390, 170, 620, 170, colors.orange, false, 5)}
          {label(440, 130, "p-r>0")}
        </g>
      ) : null}
      {step >= 4 ? (
        <g>
          {line(390, 310, 620, 310, colors.amber, false, 5)}
          {label(310, 440, "r 到 p 之前没有其他事件")}
        </g>
      ) : null}
    </g>
  );
}

function StableOrder({ step, cues }: { step: number; cues: DiagramCueState }) {
  return (
    <g>
      {label(65, 40, "无事件区间：成员保持，顺序保持")}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          {line(
            100,
            100 + i * 40,
            680,
            100 + i * 40,
            [proofColors.U, proofColors.W, proofColors.V][i],
          )}
        </g>
      ))}
      {line(190, 75, 190, 205, grey, true)}
      {line(590, 75, 590, 205, grey, true)}
      {step >= 2 ? (
        <g>
          {label(70, 260, "反证：假设一对颠倒上下关系")}
          {line(100, 300, 680, 410, proofColors.U)}
          {line(100, 410, 680, 300, proofColors.V)}
          {line(190, 285, 190, 430, grey, true)}
          {line(590, 285, 590, 430, grey, true)}
          {cues.shown.includes("crossing") ? (
            <g>
              {point(390, 355)}
              <Cue id="crossing" cues={cues} at={[390, 355]} />
            </g>
          ) : null}
          {cues.shown.includes("contradiction") ? (
            <g>
              {reject(430, 355)}
              {label(445, 470, "内部出现交点：矛盾")}
            </g>
          ) : null}
        </g>
      ) : null}
    </g>
  );
}

function Existence({ step, cues }: { step: number; cues: DiagramCueState }) {
  return (
    <g>
      {label(65, 40, "分别排除两种结束位置")}
      {[0, 1].map((i) =>
        step >= i + 1 ? (
          <g key={i}>
            {label(
              70,
              100 + i * 150,
              i ? "假设恰在 p 结束" : "假设在 r 与 p 之间结束",
            )}
            {line(180, 140 + i * 150, 650, 140 + i * 150, grey, true)}
            {line(
              180,
              140 + i * 150,
              i ? 650 : 410,
              140 + i * 150,
              proofColors.W,
              false,
              5,
            )}
            {point(i ? 650 : 410, 140 + i * 150, proofColors.W)}
            {label(170, 185 + i * 150, "r")}
            {label(640, 185 + i * 150, "p")}
            {(
              i ? cues.shown.includes("same") : cues.shown.includes("endpoint")
            ) ? (
              <g>
                {reject(i ? 695 : 450, 140 + i * 150)}
                <Cue
                  id={i ? "same" : "endpoint"}
                  cues={cues}
                  at={[i ? 650 : 410, 140 + i * 150]}
                />
              </g>
            ) : null}
          </g>
        ) : null,
      )}
      {step >= 3 ? (
        <g>
          {line(180, 400, 690, 400, proofColors.W, false, 5)}
          {label(170, 445, "r")}
          {label(640, 445, "p")}
          {label(270, 480, "W 必须一直存在到 p")}
        </g>
      ) : null}
    </g>
  );
}

function Boundary({
  page,
  step,
  cues,
}: {
  page: string;
  step: number;
  cues: DiagramCueState;
}) {
  const reverse = page === "reverse-between";
  const upper = page === "upper-bound";
  const lowerName = reverse ? "V" : "U",
    upperName = reverse ? "U" : "V";
  const crossingX = 160 + 390 * (upper ? 12 / 19 : 4 / 7);
  const crossingY = upper ? 100 + (110 * 12) / 19 : 340 - (130 * 4) / 7;
  return (
    <g>
      {label(
        65,
        40,
        reverse ? "相反顺序的夹层假设" : "待排除的假设，不是允许输入",
      )}
      {line(160, 340, 650, 340 - 490 / 3, proofColors[lowerName])}
      {line(160, 100, 650, 100 + (490 * 11) / 39, proofColors[upperName])}
      {label(110, 345, lowerName)}
      {label(110, 105, upperName)}
      {line(160, 85, 160, 395, grey, true)}
      {line(550, 85, 550, 395, grey, true)}
      {label(150, 435, "r")}
      {label(540, 435, "p")}
      {reverse ? (
        <g>
          {line(
            160,
            220,
            step >= 4 ? 550 : 300,
            step >= 4 ? 210 : 220 - 140 / 39,
            proofColors.W,
          )}
          {label(205, 195, "W")}
          {step >= 4 ? (
            <g>
              {point(550, 210)}
              {label(300, 480, "再次被迫三线共点")}
            </g>
          ) : null}
        </g>
      ) : (
        <g>
          {line(160, 220, 550, upper ? 140 : 300, proofColors.W)}
          {label(310, upper ? 165 : 280, "W")}
          <Cue id="left" cues={cues} at={[160, 220]} />
          <Cue id="right" cues={cues} at={[550, upper ? 140 : 300]} />
          {cues.shown.includes("crossing") ? (
            <g>
              {point(crossingX, crossingY)}
              <Cue id="crossing" cues={cues} at={[crossingX, crossingY]} />
              {reject(crossingX + 35, crossingY)}
            </g>
          ) : null}
          {step >= 4
            ? label(
                180,
                480,
                upper
                  ? "排除严格大于；得到不大于关系"
                  : "排除严格小于；得到不小于关系",
              )
            : null}
        </g>
      )}
    </g>
  );
}

function AdjacencyResult({ step }: { step: number }) {
  return (
    <g>
      {label(65, 40, "只保证交叉前的一小段已经相邻")}
      {line(100, 330, 680, 120, proofColors.U)}
      {line(100, 120, 680, 330, proofColors.V)}
      {label(65, 330, "U")}
      {label(65, 120, "V")}
      {step >= 2 ? (
        <g>
          <rect
            x={300}
            y={190}
            width={90}
            height={70}
            fill={colors.amber}
            opacity={0.12}
          />
          {point(390, 225)}
          {label(185, 390, "交点前的一小段：没有夹层")}
        </g>
      ) : null}
      {step >= 3 ? (
        <g>
          {arrow(220, 450, 480)}
          {label(500, 460, "还需检查规则")}
        </g>
      ) : null}
    </g>
  );
}

function Soundness({ step, cues }: { step: number; cues: DiagramCueState }) {
  return (
    <g>
      {label(65, 40, "范围检查与输入对身份")}
      {line(80, 250, 310, 100, proofColors.U)}
      {line(80, 100, 310, 250, proofColors.V)}
      {point(195, 175)}
      {label(70, 305, "线段内的真实交点")}
      {cues.shown.includes("extension") ? (
        <g>
          {line(470, 250, 560, 191.3, proofColors.U)}
          {line(560, 191.3, 700, 100, proofColors.U, true)}
          {line(470, 100, 700, 250, proofColors.V)}
          {reject(585, 175)}
          {label(465, 305, "仅延长线相交：排除")}
        </g>
      ) : null}
      {step >= 2 ? (
        <g>
          {arrow(180, 355, 365)}
          {label(400, 365, "发现 → 登记 → 报告")}
        </g>
      ) : null}
      {cues.shown.includes("unique")
        ? label(70, 420, "同一交叉只留一份记录")
        : null}
      {step >= 3 ? (
        <g>
          {label(465, 420, "(U,V)")}
          {cues.shown.includes("pair")
            ? label(465, 480, "(V,U)：同一输入对")
            : null}
        </g>
      ) : null}
      {step >= 4 ? label(70, 480, "每对至多一个交点") : null}
    </g>
  );
}

function LocalWork({ step, cues }: { step: number; cues: DiagramCueState }) {
  return (
    <g>
      {label(65, 40, "只标出变化后需要检查的新邻接")}
      {(["start", "end", "swap"] as const).map((kind, i) =>
        cues.shown.includes(kind) ? (
          <g key={kind}>
            {label(95 + i * 245, 110, ["开始", "结束", "交叉"][i])}
            <NeighborOrder
              items={
                [
                  ["L", "U", "H"],
                  ["L", "H"],
                  ["L", "V", "U", "H"],
                ][i]
              }
              x={70 + i * 245}
              y={340}
              spacing={55}
              width={95}
            />
            {(i === 0 ? [0, 1] : i === 1 ? [0] : [0, 2]).map((pair) => (
              <g key={pair}>
                {line(
                  215 + i * 245,
                  335 - pair * 55,
                  215 + i * 245,
                  290 - pair * 55,
                  colors.amber,
                  false,
                  4,
                )}
              </g>
            ))}
            {label(70 + i * 245, 410, ["最多两对", "最多一对", "最多两对"][i])}
            <Cue id={kind} cues={cues} at={[215 + i * 245, 310]} />
          </g>
        ) : null,
      )}
      {step >= 3 ? label(100, 480, "无事件：成员、顺序与邻接均不更新") : null}
    </g>
  );
}

function CostBoundary({ step }: { step: number }) {
  return (
    <g>
      {label(65, 40, "局部检查少，不代表总工作量固定")}
      {label(70, 105, "同一对输入")}
      {arrow(260, 95, 350)}
      {label(385, 105, "相邻 → 分开 → 再相邻")}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          {line(120 + i * 230, 180, 230 + i * 230, 180, proofColors.U)}
          {line(120 + i * 230, 260, 230 + i * 230, 260, proofColors.V)}
          {i === 1
            ? line(350, 220, 460, 220, proofColors.W)
            : line(250 + i * 230, 180, 250 + i * 230, 260, colors.amber)}
        </g>
      ))}
      {step >= 2 ? (
        <g>
          {label(70, 340, "交点增多")}
          {arrow(260, 330, 350)}
          {label(385, 340, "必须输出的结果增多")}
        </g>
      ) : null}
      {step >= 3 ? (
        <g>
          {label(70, 420, "活动顺序维护")}
          {label(400, 420, "待处理清单维护")}
          {label(165, 485, "两者也有代价；这里不推导总复杂度")}
        </g>
      ) : null}
    </g>
  );
}

function PriorEvents({ step }: { step: number }) {
  return (
    <g>
      {label(65, 40, "最早漏点左侧的正确处理范围")}
      <Axis y={330} />
      {point(660, 330, colors.violet)}
      {label(635, 385, "p_*")}
      {[150, 310, 480].map((x) => (
        <g key={x}>
          {line(x, 320, x, 340)}
          {step >= 2 ? point(x, 330) : null}
        </g>
      ))}
      {label(70, 120, "端点：一开始已全部登记")}
      {step >= 2 ? label(70, 185, "左侧交点：由最早性保证未漏") : null}
      {step >= 3 ? (
        <g>
          {arrow(150, 260, 620)}
          {label(190, 235, "插入、移去、换序")}
        </g>
      ) : null}
      {step >= 4 ? label(110, 465, "只证明左侧，不假设这个漏点已处理") : null}
    </g>
  );
}

function ProofChain({
  page,
  step,
  cues,
}: {
  page: string;
  step: number;
  cues: DiagramCueState;
}) {
  const names = ["height", "stable", "adjacent", "check", "contradiction"];
  const labels = [
    "高度差",
    "无事件不换序",
    "交叉前相邻",
    "新邻接检查",
    "排除最早漏点",
  ];
  return (
    <g>
      {label(
        65,
        40,
        page === "opening" ? "本集要走通的证明关系" : "已经走通的证明关系",
      )}
      {names.map((id, i) =>
        cues.shown.includes(id) ? (
          <g key={id}>
            <rect
              x={100 + (i % 2) * 360}
              y={80 + Math.floor(i / 2) * 135}
              width={260}
              height={70}
              rx={10}
              fill="none"
              stroke={grey}
              strokeWidth={2}
            />
            {label(
              120 + (i % 2) * 360,
              125 + Math.floor(i / 2) * 135,
              labels[i],
            )}
            {i % 2 === 1
              ? arrow(365, 115 + Math.floor(i / 2) * 135, 450)
              : null}
            {i > 0 && i % 2 === 0 ? (
              <path
                d={`M590 ${15 + Math.floor(i / 2) * 135} v25 H230 v30 l-6 -12 m6 12 l6 -12`}
                fill="none"
                stroke={grey}
                strokeWidth={2}
              />
            ) : null}
            <Cue
              id={id}
              cues={cues}
              at={[100 + (i % 2) * 360, 115 + Math.floor(i / 2) * 135]}
            />
          </g>
        ) : null,
      )}
      {page === "opening" && step === 1
        ? label(130, 250, "具体案例成功 → 所有允许输入都成立？")
        : null}
      {page === "closing" && step >= 4
        ? label(385, 470, "下一章：精确实现这些判断")
        : null}
    </g>
  );
}

function EventKinds({ step }: { step: number }) {
  return (
    <g>
      {label(65, 40, "邻接只能在事件处改变")}
      {label(65, 115, "最初为空")}
      {arrow(230, 105, 350)}
      {label(390, 115, "没有邻接")}
      {step >= 2 ? (
        <g>
          {line(100, 200, 680, 200, proofColors.U)}
          {line(100, 250, 680, 250, proofColors.V)}
          {label(200, 305, "无事件时：成员和顺序不变")}
        </g>
      ) : null}
      {step >= 3 ? (
        <g>
          {line(100, 395, 235, 395, proofColors.U)}
          {point(100, 395, proofColors.U)}
          {label(110, 460, "开始")}
          {line(330, 395, 465, 395, proofColors.U)}
          {point(465, 395, proofColors.U)}
          {label(350, 460, "结束")}
          {line(570, 370, 705, 420, proofColors.U)}
          {line(570, 420, 705, 370, proofColors.V)}
          {point(637.5, 395)}
          {label(590, 460, "交叉")}
        </g>
      ) : null}
    </g>
  );
}

function CheckPremise({ step }: { step: number }) {
  return (
    <g>
      {label(65, 40, "前提必须跟着结论一起使用")}
      <rect
        x={100}
        y={100}
        width={580}
        height={80}
        rx={10}
        fill="none"
        stroke={colors.amber}
        strokeWidth={3}
      />
      {label(190, 150, "此前事件已正确处理")}
      {arrow(100, 260, 280)}
      {label(320, 270, "新邻居形成时接受检查")}
      {step >= 2 ? (
        <g>
          {reject(120, 355)}
          {label(170, 365, "不能先假定所有交点已处理")}
        </g>
      ) : null}
      {step >= 3 ? (
        <g>
          {arrow(100, 440, 280)}
          {label(320, 450, "只借助最早漏点左侧")}
        </g>
      ) : null}
    </g>
  );
}

function NoMissing({ step, cues }: { step: number; cues: DiagramCueState }) {
  const cueIds = ["check", "valid", "registered", "kept", "taken", "reported"];
  const items = [
    "检查",
    "合法未来点",
    "登记或已有",
    "保留",
    "按位置取出",
    "报告",
  ];
  return (
    <g>
      {label(65, 40, "沿同一条记录追踪到报告")}
      {items.map((text, i) =>
        cues.shown.includes(cueIds[i]) ? (
          <g key={text}>
            <rect
              x={70 + (i % 3) * 245}
              y={130 + Math.floor(i / 3) * 170}
              width={200}
              height={70}
              rx={10}
              fill="none"
              stroke={i === 5 ? colors.violet : grey}
              strokeWidth={2}
            />
            {label(85 + (i % 3) * 245, 175 + Math.floor(i / 3) * 170, text)}
            {i % 3 > 0
              ? arrow(
                  30 + (i % 3) * 245,
                  165 + Math.floor(i / 3) * 170,
                  65 + (i % 3) * 245,
                )
              : null}
          </g>
        ) : null,
      )}
      {cues.shown.includes("kept") ? (
        <path
          d="M660 200 v45 H170 v55 l-6 -12 m6 12 l6 -12"
          fill="none"
          stroke={grey}
          strokeWidth={2}
        />
      ) : null}
      {step >= 3 ? (
        <g>
          {reject(100, 450)}
          {label(145, 460, "必然报告，与最早漏点假设矛盾")}
        </g>
      ) : null}
    </g>
  );
}
