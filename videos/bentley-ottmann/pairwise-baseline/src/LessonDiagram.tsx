import {
  CoordinateDiagram,
  type DiagramSegment,
} from "../../../shared/ui/CoordinateDiagram";
import { MathText, SvgMathText } from "./MathText";
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
      </div>
    );
  }
  return null;
}
