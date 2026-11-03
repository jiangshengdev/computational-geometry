import { MathLessonPage } from "../../../shared/ui/MathLessonPage";
import { TeachingReferences } from "../../../shared/ui/TeachingReferences";
import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { colors } from "../../colors.ts";
import { MathText, Latex, colorMath } from "./MathText";
import { pages } from "./storyboard";
import { DecisionDiagram } from "./DecisionDiagram";
import { type TimelineRow, type visualAt } from "./timeline";
import { objectMarks, activeTeachingMarks } from "./teaching-colors";
import { pageReferences } from "./references";
import { tints } from "../../colors.ts";

const MathLines = createTeachingMathLines({
  pages,
  MathText,
  Latex,
  colorMath,
  lineMarks: Object.fromEntries(
    Object.values(pages).map((page) => [
      page.id,
      page.steps.map((step) => objectMarks[step.id] ?? []),
    ]),
  ),
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
  const references = pageReferences[row.page] ?? [];
  const basis = references.length ? (
    <TeachingReferences
      activeColor={tints.active}
      entries={references.map((reference) => {
        const visible = state.visibleStep >= (reference.visibleFrom ?? 1);
        const active =
          visible &&
          state.activeCaption !== null &&
          Boolean(reference.uses[row.id]?.includes(state.activeCaption));
        return {
          id: reference.id,
          visible,
          active,
          label: <MathText colorize={false}>{reference.name + "："}</MathText>,
          content: (
            <Latex colorize={false}>
              {colorMath(
                reference.math,
                undefined,
                active
                  ? activeTeachingMarks(
                      row.id,
                      state.activeCaption,
                      state.target,
                    ).filter((mark) => reference.math.includes(mark.term))
                  : [],
              )}
            </Latex>
          ),
        };
      })}
    />
  ) : undefined;
  return (
    <MathLessonPage
      diagramPosition="left"
      title={<MathText colorize={false}>{page.title}</MathText>}
      basis={basis}
      showBasisTitle={false}
      basisHeight={
        references.length ? (references.length > 2 ? 145 : 95) : undefined
      }
      diagram={
        page.diagram ? (
          <DecisionDiagram page={row.page} kind={page.diagram} {...state} />
        ) : undefined
      }
      caption={<MathText colorize={false}>{state.caption}</MathText>}
    >
      <MathLines
        pageId={row.page}
        visibleStep={state.visibleStep}
        activeMarks={
          state.activeCaption === null
            ? undefined
            : {
                [state.visibleStep - 1]: activeTeachingMarks(
                  row.id,
                  state.activeCaption,
                  state.target,
                ),
              }
        }
      />
    </MathLessonPage>
  );
}
