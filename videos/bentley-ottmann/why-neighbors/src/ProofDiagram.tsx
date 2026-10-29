import { SvgMathText } from "./MathText";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import type { TeachingFocus } from "../../../shared/speech/teaching-cues";
const blue = "#2878a0";
const red = "#c25959";
const green = "#278878";
const muted = "#8999aa";
const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = muted,
  dashed = false,
) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={color}
    strokeWidth={3}
    strokeDasharray={dashed ? "8 8" : undefined}
  />
);
const label = (x: number, y: number, value: string, color = "#172c45") => (
  <SvgMathText x={x} y={y} fill={color} fontSize={29}>
    {value}
  </SvgMathText>
);
function Axis({ y = 510 }: { y?: number }) {
  return (
    <g>
      {line(65, y, 710, y)}
      <path d={"M 710 " + y + " l -15 -7 v 14 z"} fill={muted} />
    </g>
  );
}

/** Geometry is an illustration of the stated hypothesis, never an execution trace. */
export function ProofDiagram({
  page,
  step,
  focus,
}: {
  page: string;
  step: number;
  focus?: TeachingFocus;
}) {
  const isAdjacent = ["choose", "between", "squeeze", "adjacent"].includes(
    page,
  );
  const isDifference = ["difference", "linear"].includes(page);
  const isPosition = ["position", "noEvents"].includes(page);
  const showW = page === "between" || page === "squeeze";
  const triple = page === "squeeze" && step >= 3;
  const marks = focus?.active ? (focus.panels?.proof ?? []) : [];
  if (step === 0 || (page === "earliest" && step < 2))
    return <svg width={800} height={620} data-proof-diagram />;
  const travel =
    page === "noEvents"
      ? 0.65
      : focus?.name === "travel"
        ? focus.progress * 0.65
        : focus?.reached.includes("travel")
          ? 0.65
          : 0;
  return (
    <svg width={800} height={620} viewBox="0 0 800 620" data-proof-diagram>
      {isAdjacent || isDifference ? (
        <g>
          {line(100, 440, 650, 165, blue)}
          {line(100, 140, 650, 415, red)}
          {isAdjacent ? (
            <>
              {label(80, 475, "U", blue)}
              {label(80, 130, "V", red)}
              <Axis />
              {line(400, 290, 400, 510, muted, true)}
              {label(400, 555, "p")}
              <circle cx={400} cy={290} r={5} fill="#172c45" />
              {page !== "choose" || step >= 3 ? (
                <>
                  <rect
                    x={280}
                    y={190}
                    width={120}
                    height={300}
                    fill="#b45309"
                    opacity={0.04}
                  />
                  {line(280, 190, 280, 510, muted, true)}
                  {label(270, 555, "u")}
                  {label(240, 600, "中间没有其他事件")}
                </>
              ) : null}
              {showW ? (
                <g data-hypothetical-w>
                  {line(150, 290, triple ? 470 : 365, 290, green)}
                  {label(110, 280, "W", green)}
                  {!triple ? (
                    <>
                      {line(365, 290, 390, 290, green, true)}
                      {label(460, 85, "假设夹在中间")}
                    </>
                  ) : (
                    label(440, 85, step >= 4 ? "推出三线共点" : "两端高度相等")
                  )}
                </g>
              ) : null}
            </>
          ) : (
            <>
              {line(240, 210, 240, 370, "#b45309")}
              {line(550, 215, 550, 365, "#b45309")}
              {label(145, 100, "左侧高度关系")}
              {label(465, 100, "右侧高度关系")}
              {page === "linear" && step >= 3
                ? label(260, 555, "高度差 d(x)")
                : null}
            </>
          )}
        </g>
      ) : null}
      {isPosition ? (
        <g>
          <Axis y={390} />
          {line(160, 380, 160, 400)}
          {line(620, 380, 620, 400)}
          {label(145, 445, "u")}
          {label(605, 445, "v")}
          {label(85, 240, "d(u)>0", blue)}
          {label(540, 240, "d(v)<0", red)}
          {step >= 2 || page === "noEvents" ? (
            <>
              <line
                x1={160}
                y1={390}
                x2={160 + 460 * travel}
                y2={390}
                stroke="#b45309"
                strokeWidth={7}
              />
              <circle cx={160 + 460 * travel} cy={390} r={7} fill="#b45309" />
              {step >= 3 || page === "noEvents"
                ? label(
                    255,
                    335,
                    page === "noEvents" ? "高度差等于零的位置" : "u+t(v-u)",
                  )
                : null}
              {step >= 3 || page === "noEvents"
                ? label(
                    255,
                    550,
                    page === "noEvents" ? "两条线段在中间相交" : "0<t<1",
                  )
                : null}
            </>
          ) : null}
        </g>
      ) : null}
      {page === "newNeighbors" ? (
        <NeighborChanges step={step} focus={focus} />
      ) : null}
      {["earliest", "earlier", "contradiction"].includes(page) ? (
        <g>
          <Axis y={360} />
          <circle cx={530} cy={360} r={7} fill={red} />
          {label(520, 410, "p", red)}
          {label(425, 465, "假设最早漏掉的位置")}
          {page === "contradiction" || (page === "earlier" && step >= 2) ? (
            <>
              <path d="M 100 358 L 510 358" stroke={green} strokeWidth={5} />
              {label(85, 250, "此前事件已正确处理", green)}
            </>
          ) : null}
          {(page === "earlier" && step >= 3) || page === "contradiction" ? (
            <>
              <circle cx={260} cy={360} r={7} fill={blue} />
              {label(150, 320, "形成邻接并检查", blue)}
            </>
          ) : null}
          {page === "contradiction" ? (
            <>
              {step >= 2 ? label(330, 110, "登记并保留 p") : null}
              {step >= 3 ? (
                <>
                  {line(270, 150, 525, 150, "#b45309")}
                  <path d="M525 150 l-14 -7 v14 z" fill="#b45309" />
                  {label(285, 210, "按位置取出")}
                </>
              ) : null}
              {step >= 4 ? label(170, 555, "与漏掉 p 矛盾") : null}
            </>
          ) : null}
        </g>
      ) : null}
      <AttentionMarks marks={marks} progress={focus?.progress ?? 0} />
    </svg>
  );
}

function NeighborChanges({
  step,
  focus,
}: {
  step: number;
  focus?: TeachingFocus;
}) {
  const row = (kind: number, y: number, title: string) => {
    const visible = step >= kind;
    const changed =
      step > kind ||
      focus?.reached.includes(["", "insert", "remove", "swap"][kind]);
    const before = kind === 1 ? [0, 2] : kind === 2 ? [0, 1, 2] : [0, 1, 2, 3];
    const after = kind === 1 ? [0, 1, 2] : kind === 2 ? [0, 2] : [0, 2, 1, 3];
    const colors = [muted, blue, red, green];
    const draw = (values: number[], x: number, emphasize: boolean) =>
      values.map((value, index) => {
        const yy = y + 110 - index * 28;
        return (
          <g key={value}>
            {line(x, yy, x + 115, yy, colors[value])}
            {emphasize &&
            index < values.length - 1 &&
            !(kind === 3 && index === 1) ? (
              <line
                x1={x + 130}
                y1={yy - 3}
                x2={x + 130}
                y2={yy - 25}
                stroke="#b45309"
                strokeWidth={6}
              />
            ) : null}
          </g>
        );
      });
    return (
      <g key={kind} visibility={visible ? "visible" : "hidden"}>
        {label(10, y + 60, title)}
        {kind !== 1 || changed ? draw(before, 190, false) : null}
        {line(360, y + 70, 425, y + 70)}
        <path d={"M425 " + (y + 70) + " l-12 -6 v12 z"} fill={muted} />
        {kind !== 1 || changed
          ? draw(changed ? after : before, 490, Boolean(changed))
          : null}
      </g>
    );
  };
  return (
    <g>
      {label(190, 45, "处理前")}
      {label(490, 45, "处理后")}
      {row(1, 70, "开始")}
      {row(2, 240, "结束")}
      {row(3, 410, "交叉")}
    </g>
  );
}
