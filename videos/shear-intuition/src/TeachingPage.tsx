import { Diagram } from "./Diagram";
import { Latex, MathText } from "./MathText";
import { pages, type Shot } from "./storyboard";
import { Subtitles } from "./Subtitles";

export const TeachingPage = ({
  shot,
  progress,
  thinking = false,
  caption = shot.caption,
  visibleStep = shot.step,
  comparison = [1, 1],
  walk = [1, 1],
}: {
  shot: Shot;
  progress: number;
  thinking?: boolean;
  caption?: string;
  visibleStep?: number;
  comparison?: [number, number];
  walk?: [number, number];
}) => {
  const page = pages[shot.page];
  const sideBySide = page.diagram === "comparison";
  return (
    <div
      data-production-page
      data-shot={shot.id}
      data-thinking={thinking}
      style={{
        position: "absolute",
        inset: 0,
        background: "#f6f8fb",
        color: "#172c45",
        fontFamily: '"PingFang SC", sans-serif',
      }}
    >
      <div
        data-page-block
        style={{
          position: "absolute",
          left: 100,
          top: 40,
          fontSize: 48,
          fontWeight: 600,
        }}
      >
        <MathText>{page.title}</MathText>
      </div>
      <div
        data-page-block
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: 125,
          fontSize: 30,
          color: "#526579",
          borderBottom: "2px solid #dce4ec",
          paddingBottom: 18,
        }}
      >
        <MathText>{page.mode}</MathText>
      </div>
      {sideBySide ? (
        <>
          {(["固定坐标轴：画出新点 P′", "固定 P：更换坐标系读数"] as const).map(
            (title, i) => (
              <div
                key={title}
                style={{
                  position: "absolute",
                  left: 100 + i * 870,
                  top: 200,
                  width: 830,
                }}
              >
                <div
                  data-page-block
                  style={{ fontSize: 32, textAlign: "center" }}
                >
                  <MathText>{title}</MathText>
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 40,
                    transform: "scale(0.9)",
                    transformOrigin: "top center",
                  }}
                >
                  <Diagram
                    kind={i === 0 ? "positive" : "coordinates"}
                    step={4}
                    progress={comparison[i]}
                  />
                </div>
                <div
                  data-page-block
                  style={{
                    position: "absolute",
                    top: 640,
                    width: 830,
                    textAlign: "center",
                    fontSize: 32,
                  }}
                >
                  <Latex>
                    {i === 0
                      ? "P=(2,2)\\;\\longrightarrow\\;P'=(3,2)"
                      : "[P]_{(x,y)}=(2,2),\\quad[P]_{(x',y')}=(3,2)"}
                  </Latex>
                </div>
              </div>
            ),
          )}
        </>
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 190,
              transform: "scale(1.1)",
              transformOrigin: "top left",
            }}
          >
            <Diagram
              kind={page.diagram}
              step={
                shot.diagramStep ??
                (shot.page === "inverse" || shot.page === "oblique"
                  ? 6
                  : shot.step)
              }
              progress={progress}
              walk={walk}
            />
          </div>
          <div
            data-main-content
            style={{
              position: "absolute",
              left: 920,
              top: 235,
              width: 900,
              height: 570,
            }}
          >
            {page.lines.map((line, index) => (
              <div
                key={index}
                data-content-line
                data-revealed={index < visibleStep}
                style={{
                  minHeight: page.rowHeight ?? 116,
                  display: "flex",
                  alignItems: "center",
                  visibility: index < visibleStep ? "visible" : "hidden",
                  color: index === visibleStep - 1 ? "#176ba0" : "#172c45",
                  fontSize: line.math ? 42 : 36,
                  whiteSpace: "nowrap",
                }}
              >
                <span data-line-ink>
                  {line.math ? (
                    <Latex>{line.math}</Latex>
                  ) : (
                    <MathText>{line.text ?? ""}</MathText>
                  )}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      <div
        data-page-block
        data-teaching-note
        style={{
          position: "absolute",
          left: sideBySide ? 100 : 920,
          right: 100,
          top: 895,
          fontSize: 28,
          color: "#526579",
          visibility:
            thinking || visibleStep >= (page.noteFromStep ?? 0)
              ? "visible"
              : "hidden",
        }}
      >
        <MathText>
          {thinking
            ? "请独立思考 · 答案将在 4 秒思考窗口结束后出现"
            : page.note}
        </MathText>
      </div>
      <Subtitles text={caption} />
    </div>
  );
};
