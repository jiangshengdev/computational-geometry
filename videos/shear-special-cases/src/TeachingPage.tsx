import { createTeachingMathLines } from "../../shared/ui/TeachingMathLines";
import { Subtitles } from "../../shared/ui/Subtitles";
import { MathText, Latex, colorMath } from "./MathText";
import { pages, type Shot } from "./storyboard";
import { SpecialDiagram } from "./SpecialDiagram";
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
  progress,
}: {
  shot: Shot;
  visibleStep: number;
  caption: string;
  progress: number;
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
        fontFamily: '"PingFang SC",sans-serif',
      }}
    >
      <header
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
      </header>
      <div
        data-page-block
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: 125,
          fontSize: 28,
          color: "#526579",
          borderBottom: "2px solid #dce4ec",
          paddingBottom: 18,
        }}
      >
        <MathText colorize={false}>
          {[
            "points",
            "question-order",
            "vertical",
            "coincident",
            "crossing",
            "question-point",
            "scale",
            "shear-first",
            "scale-first",
          ].includes(shot.page)
            ? "演示系数 s=1/2 · 仅用于演示，非算法安全系数"
            : "剪切变换⑥ · 特殊情况与原坐标"}
        </MathText>
      </div>
      <main
        data-main-content
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: 225,
          bottom: 200,
          display: "flex",
          alignItems: "flex-start",
          gap: 60,
        }}
      >
        {page.diagram ? (
          <div style={{ width: 740, flexShrink: 0 }}>
            <SpecialDiagram
              kind={page.diagram}
              page={shot.page}
              step={visibleStep}
              progress={progress}
            />
          </div>
        ) : null}
        <div
          data-main-column
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            justifyContent: page.diagram ? "flex-start" : "center",
          }}
        >
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
