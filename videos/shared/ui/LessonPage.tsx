import type { ReactNode } from "react";
import { Subtitles } from "./Subtitles";

/** Shared frame; each episode owns its mathematics, scenes and reveal cues. */
export function LessonPage({
  title,
  lines,
  visibleStep,
  activeStep,
  diagram,
  diagramProgress = 1,
  textWidth = 1400,
  inactiveTextColor,
  caption,
}: {
  title: ReactNode;
  lines: ReactNode[];
  visibleStep: number;
  activeStep: number;
  diagram?: ReactNode;
  diagramProgress?: number;
  textWidth?: number | "max-content";
  inactiveTextColor?: string;
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
      <main
        data-main-content
        style={{
          position: "absolute",
          top: 155,
          bottom: 150,
          left: 100,
          right: 100,
          display: "flex",
          alignItems: "center",
          gap: 65,
        }}
      >
        <section
          data-main-column
          style={{
            width: diagram ? 850 : textWidth,
            maxWidth: "100%",
            margin: diagram ? 0 : "0 auto",
            transform: diagram
              ? `translateX(${435 * (1 - diagramProgress)}px)`
              : undefined,
          }}
        >
          {lines.map((line, index) => (
            <div
              key={index}
              data-content-line
              style={{
                visibility: index < visibleStep ? "visible" : "hidden",
                color: index + 1 === activeStep ? undefined : inactiveTextColor,
                marginBottom: 28,
                padding: "14px 18px",
                fontSize: 34,
                lineHeight: 1.7,
                borderLeft: `5px solid ${index + 1 === activeStep ? "#b45309" : "transparent"}`,
                background:
                  index + 1 === activeStep ? "rgba(180,83,9,0.08)" : undefined,
              }}
            >
              <span data-line-ink>{line}</span>
            </div>
          ))}
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
