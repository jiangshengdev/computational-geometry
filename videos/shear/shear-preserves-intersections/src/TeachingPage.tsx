import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { Subtitles } from "../../../shared/ui/Subtitles";
import { MathText, Latex, colorMath } from "./MathText";
import { pages, type Shot } from "./storyboard";
import { SegmentDiagram } from "./SegmentDiagram";
import { IntersectionDiagram } from "./IntersectionDiagram";
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
  visibleStep,
  caption,
  progress = 1,
}: {
  shot: Shot;
  visibleStep: number;
  caption: string;
  progress?: number;
}) {
  const page = pages[shot.page];
  const hasDiagram = Boolean(
    page.diagram || page.referenceDiagram || page.proofDiagram,
  );
  return (
    <div
      data-production-page
      data-shot={shot.id}
      style={{
        position: "absolute",
        inset: 0,
        background: "#f6f8fb",
        color: "#172c45",
        fontFamily: '"PingFang SC",sans-serif',
      }}
    >
      <header
        data-page-block
        style={{
          position: "absolute",
          top: 40,
          left: 100,
          fontSize: 48,
          fontWeight: 600,
        }}
      >
        <MathText>{page.title}</MathText>
      </header>
      {hasDiagram && (!page.proofDiagram || visibleStep >= 1) && (
        <div
          data-page-block
          style={{ position: "absolute", left: 100, top: 230 }}
        >
          {page.proofDiagram ? (
            <IntersectionDiagram
              mode={page.proofDiagram}
              step={shot.step}
              progress={progress}
            />
          ) : (
            <SegmentDiagram
              symbolic={
                Boolean(page.referenceDiagram) || page.diagram === "similar"
              }
              step={
                page.referenceDiagram || shot.page === "changes"
                  ? 3
                  : visibleStep
              }
            />
          )}
        </div>
      )}
      {page.basis.length > 0 && (
        <aside
          data-page-block
          data-basis
          style={{
            position: "absolute",
            left: hasDiagram ? 770 : 100,
            right: 100,
            top: 125,
            fontSize: 30,
            padding: "16px 26px",
            borderLeft: "4px solid #a4b3c4",
            background: "#edf1f6",
          }}
        >
          <div style={{ fontSize: 24, color: "#526579", marginBottom: 8 }}>
            已讲依据 · 本页继续使用
          </div>
          {page.basis.map((basis, i) => (
            <div data-basis-from={basis.from} key={i} style={{ minHeight: 44 }}>
              <Latex colorize={false}>{basis.math}</Latex>
            </div>
          ))}
        </aside>
      )}
      <main
        data-main-content
        style={{
          position: "absolute",
          left: hasDiagram ? 770 : 100,
          right: 100,
          top: page.basis.length ? 220 + 44 * page.basis.length : 230,
          bottom: 190,
          display: "flex",
          gap: 50,
          alignItems: "flex-start",
        }}
      >
        <div
          data-main-column
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: hasDiagram ? "flex-start" : "center",
            justifyContent: hasDiagram ? "flex-start" : "center",
          }}
        >
          {shot.page === "similar" && (
            <div
              data-line-ink
              style={{
                fontSize: 32,
                marginBottom: 24,
                visibility: visibleStep >= 1 ? "visible" : "hidden",
              }}
            >
              <MathText>非水平且非竖直，P 是内部点</MathText>
            </div>
          )}
          <MathLines pageId={shot.page} visibleStep={visibleStep} />
        </div>
      </main>
      <Subtitles pageBlock>
        <span data-caption-ink>
          <MathText colorize={false}>{caption}</MathText>
        </span>
      </Subtitles>
    </div>
  );
}
