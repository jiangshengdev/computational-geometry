import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { MathLessonPage } from "../../../shared/ui/MathLessonPage";
import { MathText, Latex, colorMath } from "./MathText";
import { pages, references, type Shot } from "./lesson";
import { ProofDiagram } from "./ProofDiagram";
import type { Reference } from "./storyboard";
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
  wrapText: true,
});
export function TeachingPage({
  shot,
  visibleStep,
  caption,
  cueActive = false,
  cueProgress = 1,
}: {
  shot: Shot;
  visibleStep: number;
  caption: string;
  cueActive?: boolean;
  cueProgress?: number;
}) {
  const page = pages[shot.page];
  const current = page.steps[visibleStep - 1];
  const basis = page.basis.length ? (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px 32px",
        width: 1660,
      }}
    >
      {page.basis.map((id) => {
        const source: Reference = references[id];
        const active = cueActive && current?.use?.includes(id);
        return (
          <div
            key={id}
            data-reference={id}
            data-reference-active={active}
            style={{ fontSize: 25, lineHeight: 1.6 }}
          >
            <span style={{ background: active ? "#f8e5bf" : undefined }}>
              <MathText>
                {(source.number ? `(${source.number}) ` : "") +
                  source.name +
                  "："}
              </MathText>
            </span>
            {source.math ? (
              <Latex>
                {colorMath(source.math, undefined, active ? current.focus : [])}
              </Latex>
            ) : (
              <MathText>{source.text ?? ""}</MathText>
            )}
          </div>
        );
      })}
    </div>
  ) : undefined;
  return (
    <MathLessonPage
      title={<MathText>{page.title}</MathText>}
      basis={basis}
      basisHeight={
        page.basis.length
          ? 115 + Math.ceil(page.basis.length / 2) * 65
          : undefined
      }
      diagram={
        page.diagram ? (
          <ProofDiagram
            page={shot.page}
            step={visibleStep}
            active={cueActive}
            progress={cueProgress}
          />
        ) : undefined
      }
      caption={<MathText>{caption}</MathText>}
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
