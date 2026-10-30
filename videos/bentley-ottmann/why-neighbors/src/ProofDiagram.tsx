import { colors, proofColors } from "../../colors.ts";
import { SvgMathText } from "./MathText";
import { pages } from "./lesson";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
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
}: {
  page: string;
  step: number;
  active: boolean;
  progress: number;
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
  const draw = (items: string[], x: number) =>
    items.map((name, index) => (
      <g key={name}>
        {line(
          x,
          355 - 65 * index,
          x + 130,
          355 - 65 * index,
          name === "U" ? proofColors.U : name === "V" ? proofColors.V : ink,
        )}
        {label(x + 150, 363 - 65 * index, name)}
      </g>
    ));
  return (
    <g>
      {label(100, 45, "局部顺序示意，从下到上")}
      {label(90, 95, "处理前")}
      {label(460, 95, "处理后")}
      {draw(before, 90)}
      {line(310, 250, 395, 250)}
      <path d="M395 250 l-15 -7.5 v15 z" fill={grey} />
      {changed ? draw(after, 460) : null}
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
