import { MathLessonPage } from "../../../shared/ui/MathLessonPage";
import { TeachingReferences } from "../../../shared/ui/TeachingReferences";
import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { MathText, Latex } from "../../../shared/ui/SemanticMathText";
import { colorMath } from "../../../shared/math/semantic-colors";
import { colors, tints } from "../../colors.ts";
import { pages } from "./storyboard";
import { ProofDiagram } from "./ProofDiagram";
import type { TimelineRow, VisualState } from "./timeline";
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
  state: VisualState;
}) {
  const page = pages[row.page];
  return (
    <MathLessonPage
      diagramPosition="left"
      diagramProgress={state.boundaryDiagramProgress}
      title={<MathText colorize={false}>{page.title}</MathText>}
      basis={
        page.basis ? (
          <TeachingReferences
            activeColor={tints.active}
            entries={[
              {
                id: page.id,
                visible: true,
                active: false,
                label: null,
                content: <MathText colorize={false}>{page.basis}</MathText>,
              },
            ]}
          />
        ) : undefined
      }
      showBasisTitle={false}
      basisHeight={105}
      diagram={
        page.diagram || row.id === "OC39" ? (
          <ProofDiagram row={row} state={state} />
        ) : undefined
      }
      caption={<MathText colorize={false}>{state.caption}</MathText>}
    >
      <MathLines
        pageId={row.page}
        visibleStep={state.visibleStep}
        activeMarks={{
          [state.visibleStep - 1]: state.active
            ? [{ term: row.focus, color: colors.amber }]
            : [],
        }}
      />
    </MathLessonPage>
  );
}
