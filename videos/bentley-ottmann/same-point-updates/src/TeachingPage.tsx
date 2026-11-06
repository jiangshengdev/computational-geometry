import { MathLessonPage } from "../../../shared/ui/MathLessonPage";
import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { MathText, Latex } from "../../../shared/ui/SemanticMathText";
import {
  colorMath,
  type ColorMark,
} from "../../../shared/math/semantic-colors";
import { colors, sweepColors } from "../../colors";
import { pages } from "./storyboard";
import { UpdateDiagram } from "./UpdateDiagram";
import type { TimelineRow, VisualState } from "./timeline";
const lineMarks: Record<string, ColorMark[][]> = Object.fromEntries(
  Object.values(pages).map((page) => [
    page.id,
    page.steps.map((step) =>
      Object.entries(sweepColors)
        .filter(([name]) => new RegExp(`\\b${name}\\b`).test(step.text))
        .map(([term, color]) => ({ term, color })),
    ),
  ]),
);
const MathLines = createTeachingMathLines({
  pages,
  MathText,
  Latex,
  colorMath,
  lineMarks,
  objectColors: { current: colors.amber },
  pageRoles: Object.fromEntries(
    Object.keys(pages).map((id) => [id, "current" as const]),
  ),
  defaultMathColor: "#172c45",
  wrapText: true,
});
export function TeachingPage({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const page = pages[row.page];
  return (
    <MathLessonPage
      diagramPosition="left"
      title={<MathText colorize={false}>{page.title}</MathText>}
      diagram={
        page.diagram ? (
          <UpdateDiagram kind={page.diagram} row={row} state={state} />
        ) : undefined
      }
      caption={<MathText colorize={false}>{state.caption}</MathText>}
    >
      <MathLines
        pageId={page.id}
        visibleStep={state.visibleStep}
        activeMarks={
          state.focus
            ? {
                [state.visibleStep - 1]: [
                  { term: state.focus, color: colors.amber },
                ],
              }
            : {}
        }
      />
    </MathLessonPage>
  );
}
