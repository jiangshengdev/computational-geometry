import {
  CoordinateDiagram,
  type DiagramSegment,
} from "../../../shared/ui/CoordinateDiagram";
import { MathText, Latex, SvgMathText } from "./MathText";
import type { TeachingFocus } from "../../../shared/speech/teaching-cues";
const colors = ["#2563a6", "#8a4e9f", "#b45309", "#23765a"];
export function LessonDiagram({
  kind,
  step,
  page,
  activeInputs,
  focus,
}: {
  kind: string;
  step: number;
  page: string;
  activeInputs: number[];
  focus?: TeachingFocus;
}) {
  if (!step) return null;
  const selectStyle = (key: string) => ({
    outline:
      focus?.active && focus.keys?.includes(key)
        ? "3px solid #b45309"
        : undefined,
    outlineOffset: 3,
    background:
      focus?.active && focus.keys?.includes(key) ? "#fff4e8" : undefined,
  });
  if (["inputs", "enumerate", "six", "output"].includes(kind)) {
    const count =
      kind === "output" ? 3 : page === "opening" && step < 2 ? 2 : 4;
    const plot = (segments: DiagramSegment[], panel = "inputs") => (
      <CoordinateDiagram
        segments={segments}
        active={kind === "output" ? -1 : activeInputs}
        attention={
          focus?.active && focus.panels?.[panel]
            ? { marks: focus.panels[panel], progress: focus.progress }
            : undefined
        }
        xAxisEnd={kind === "output" ? undefined : 170}
        labels={segments.map((s, i) => ({
          point: kind === "output" ? s.end : ([4.8, i] as [number, number]),
          text: kind === "output" ? "(4,0)" : `输入 ${i + 1}: y=${i}`,
          above: false,
          // Align the label's visual center with its horizontal input.
          offsetY: kind === "output" ? undefined : 7.2,
        }))}
        label={(x, y, text) => (
          <SvgMathText x={x} y={y} align="center" fontSize={20}>
            {text}
          </SvgMathText>
        )}
      />
    );
    return (
      <div style={{ textAlign: "center" }}>
        {kind === "output" ? (
          <>
            <div style={{ fontSize: 26 }}>同尺度分栏，位置完全相同</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "360px 360px",
                gap: 12,
                justifyContent: "center",
              }}
            >
              {colors.slice(0, 3).map((color, i) => (
                <div
                  key={color}
                  style={{
                    gridColumn: i === 2 ? "1 / -1" : undefined,
                    justifySelf: "center",
                    ...selectStyle(`output${i + 1}`),
                  }}
                >
                  <div style={{ fontSize: 26 }}>
                    <MathText>{`输入 ${i + 1}`}</MathText>
                  </div>
                  {plot(
                    [{ start: [0, 0], end: [4, 0], color }],
                    `output${i + 1}`,
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div
            style={{ scale: 1.4, transformOrigin: "center", margin: "55px 0" }}
          >
            {plot(
              Array.from({ length: count }, (_, i) => ({
                start: [0, i] as [number, number],
                end: [2, i] as [number, number],
                color: colors[i],
              })),
            )}
          </div>
        )}
        {kind === "enumerate" && (
          <div
            style={{
              fontSize: 28,
              lineHeight: 2,
              display: "flex",
              justifyContent: "center",
              gap: 28,
            }}
          >
            {(step === 1
              ? ["1 与 2"]
              : step === 2
                ? ["1 与 2", "1 与 3", "1 与 4"]
                : step === 3
                  ? ["2 与 3", "2 与 4"]
                  : ["3 与 4"]
            ).map((pair) => (
              <span key={pair} style={selectStyle(pair)}>
                <MathText>{pair}</MathText>
              </span>
            ))}
          </div>
        )}
        {kind === "six" && (
          <div style={{ fontSize: 30, lineHeight: 1.8 }}>
            <span style={selectStyle("row-counts")}>
              <MathText>{"3+2+1+0"}</MathText>
            </span>
            <span> = </span>
            <span style={selectStyle("checks")}>
              <MathText>{"6"}</MathText> 次检查
            </span>
            {step >= 2 && (
              <div style={selectStyle("empty")}>
                <MathText>
                  {step < 4 ? "每次比较的两个高度不同，交集为空" : "结果 0 条"}
                </MathText>
              </div>
            )}
          </div>
        )}
        {kind === "output" && step >= 2 && (
          <div style={{ fontSize: 36, ...selectStyle("output-count") }}>
            <Latex>{"\\frac{n(n-1)}2"}</Latex>
            <span> 条结果，逐条输出</span>
          </div>
        )}
      </div>
    );
  }
  if (kind === "proof")
    return page === "complete" && step === 1 ? null : (
      <div style={{ fontSize: 38, lineHeight: 2.8, textAlign: "center" }}>
        <div>
          <span style={selectStyle("i")}>
            <Latex>{"i"}</Latex>
          </span>
          <Latex>{"<"}</Latex>
          <span style={selectStyle("j")}>
            <Latex>{"j"}</Latex>
          </span>
        </div>
        <div
          style={{
            visibility: page === "complete" && step < 3 ? "hidden" : "visible",
            ...selectStyle("row-i"),
          }}
        >
          <MathText>{"第 i 行 → "}</MathText>
          <span style={selectStyle("j-entry")}>
            <Latex>{"j"}</Latex>
          </span>
        </div>
        {page === "unique" && (
          <div style={selectStyle("row-j")}>
            <MathText>{"第 j 行 → 只找大于 j 的编号"}</MathText>
          </div>
        )}
        {page === "unique" && step >= 3 && (
          <div style={selectStyle("self")}>
            <MathText>{"i 与 i：排除"}</MathText>
          </div>
        )}
      </div>
    );
  if (kind === "small")
    return (
      <div style={{ fontSize: 38, lineHeight: 2.5, textAlign: "center" }}>
        <span style={selectStyle("zero")}>
          <MathText>{"n=0：没有输入"}</MathText>
        </span>
        <br />
        <span style={selectStyle("one")}>
          <MathText>{"n=1：只有一份输入"}</MathText>
        </span>
        {step >= 2 && (
          <>
            <div style={selectStyle("zero-formula")}>
              <Latex>{"\\frac{0(0-1)}2=0"}</Latex>
            </div>
            <div style={selectStyle("one-formula")}>
              <Latex>{"\\frac{1(1-1)}2=0"}</Latex>
            </div>
          </>
        )}
      </div>
    );
  if (kind === "growth")
    return (
      <div style={{ fontSize: 40, lineHeight: 2.8, textAlign: "center" }}>
        <div style={selectStyle("ten")}>
          <Latex>{"\\frac{10\\times9}2=45"}</Latex>
        </div>
        <div
          style={{
            visibility: step >= 2 ? "visible" : "hidden",
            ...selectStyle("hundred"),
          }}
        >
          <Latex>{"\\frac{100\\times99}2=4950"}</Latex>
        </div>
        {step >= 3 && (
          <div style={selectStyle("thousand")}>
            <Latex>{"\\frac{1000\\times999}2=499500"}</Latex>
          </div>
        )}
      </div>
    );
  return null;
}
