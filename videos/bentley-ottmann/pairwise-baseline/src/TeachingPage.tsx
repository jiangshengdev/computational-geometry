import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { Subtitles } from "../../../shared/ui/Subtitles";
import { MathText, Latex, colorMath } from "./MathText";
import { pages } from "./storyboard";

const MathLines = createTeachingMathLines({
  pages,
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
  },
});
export function TeachingPage({
  shot,
  visibleStep,
  caption,
  shift = 0,
}: {
  shot: { page: string };
  visibleStep: number;
  caption: string;
  shift?: number;
}) {
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
          top: page.basis.length ? 320 : 210,
          bottom: 136,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {shot.page === "ordered" ? (
          <div
            data-main-column
            style={{ position: "relative", width: "100%", height: 500 }}
          >
            <div
              data-teaching-column
              style={{
                position: "absolute",
                left: 480,
                top: 120,
                width: 760,
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
              style={{ position: "absolute", left: 940, top: 80, width: 780 }}
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
        {shot.page === "substitution" && (
          <div
            data-page-block
            data-enumeration
            style={{
              position: "absolute",
              bottom: 0,
              fontSize: 30,
              visibility: visibleStep >= 3 ? "visible" : "hidden",
            }}
          >
            <MathText>
              六对枚举：1 与 2、1 与 3、1 与 4；2 与 3、2 与 4；3 与 4
            </MathText>
          </div>
        )}
      </main>
      <Subtitles pageBlock>
        <span data-caption-ink>
          <MathText>{caption}</MathText>
        </span>
      </Subtitles>
    </div>
  );
}
