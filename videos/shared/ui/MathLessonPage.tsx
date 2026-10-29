import type { ReactNode } from "react";
import { Subtitles } from "./Subtitles";

/** One frame for teaching text and formulas, independent of the line types. */
export function MathLessonPage({
  title,
  basis,
  children,
  diagram,
  diagramProgress = 1,
  caption,
}: {
  title: ReactNode;
  basis?: ReactNode;
  children: ReactNode;
  diagram?: ReactNode;
  diagramProgress?: number;
  caption: ReactNode;
}) {
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
        {title}
      </header>
      {basis ? (
        <aside
          data-page-block
          style={{
            position: "absolute",
            top: 135,
            left: 100,
            padding: 20,
            background: "#edf1f6",
            fontSize: 30,
          }}
        >
          已讲依据：{basis}
        </aside>
      ) : null}
      <main
        data-main-content
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: basis ? 250 : 165,
          bottom: 150,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 65,
        }}
      >
        <section
          data-main-column
          style={{
            width: diagram ? 850 : "max-content",
            maxWidth: "100%",
            transform: diagram
              ? `translateX(${435 * (1 - diagramProgress)}px)`
              : undefined,
          }}
        >
          {children}
        </section>
        {diagram ? (
          <section
            data-page-block
            data-teaching-group="lesson-diagram"
            style={{
              width: 800,
              flexShrink: 0,
              visibility: diagramProgress < 1 ? "hidden" : "visible",
            }}
          >
            {diagram}
          </section>
        ) : null}
      </main>
      <Subtitles pageBlock>
        <span data-caption-ink>{caption}</span>
      </Subtitles>
    </div>
  );
}
