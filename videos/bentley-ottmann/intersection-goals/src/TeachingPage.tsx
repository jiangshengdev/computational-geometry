import { colors } from "../../colors.ts";
import { Subtitles } from "../../../shared/ui/Subtitles";
import { MathText, Latex, colorMath } from "./MathText";
import { InputDiagram } from "./InputDiagram";
import type { DiagramFocus } from "./timeline";
import { MathLessonPage } from "../../../shared/ui/MathLessonPage";
import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { left } from "../../../shared/math/math-lines";
import { lessonPages } from "./continuation";
import { LessonDiagram } from "./LessonDiagram";
import type { TeachingFocus } from "../../../shared/speech/teaching-cues";

const MathLines = createTeachingMathLines({
  pages: Object.fromEntries(
    Object.entries(lessonPages).map(([id, page]) => [
      id,
      {
        lines: page.lines.map((text) => ({ text })),
        groups: [left(page.lines.length)],
      },
    ]),
  ),
  MathText,
  Latex,
  colorMath,
  lineMarks: {},
  objectColors: { current: colors.amber },
  pageRoles: Object.fromEntries(
    Object.keys(lessonPages).map((id) => [id, "current" as const]),
  ),
  wrapText: true,
});

export function TeachingPage({
  visibleStep,
  caption,
  activeInput,
  focus,
  shot,
  lessonFocus,
}: {
  visibleStep: number;
  caption: string;
  activeInput: number;
  focus?: DiagramFocus;
  shot: { page: string };
  lessonFocus?: TeachingFocus;
}) {
  if (shot.page !== "opening") {
    const page = lessonPages[shot.page as keyof typeof lessonPages];
    return (
      <MathLessonPage
        title={<MathText>{page.title}</MathText>}
        diagram={
          page.diagram ? (
            <LessonDiagram
              kind={page.diagram}
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
        三份输入，一个相交位置
      </header>
      <main
        data-main-content
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 180,
          bottom: 170,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[1, 2, 3].map((input) => (
            <section
              key={input}
              data-page-block
              style={{
                visibility: visibleStep >= input ? "visible" : "hidden",
                width: 390,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 36,
                  opacity:
                    activeInput === input && focus?.target === "identity"
                      ? 0.65 +
                        0.35 * Math.cos(focus.progress * Math.PI * 4) ** 2
                      : 1,
                }}
              >
                <MathText>{`输入 ${input}`}</MathText>
              </div>
              <InputDiagram
                animateFocus
                inputs={[input]}
                focus={activeInput === input ? focus : undefined}
              />
              <div style={{ fontSize: 28 }}>
                {input === 1
                  ? "水平线段"
                  : input === 2
                    ? "竖直线段"
                    : "两个端点相同，只有原点"}
              </div>
            </section>
          ))}
          <section
            data-page-block
            style={{
              visibility: visibleStep >= 4 ? "visible" : "hidden",
              width: 390,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36 }}>放在一起</div>
            <InputDiagram
              animateFocus
              inputs={[1, 2, 3]}
              focus={activeInput === 4 ? focus : undefined}
            />
            <div style={{ fontSize: 28 }}>保留三份输入的身份</div>
          </section>
        </div>
        <div
          data-page-block
          style={{
            visibility: visibleStep >= 4 ? "visible" : "hidden",
            marginTop: 80,
            textAlign: "center",
            fontSize: 46,
            color: colors.amber,
          }}
        >
          求交结果应该记几条？
        </div>
      </main>
      <Subtitles pageBlock>
        <span data-caption-ink>
          <MathText>{caption}</MathText>
        </span>
      </Subtitles>
    </div>
  );
}
