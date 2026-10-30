import { inputColors } from "../../colors.ts";
import {
  CoordinateDiagram,
  type DiagramSegment,
} from "../../../shared/ui/CoordinateDiagram";
import { MathText, SvgMathText } from "./MathText";
import { InputDiagram } from "./InputDiagram";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import type { TeachingFocus } from "../../../shared/speech/teaching-cues";

const firstInput = inputColors[0],
  secondInput = inputColors[1],
  resultColor = inputColors[2];
const segment = (
  a: [number, number],
  b: [number, number],
  color = firstInput,
  pointInput = false,
): DiagramSegment => ({ start: a, end: b, color, pointInput });
const base = segment([0, 0], [4, 0]);
function Plot({
  title,
  segments,
  labels = [],
  focus,
}: {
  title: string;
  segments: DiagramSegment[];
  labels?: { point: [number, number]; text: string; above?: boolean }[];
  focus?: TeachingFocus;
}) {
  return (
    <div
      data-focus-panel={title}
      style={{
        width: 380,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 26 }}>
        <MathText>{title}</MathText>
      </div>
      <CoordinateDiagram
        segments={segments}
        labels={labels}
        attention={
          focus?.active && focus.panels?.[title]
            ? { marks: focus.panels[title], progress: focus.progress }
            : undefined
        }
        label={(x, y, text) => (
          <SvgMathText x={x} y={y} align="center" fontSize={20}>
            {text}
          </SvgMathText>
        )}
      />
    </div>
  );
}
export function LessonDiagram({
  kind,
  step,
  focus,
}: {
  kind: string;
  step: number;
  focus?: TeachingFocus;
}) {
  if (!kind || !step) return null;
  const attention = (panel: string) =>
    focus?.active && focus.panels?.[panel]
      ? { marks: focus.panels[panel], progress: focus.progress }
      : undefined;
  const plot = (
    title: string,
    segments: DiagramSegment[],
    labels: { point: [number, number]; text: string; above?: boolean }[] = [],
  ) => <Plot title={title} segments={segments} labels={labels} focus={focus} />;
  if (kind === "points" && step >= 3)
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {plot(
          "同点：两份输入都只有 (2,0)",
          [segment([2, 0], [2, 0], secondInput, true)],
          [{ point: [2, 0], text: "(2,0)" }],
        )}
        {plot(
          "完整交集：点 (2,0)",
          [segment([2, 0], [2, 0], resultColor)],
          [{ point: [2, 0], text: "(2,0)" }],
        )}
        {plot(
          "异点：(2,0) 与 (5,0)",
          [
            segment([2, 0], [2, 0], firstInput, true),
            segment([5, 0], [5, 0], secondInput, true),
          ],
          [
            { point: [2, 0], text: "(2,0)" },
            { point: [5, 0], text: "(5,0)" },
          ],
        )}
        {plot("完整交集：空", [])}
      </div>
    );
  let children;
  if (kind === "closed")
    children = (
      <>
        {plot(
          "闭线段",
          [
            base,
            ...(step >= 2
              ? [
                  { ...segment([4, 0], [5, 0], "#94a3b8"), dashed: true },
                  segment([5, 0], [5, 0], resultColor),
                ]
              : []),
          ],
          [
            { point: [0, 0], text: "(0,0)" },
            { point: [4, 0], text: "(4,0)", above: true },
          ],
        )}
        {step >= 3 &&
          plot(
            "点输入",
            [segment([2, 0], [2, 0], secondInput, true)],
            [{ point: [2, 0], text: "(2,0)" }],
          )}
      </>
    );
  else if (["identity", "repeated"].includes(kind))
    children = (
      <>
        {[1, 2, 3]
          .filter((i) => i < 3 || kind === "repeated" || step >= 2)
          .map((i) => (
            <div key={i}>
              {plot(
                `输入 ${i}`,
                [
                  segment(
                    i === 3 ? [4, 0] : [0, 0],
                    i === 3 ? [0, 0] : [4, 0],
                    [firstInput, secondInput, resultColor][i - 1],
                  ),
                ],
                [
                  { point: [0, 0], text: "(0,0)" },
                  { point: [4, 0], text: "(4,0)" },
                ],
              )}
            </div>
          ))}
        {kind === "repeated" &&
          step >= 2 &&
          plot(
            "每对的完整交集",
            [segment([0, 0], [4, 0], resultColor)],
            [
              { point: [0, 0], text: "(0,0)" },
              { point: [4, 0], text: "(4,0)" },
            ],
          )}
      </>
    );
  else if (kind === "answer")
    children = (
      <>
        {[1, 2, 3, 4].map((input) => (
          <div
            key={input}
            style={{
              width: 380,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 26 }}>
              <MathText>
                {input === 4 ? "同一坐标系" : `输入 ${input}`}
              </MathText>
            </div>
            <InputDiagram
              inputs={input === 4 ? [1, 2, 3] : [input]}
              size={300}
              attention={attention(
                input === 4 ? "同一坐标系" : `输入 ${input}`,
              )}
            />
          </div>
        ))}
      </>
    );
  else if (kind === "records")
    children = (
      <div style={{ margin: "0 auto", textAlign: "center" }}>
        <InputDiagram inputs={[1, 2, 3]} attention={attention("records")} />
      </div>
    );
  else if (kind === "third")
    children = (
      <>
        {plot(
          "输入 A 与新输入 C",
          [base, segment([3, -1], [3, 1], resultColor)],
          [
            { point: [0, 0], text: "(0,0)" },
            { point: [4, 0], text: "(4,0)" },
            { point: [3, -1], text: "(3,-1)" },
            { point: [3, 1], text: "(3,1)", above: true },
          ],
        )}
        {plot(
          "输入 B 与新输入 C",
          [
            segment([2, 0], [6, 0], secondInput),
            segment([3, -1], [3, 1], resultColor),
          ],
          [
            { point: [2, 0], text: "(2,0)" },
            { point: [6, 0], text: "(6,0)" },
            { point: [3, -1], text: "(3,-1)" },
            { point: [3, 1], text: "(3,1)", above: true },
          ],
        )}
        {step >= 2 && (
          <>
            {plot(
              "A 与 B：完整区间保持连续",
              [segment([2, 0], [4, 0], resultColor)],
              [
                { point: [2, 0], text: "(2,0)" },
                { point: [4, 0], text: "(4,0)", above: true },
              ],
            )}
            <div>
              {plot(
                "另外两对：各自留下点结果",
                [segment([3, 0], [3, 0], resultColor)],
                [{ point: [3, 0], text: "(3,0)" }],
              )}
            </div>
          </>
        )}
      </>
    );
  else if (
    ["empty", "crossing", "touching", "points", "overlap"].includes(kind)
  ) {
    const other =
      kind === "empty"
        ? segment([0, 1], [4, 1], secondInput)
        : kind === "crossing"
          ? segment([2, -1], [2, 1], secondInput)
          : kind === "touching"
            ? segment([4, 0], [6, 0], secondInput)
            : kind === "points"
              ? segment(
                  [step === 1 ? 2 : 5, 0],
                  [step === 1 ? 2 : 5, 0],
                  secondInput,
                  true,
                )
              : segment([2, 0], [6, 0], secondInput);
    const showOther = kind !== "empty" || step >= 2;
    const showResult =
      kind === "empty"
        ? step >= 2
        : kind === "crossing"
          ? step >= 3
          : kind === "touching"
            ? step >= 2
            : kind === "overlap"
              ? step >= 3
              : true;
    const empty = kind === "empty" || (kind === "points" && step === 2);
    const result =
      kind === "overlap"
        ? segment([2, 0], [4, 0], resultColor)
        : segment(
            [kind === "touching" ? 4 : 2, 0],
            [kind === "touching" ? 4 : 2, 0],
            resultColor,
          );
    children = (
      <>
        {plot(
          "输入 A",
          [base],
          [
            { point: [0, 0], text: "(0,0)" },
            { point: [4, 0], text: "(4,0)" },
          ],
        )}
        {showOther &&
          plot(
            "另一份输入",
            [other],
            [
              {
                point: other.start,
                text: `(${other.start.join(",")})`,
                above: kind !== "crossing",
              },
              {
                point: other.end,
                text: `(${other.end.join(",")})`,
                above: kind === "crossing",
              },
            ],
          )}
        {showResult &&
          plot(
            empty ? "完整交集：空" : "完整交集",
            empty ? [] : [result],
            empty
              ? []
              : (kind === "overlap"
                  ? [result.start, result.end]
                  : [result.start]
                ).map((point) => ({ point, text: `(${point.join(",")})` })),
          )}
      </>
    );
  } else if (kind === "common")
    children =
      step < 3
        ? plot(
            step === 1 ? "点输入" : "先讨论公共点的数量",
            step === 1 ? [segment([2, 0], [2, 0], resultColor, true)] : [base],
          )
        : plot(
            "不同公共点确定共同直线",
            [base, segment([1, 0], [6, 0], secondInput)],
            [
              { point: [2, 0], text: "P", above: true },
              { point: [3, 0], text: "Q" },
            ],
          );
  else if (kind === "order")
    children = (
      <>
        {plot(
          "非竖直：横坐标递增",
          [base, segment([1, 0], [6, 0], secondInput)],
          [
            { point: [2, 0], text: "P", above: true },
            { point: [3, 0], text: "Q" },
          ],
        )}
        {step >= 2 &&
          plot(
            "竖直：纵坐标递增",
            [segment([2, -1], [2, 3]), segment([2, 0], [2, 2], secondInput)],
            [
              { point: [2, 0.5], text: "P" },
              { point: [2, 1.5], text: "Q", above: true },
            ],
          )}
      </>
    );
  else if (["bounds", "converse"].includes(kind))
    children = (
      <div style={{ width: 760 }}>
        <svg width={760} height={430} viewBox="0 0 760 430">
          <path
            d="M60 355 H700 l-12 -8 M700 355 l-12 8"
            fill="none"
            stroke="#94a3b8"
            strokeWidth={2}
          />
          <SvgMathText x={330} y={405} align="center" fontSize={26}>
            坐标递增方向
          </SvgMathText>
          {[
            { y: 95, a: 100, b: 510, c: firstInput },
            { y: 215, a: 240, b: 650, c: secondInput },
          ].map(({ y, a, b, c }, i) => (
            <g key={i} stroke={c} fill={c}>
              <line x1={a} y1={y} x2={b} y2={y} strokeWidth={6} />
              <circle cx={a} cy={y} r={6} />
              <circle cx={b} cy={y} r={6} />
              <line
                x1={240}
                y1={y}
                x2={510}
                y2={y}
                strokeWidth={14}
                opacity={
                  kind === "bounds" &&
                  (step < 3 || !focus?.reached.includes("interval"))
                    ? 0
                    : 0.4
                }
              />
            </g>
          ))}
          {(kind === "converse" ||
            step > 1 ||
            focus?.reached.includes("L")) && (
            <>
              <line
                x1={240}
                y1={65}
                x2={240}
                y2={345}
                stroke={resultColor}
                strokeDasharray="5 5"
              />
              <SvgMathText x={240} y={50} align="center">
                L
              </SvgMathText>
            </>
          )}
          {(kind === "converse" ||
            step > 2 ||
            focus?.reached.includes("R")) && (
            <>
              <line
                x1={510}
                y1={65}
                x2={510}
                y2={345}
                stroke={resultColor}
                strokeDasharray="5 5"
              />
              <SvgMathText x={510} y={50} align="center">
                R
              </SvgMathText>
            </>
          )}
          {kind === "converse" && (
            <line
              x1={240}
              y1={300}
              x2={510}
              y2={300}
              stroke={resultColor}
              strokeWidth={7}
            />
          )}
          {attention("bounds") && <AttentionMarks {...attention("bounds")!} />}
        </svg>
        <div style={{ fontSize: 24, textAlign: "center" }}>
          一维坐标范围投影；分行只用于比较范围
        </div>
      </div>
    );
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}
