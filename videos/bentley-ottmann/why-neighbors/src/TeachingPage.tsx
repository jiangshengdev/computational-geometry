import { colors, tints } from "../../colors.ts";
import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { MathLessonPage } from "../../../shared/ui/MathLessonPage";
import { TeachingReferences } from "../../../shared/ui/TeachingReferences";
import { MathText, Latex, colorMath } from "./MathText";
import { pages, references, type Shot } from "./lesson";
import { ProofDiagram } from "./ProofDiagram";
import type { Reference } from "./storyboard";
import type { DiagramCueState } from "./diagram-cues";
const MathLines = createTeachingMathLines({
  pages,
  MathText,
  Latex,
  colorMath,
  lineMarks: {},
  defaultMathColor: "#172c45",
  objectColors: { current: colors.amber },
  pageRoles: Object.fromEntries(
    Object.keys(pages).map((id) => [id, "current" as const]),
  ),
  wrapText: true,
});
export function TeachingPage({
  shot,
  visibleStep,
  caption,
  cueActive = false,
  cueProgress = 1,
  diagramState,
}: {
  shot: Shot;
  visibleStep: number;
  caption: string;
  cueActive?: boolean;
  cueProgress?: number;
  diagramState?: DiagramCueState;
}) {
  const page = pages[shot.page];
  const current = page.steps[visibleStep - 1];
  const basis = page.basis.length ? (
    <TeachingReferences
      activeColor={tints.active}
      entries={page.basis.map((id) => {
        const source: Reference = references[id];
        const active = cueActive && current?.use?.includes(id);
        return {
          id,
          active: Boolean(active),
          label: (
            <MathText colorize={false}>
              {(source.number ? `(${source.number}) ` : "") +
                source.name +
                "："}
            </MathText>
          ),
          content: source.math ? (
            <Latex colorize={false}>
              {colorMath(source.math, undefined, active ? current.focus : [])}
            </Latex>
          ) : (
            <MathText>{source.text ?? ""}</MathText>
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
        page.basis.length
          ? 75 + Math.ceil(page.basis.length / 2) * 65
          : undefined
      }
      diagram={
        page.diagram ? (
          <ProofDiagram
            page={shot.page}
            step={visibleStep}
            active={cueActive}
            progress={cueProgress}
            cues={diagramState}
          />
        ) : undefined
      }
      caption={<MathText colorize={false}>{caption}</MathText>}
    >
      <MathLines
        pageId={shot.page}
        visibleStep={visibleStep}
        activeMarks={
          cueActive && current?.focus
            ? Object.fromEntries(
                page.steps.flatMap((step, index) =>
                  index === visibleStep - 1 ||
                  (index < visibleStep - 1 &&
                    step.publish &&
                    current.use?.includes(step.publish))
                    ? [
                        [
                          index,
                          current.focus!.filter((term) =>
                            step.math?.includes(term),
                          ),
                        ],
                      ]
                    : [],
                ),
              )
            : undefined
        }
      />
    </MathLessonPage>
  );
}
