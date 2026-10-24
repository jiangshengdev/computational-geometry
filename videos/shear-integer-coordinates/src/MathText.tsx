import {
  createContext,
  Fragment,
  useContext,
  useMemo,
  type CSSProperties,
} from "react";
import { renderToString } from "katex";
import "katex/dist/katex.min.css";
import {
  colorMath,
  type MathMark,
  type TeachingRole,
} from "./teaching-emphasis";

export const TeachingColors = createContext<TeachingRole | undefined>(
  undefined,
);

export const Latex = ({
  children,
  marks,
  colorize = true,
}: {
  children: string;
  marks?: MathMark[];
  colorize?: boolean;
}) => {
  const operation = useContext(TeachingColors);
  const html = useMemo(
    () =>
      renderToString(
        colorize ? colorMath(children, operation, marks) : children,
        {
          throwOnError: true,
          strict: "error",
          trust: false,
        },
      ),
    [children, operation, marks, colorize],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

// The notation used by this episode; Chinese prose stays in the Chinese font.
export const MathText = ({
  children,
  colorize = true,
}: {
  children: string | number;
  colorize?: boolean;
}) => {
  const parts = String(children).split(
    /([A-Za-z0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹′'−+×=<>≤≥|_^{}()[\],./\s-]+)/g,
  );
  return (
    <>
      {parts.map((part, i) => {
        return /[A-Za-z0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹≤≥|]/.test(part) ? (
          <Fragment key={i}>
            {part.slice(0, part.length - part.trimStart().length)}
            <Latex colorize={colorize}>
              {part
                .trim()
                .replace(/′/g, "'")
                .replace(/−/g, "-")
                .replace(/×/g, "\\times ")
                .replace(/≤/g, "\\le ")
                .replace(/≥/g, "\\ge ")
                .replace(
                  /[₀-₉]+/g,
                  (digits) =>
                    `_{${Array.from(digits, (digit) => "₀₁₂₃₄₅₆₇₈₉".indexOf(digit)).join("")}}`,
                )
                .replace(
                  /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,
                  (digits) =>
                    `^{${Array.from(digits, (digit) => "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(digit)).join("")}}`,
                )
                .replace(/(-?\d+)\/(\d+)/g, "\\frac{$1}{$2}")}
            </Latex>
            {part.slice(part.trimEnd().length)}
          </Fragment>
        ) : (
          part
        );
      })}
    </>
  );
};

export const SvgMathText = ({
  x,
  y,
  children,
  fontSize = 30,
  fill = "#172c45",
  align = "left",
  label = true,
  colorize = false,
}: {
  x: number;
  y: number;
  children: string | number;
  fontSize?: number;
  fill?: string;
  align?: "left" | "right" | "center";
  label?: boolean;
  colorize?: boolean;
}) => (
  <foreignObject x={x} y={y} width={1} height={1} overflow="visible">
    <div
      data-diagram-label={label || undefined}
      style={
        {
          width: "max-content",
          whiteSpace: "nowrap",
          fontSize,
          color: fill,
          lineHeight: 1.2,
          WebkitTextStroke: "5px #f6f8fb",
          paintOrder: "stroke fill",
          transform: `translate(${align === "right" ? "-100%" : align === "center" ? "-50%" : "0"}, -80%)`,
        } as CSSProperties
      }
    >
      <MathText colorize={colorize}>{children}</MathText>
    </div>
  </foreignObject>
);
