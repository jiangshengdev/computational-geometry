import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { MathLessonPage } from "../../../shared/ui/MathLessonPage";
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
  return (
    <MathLessonPage
      title={<MathText>{page.title}</MathText>}
      basis={page.basis ? <Latex>{page.basis}</Latex> : undefined}
      diagramProgress={diagramProgress}
      diagram={
        page.diagram ? (
          <ProofDiagram page={shot.page} step={visibleStep} focus={focus} />
        ) : undefined
      }
      caption={<MathText>{caption}</MathText>}
    >
      <MathLines pageId={shot.page} visibleStep={visibleStep} />
    </MathLessonPage>
  );
}
