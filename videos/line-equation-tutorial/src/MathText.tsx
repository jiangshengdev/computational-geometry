import { useMemo } from "react";
import { Latex } from "./Latex";
import { mathTextParts } from "./math-text";

export const MathText = ({
  children,
  highlightDifferences = false,
}: {
  children: string | number;
  highlightDifferences?: boolean;
}) => {
  const parts = useMemo(
    () => mathTextParts(String(children), highlightDifferences),
    [children, highlightDifferences],
  );
  return (
    <>
      {parts.map((part, index) =>
        part.latex === undefined ? (
          part.text
        ) : (
          <Latex key={index}>{part.latex}</Latex>
        ),
      )}
    </>
  );
};

/** HTML math at SVG coordinates; x/y retain the original text baseline anchor. */
export const SvgMathText = ({
  children,
  x,
  y,
  fontSize = 38,
  fill = "#172c45",
  textAnchor = "start",
  outlined = false,
}: {
  children: string | number;
  x: number | string;
  y: number | string;
  fontSize?: number | string;
  fill?: string;
  textAnchor?: "start" | "middle" | "end";
  outlined?: boolean;
}) => (
  <foreignObject x={x} y={y} width={1} height={1} overflow="visible">
    <div
      style={{
        width: "max-content",
        whiteSpace: "nowrap",
        fontSize: Number(fontSize),
        lineHeight: 1.2,
        color: fill,
        WebkitTextStroke: outlined ? "5px #f6f8fb" : undefined,
        paintOrder: outlined ? "stroke fill" : undefined,
        transform: `translate(${textAnchor === "middle" ? "-50%" : textAnchor === "end" ? "-100%" : "0"}, -80%)`,
      }}
    >
      <MathText>{children}</MathText>
    </div>
  </foreignObject>
);
