import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { LessonPage } from "../../../shared/ui/LessonPage";
import { Subtitles } from "../../../shared/ui/Subtitles";
import type { TeachingFocus } from "../../../shared/speech/teaching-cues";
import { MathText, Latex, colorMath } from "./MathText";
import { pages, type Shot } from "./lesson";
import { ProofDiagram } from "./ProofDiagram";

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
  focus,
  diagramProgress = 1,
}: {
  shot: Shot;
  visibleStep: number;
  caption: string;
  focus?: TeachingFocus;
  diagramProgress?: number;
}) {
  const page = pages[shot.page];
  if (!page.lines.some((line) => line.math))
    return (
      <LessonPage
        title={<MathText>{page.title}</MathText>}
        lines={page.lines.map((line, index) => (
          <MathText key={index}>{line.text ?? ""}</MathText>
        ))}
        visibleStep={visibleStep}
        activeStep={visibleStep}
        diagramProgress={diagramProgress}
        diagram={
          page.diagram ? (
            <ProofDiagram page={shot.page} step={visibleStep} focus={focus} />
          ) : undefined
        }
        caption={<MathText>{caption}</MathText>}
      />
    );
  return (
    <div
      data-production-page
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
      {page.basis ? (
        <aside
          data-page-block
          style={{
            position: "absolute",
            top: 135,
            left: 100,
            padding: 20,
            background: "#edf1f6",
            fontSize: 30,
          }}
        >
          已讲依据：<Latex>{page.basis}</Latex>
        </aside>
      ) : null}
      <main
        data-main-content
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: page.basis ? 250 : 165,
          bottom: 150,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 65,
        }}
      >
        <section
          data-main-column
          style={{
            width: page.diagram ? 850 : "max-content",
            maxWidth: "100%",
          }}
        >
          <MathLines pageId={shot.page} visibleStep={visibleStep} />
        </section>
        {page.diagram ? (
          <section data-page-block style={{ width: 800, flexShrink: 0 }}>
            <ProofDiagram page={shot.page} step={visibleStep} focus={focus} />
          </section>
        ) : null}
      </main>
      <Subtitles pageBlock>
        <span data-caption-ink>
          <MathText>{caption}</MathText>
        </span>
      </Subtitles>
    </div>
  );
}
