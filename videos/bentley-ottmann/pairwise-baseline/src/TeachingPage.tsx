import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { Subtitles } from "../../../shared/ui/Subtitles";
import { MathText, Latex, colorMath } from "./MathText";
import { pages } from "./storyboard";
import { PairingDiagram, type PairingState } from "./PairingDiagram";
import { MathLessonPage } from "../../../shared/ui/MathLessonPage";
import { left } from "../../../shared/math/math-lines";
import { lessonPages } from "./continuation";
import { LessonDiagram } from "./LessonDiagram";
import type { TeachingFocus } from "../../../shared/speech/teaching-cues";

const MathLines = createTeachingMathLines({
  pages: {
    ...pages,
    ...Object.fromEntries(
      Object.entries(lessonPages).map(([id, page]) => [
        id,
        {
          lines: page.lines.map((text) => ({ text })),
          groups: [left(page.lines.length)],
        },
      ]),
    ),
  },
  MathText,
  Latex,
  colorMath,
  lineMarks: {},
  defaultMathColor: "#172c45",
  objectColors: { current: "#b45309" },
  pageRoles: {
    ordered: "current",
    unordered: "current",
    substitution: "current",
    ...Object.fromEntries(
      Object.keys(lessonPages).map((id) => [id, "current" as const]),
    ),
  },
  wrapText: Object.keys(lessonPages),
});
export function TeachingPage({
  shot,
  visibleStep,
  caption,
  shift = 0,
  pairing,
  lessonFocus,
}: {
  shot: { page: string };
  visibleStep: number;
  caption: string;
  shift?: number;
  pairing: PairingState;
  lessonFocus?: TeachingFocus;
}) {
  if (shot.page in lessonPages) {
    const lesson = lessonPages[shot.page as keyof typeof lessonPages];
    return (
      <MathLessonPage
        title={<MathText>{lesson.title}</MathText>}
        diagram={
          lesson.diagram ? (
            <LessonDiagram
              page={shot.page}
              kind={lesson.diagram}
              step={visibleStep}
              focus={lessonFocus}
            />
          ) : undefined
        }
        caption={<MathText>{caption}</MathText>}
      >
        <MathLines pageId={shot.page} visibleStep={visibleStep} />
      </MathLessonPage>
    );
  }
  const page = pages[shot.page as keyof typeof pages];
  return (
    <div
      data-production-page
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
          top: 40,
          left: 100,
          fontSize: 48,
          fontWeight: 600,
        }}
      >
        {page.title}
      </header>
      {page.basis.length > 0 && (
        <aside
          data-page-block
          style={{
            position: "absolute",
            left: 100,
            right: 100,
            top: 135,
            padding: 20,
            background: "#edf1f6",
            borderLeft: "4px solid #a4b3c4",
            display: "flex",
            gap: 50,
            alignItems: "center",
            fontSize: 30,
          }}
        >
          <span>已讲依据</span>
          {page.basis.map((basis) => (
            <span key={basis.from} data-basis-from={basis.from}>
              <Latex colorize={false}>{basis.math}</Latex>
            </span>
          ))}
        </aside>
      )}
      <main
        data-main-content
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: page.basis.length ? 260 : 170,
          bottom: 136,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {shot.page === "ordered" ? (
          <div
            data-main-column
            style={{ position: "relative", width: "100%", height: 330 }}
          >
            <div
              data-teaching-column
              data-prior-content={visibleStep >= 3 || undefined}
              style={{
                position: "absolute",
                left: 480,
                top: 50,
                width: 760,
                boxSizing: "border-box",
                padding: "16px 26px",
                borderLeft: `4px solid ${visibleStep >= 3 ? "#a4b3c4" : "transparent"}`,
                background: visibleStep >= 3 ? "#edf1f6" : undefined,
                transform: `translateX(${-400 * shift}px)`,
              }}
            >
              {pages.ordered.lines.slice(0, 2).map((line, i) => (
                <div
                  key={i}
                  data-content-line
                  style={{
                    visibility: visibleStep > i ? "visible" : "hidden",
                    fontSize: 34,
                    minHeight: 90,
                  }}
                >
                  <span data-line-ink>
                    <MathText>{line.text ?? ""}</MathText>
                  </span>
                </div>
              ))}
            </div>
            <div
              data-teaching-column
              style={{ position: "absolute", left: 940, top: 20, width: 780 }}
            >
              {pages.ordered.lines.slice(2).map((line, i) => (
                <div
                  key={i}
                  data-content-line
                  style={{
                    visibility: visibleStep >= i + 3 ? "visible" : "hidden",
                    fontSize: 36,
                    minHeight: 105,
                    color: visibleStep === i + 3 ? "#b45309" : "#172c45",
                  }}
                >
                  <span data-line-ink>
                    {line.math ? (
                      <Latex>{line.math}</Latex>
                    ) : (
                      <MathText>{line.text ?? ""}</MathText>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div data-main-column>
            <MathLines pageId={shot.page} visibleStep={visibleStep} />
          </div>
        )}
        <PairingDiagram
          page={shot.page}
          visibleStep={visibleStep}
          state={pairing}
          shift={shift}
        />
      </main>
      <Subtitles pageBlock>
        <span data-caption-ink>
          <MathText>{caption}</MathText>
        </span>
      </Subtitles>
    </div>
  );
}
