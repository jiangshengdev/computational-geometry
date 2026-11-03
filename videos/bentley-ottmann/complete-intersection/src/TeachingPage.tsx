import { MathLessonPage } from "../../../shared/ui/MathLessonPage";
import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { colors } from "../../colors.ts";
import { MathText, Latex, colorMath } from "./MathText";
import { pages } from "./storyboard";
import { IntersectionDiagram } from "./IntersectionDiagram";
import { JudgmentPath } from "./JudgmentPath";
import { ConceptDiagram, conceptKinds } from "./ConceptDiagram";
import type { TimelineRow } from "./timeline";
const MathLines = createTeachingMathLines({
  pages,
  MathText,
  Latex,
  colorMath,
  lineMarks: {},
  objectColors: { current: colors.amber },
  pageRoles: Object.fromEntries(
    Object.keys(pages).map((id) => [id, "current" as const]),
  ),
  defaultMathColor: "#172c45",
  wrapText: true,
});
export function TeachingPage({
  row,
  caption,
  visibleStep,
  target,
  progress,
  reached,
}: {
  row: TimelineRow;
  caption: string;
  visibleStep: number;
  target: string | null;
  progress: number;
  reached: string[];
}) {
  const p = pages[row.page];
  return (
    <MathLessonPage
      diagramPosition="left"
      title={<MathText>{p.title}</MathText>}
      diagram={
        p.diagram === "whole-path" ? (
          <JudgmentPath step={visibleStep} />
        ) : p.diagram && conceptKinds.has(p.diagram) ? (
          <ConceptDiagram
            kind={p.diagram}
            step={visibleStep}
            target={target}
            progress={progress}
          />
        ) : p.diagram ? (
          <IntersectionDiagram
            kind={p.diagram}
            step={visibleStep}
            target={target}
            progress={progress}
            reached={reached}
          />
        ) : undefined
      }
      caption={<MathText>{caption}</MathText>}
    >
      <MathLines pageId={p.id} visibleStep={visibleStep} />
    </MathLessonPage>
  );
}
