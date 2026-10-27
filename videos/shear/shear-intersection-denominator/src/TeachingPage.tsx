import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { Subtitles } from "../../../shared/ui/Subtitles";
import { MathText, Latex, colorMath } from "./MathText";
import { Diagram } from "./Diagram";
import { pages, type Shot } from "./storyboard";
const MathLines = createTeachingMathLines({
  pages,
  MathText,
  Latex,
  colorMath,
  lineMarks: {},
  defaultMathColor: "#172c45",
  objectColors: { current: "#b45309" },
  pageRoles: Object.fromEntries(
    Object.keys(pages).map((id) => [id, "current" as const]),
  ),
});
export function TeachingPage({
  shot,
  caption,
  visibleStep,
}: {
  shot: Shot;
  caption: string;
  visibleStep: number;
}) {
  const page = pages[shot.page];
  return (
    <div
      data-production-page
      data-shot={shot.id}
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
        <MathText colorize={false}>{page.title}</MathText>
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
        <MathText colorize={false}>{page.mode}</MathText>
      </div>
      {page.panel ? (
        <aside
          data-page-block
          data-concept-panel
          style={{
            position: "absolute",
            left: 100,
            top: 220,
            width: 720,
            padding: 32,
            boxSizing: "border-box",
            borderLeft: "4px solid #dce4ec",
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontSize: 30, color: "#526579", marginBottom: 28 }}>
            <MathText colorize={false}>{page.panel.title}</MathText>
          </div>
          {page.panel.lines.map((line, index) => (
            <div
              key={index}
              data-panel-line
              style={{ fontSize: 36, marginBottom: 28 }}
            >
              <MathText colorize={false}>{line}</MathText>
            </div>
          ))}
        </aside>
      ) : (
        <div
          style={{
            position: "absolute",
            left: 20,
            top: 180,
            transform: "scale(1.05)",
            transformOrigin: "top left",
          }}
        >
          <Diagram page={shot.page} step={visibleStep} />
        </div>
      )}
      <div
        data-main-content
        style={{
          position: "absolute",
          left: 920,
          top: 220,
          width: 900,
          bottom: 200,
        }}
      >
        <MathLines pageId={shot.page} visibleStep={visibleStep} />
      </div>
      <div
        data-page-block
        data-teaching-note
        style={{
          position: "absolute",
          left: 920,
          right: 100,
          top: 900,
          fontSize: 28,
          color: "#526579",
          visibility: visibleStep === page.lines.length ? "visible" : "hidden",
        }}
      >
        <MathText colorize={false}>{page.note}</MathText>
      </div>
      <Subtitles pageBlock>
        <span data-caption-ink>
          <MathText colorize={false}>{caption}</MathText>
        </span>
      </Subtitles>
    </div>
  );
}
