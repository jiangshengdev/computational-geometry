import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { MathText } from "./MathText";
import { titles } from "./scenes";

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
        top: 62,
        fontSize: 28,
        color: "#65758a",
      }}
    >
      由两个端点写出直线方程 ·{" "}
      <MathText>{`${String(chapter + 1).padStart(2, "0")} / 08`}</MathText>
    </div>
    <div
      style={{
        position: "absolute",
        left: 100,
        top: 125,
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
          top: 210,
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
          left: 70,
          top: 285,
          scale: columnCount > 1 ? "0.7" : "0.8",
          transformOrigin: "top left",
        }}
      >
        {diagram}
      </div>
    ) : null}
    <div
      style={{
        position: "absolute",
        left: graphic ? (columnCount > 1 ? 700 : 790) : 100,
        right: 100,
        top: 305,
        textAlign: "left",
        display: "grid",
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
          left: graphic ? (columnCount > 1 ? 700 : 790) : 100,
          right: 100,
          top: 840,
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
