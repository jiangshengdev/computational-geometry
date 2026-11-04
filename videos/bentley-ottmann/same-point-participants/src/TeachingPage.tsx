import { MathLessonPage } from "../../../shared/ui/MathLessonPage";
import { TeachingReferences } from "../../../shared/ui/TeachingReferences";
import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { colors, tints } from "../../colors.ts";
import { MathText, Latex, colorMath } from "./MathText";
import { pages } from "./storyboard";
import { ParticipantDiagram } from "./ParticipantDiagram";
import type { TimelineRow, visualAt } from "./timeline";
import { objectMarks, activeMarks } from "./teaching-colors";
import { pageReferences } from "./references";

const MathLines = createTeachingMathLines({
  pages,
  MathText,
  Latex,
  colorMath,
  lineMarks: Object.fromEntries(
    Object.values(pages).map((p) => [
      p.id,
      p.steps.map((s) => objectMarks[s.id] ?? []),
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
      entries={references.map((r) => ({
        id: r.id,
        visible: state.visibleStep >= (r.visibleFrom ?? 1),
        active: false,
        label: <MathText colorize={false}>{r.name + "："}</MathText>,
        content: <MathText colorize={false}>{r.text}</MathText>,
      }))}
    />
  ) : undefined;
  return (
    <MathLessonPage
      diagramPosition="left"
      title={<MathText colorize={false}>{page.title}</MathText>}
      basis={basis}
      showBasisTitle={false}
      basisHeight={references.length ? 95 : undefined}
      diagram={
        page.diagram ? (
          <ParticipantDiagram page={row.page} kind={page.diagram} {...state} />
        ) : undefined
      }
      caption={<MathText colorize={false}>{state.caption}</MathText>}
    >
      <MathLines
        pageId={row.page}
        visibleStep={state.visibleStep}
        activeMarks={{
          [state.visibleStep - 1]: activeMarks(row.id, state.activeCaption),
        }}
      />
    </MathLessonPage>
  );
}
