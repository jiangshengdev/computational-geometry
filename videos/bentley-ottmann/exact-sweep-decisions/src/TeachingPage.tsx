import { MathLessonPage } from "../../../shared/ui/MathLessonPage";
import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { colors } from "../../colors.ts";
import { MathText, Latex, colorMath } from "./MathText";
import { pages } from "./storyboard";
import { DecisionDiagram } from "./DecisionDiagram";
import { type TimelineRow, type visualAt } from "./timeline";

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
  state,
}: {
  row: TimelineRow;
  state: ReturnType<typeof visualAt>;
}) {
  const page = pages[row.page];
  return (
    <MathLessonPage
      diagramPosition="left"
      title={<MathText colorize={false}>{page.title}</MathText>}
      diagram={
        page.diagram ? (
          <DecisionDiagram page={row.page} kind={page.diagram} {...state} />
        ) : undefined
      }
      caption={<MathText colorize={false}>{state.caption}</MathText>}
    >
      <MathLines pageId={row.page} visibleStep={state.visibleStep} />
    </MathLessonPage>
  );
}
