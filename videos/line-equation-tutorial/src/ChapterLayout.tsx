import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { MathText } from "./MathText";
import { titles } from "./scenes";
import { diagramViewport } from "./CoordinateGrid";

const diagramLeft = 10;
const diagramScale = 0.95;
const contentLeft = diagramLeft + diagramViewport.width * diagramScale + 30;

export const ChapterLayout = ({
  chapter,
  context = [],
  graphic = true,
  diagram,
  content,
  columnCount = 1,
  note,
  children,
}: {
  chapter: number;
  context?: string[];
  graphic?: boolean;
  diagram?: ReactNode;
  content: ReactNode;
  columnCount?: number;
  note?: string;
  children?: ReactNode;
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: "#f6f8fb",
      color: "#172c45",
      fontFamily: '"PingFang SC", sans-serif',
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 100,
        top: 40,
        fontSize: 48,
        fontWeight: 600,
      }}
    >
      <MathText>{titles[chapter]}</MathText>
    </div>
    {context.length ? (
      <div
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: 125,
          display: "flex",
          gap: 48,
          alignItems: "center",
          fontSize: 30,
          color: "#526579",
          borderBottom: "2px solid #dce4ec",
          paddingBottom: 18,
        }}
      >
        {context.map((line) => (
          <div key={line}>
            <MathText>{line}</MathText>
          </div>
        ))}
      </div>
    ) : null}
    {diagram ? (
      <div
        style={{
          position: "absolute",
          left: diagramLeft,
          top: 210,
          scale: String(diagramScale),
          transformOrigin: "top left",
        }}
      >
        {diagram}
      </div>
    ) : null}
    <div
      data-main-content
      style={{
        position: "absolute",
        left: graphic ? contentLeft : 100,
        right: 100,
        top: 220,
        bottom: 200,
        textAlign: "left",
        display: "grid",
        alignContent: "start",
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        justifyItems: !graphic && columnCount === 1 ? "center" : "stretch",
        gap: 40,
      }}
    >
      {content}
    </div>
    {note ? (
      <div
        style={{
          position: "absolute",
          left: graphic ? contentLeft : 100,
          right: 100,
          top: 900,
          fontSize: 30,
          lineHeight: 1.6,
          color: "#65758a",
        }}
      >
        <MathText>{note}</MathText>
      </div>
    ) : null}
    {children}
  </AbsoluteFill>
);
