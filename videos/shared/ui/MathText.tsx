import { createContext, Fragment, useContext, type CSSProperties } from "react";
import { Latex as Formula } from "./Latex";

export function createMathText<Role extends string, Mark>(
  colorMath: (
    text: string,
    role?: Role,
    marks?: Mark[],
    numberRoles?: (Role | undefined)[],
  ) => string,
  notation: { split: RegExp; math: RegExp },
) {
  const TeachingColors = createContext<Role | undefined>(undefined);

  const Latex = ({
    children,
    marks,
    numberRoles,
    colorize = true,
  }: {
    children: string;
    marks?: Mark[];
    numberRoles?: (Role | undefined)[];
    colorize?: boolean;
  }) => {
    const operation = useContext(TeachingColors);
    return (
      <Formula>
        {colorize
          ? colorMath(children, operation, marks, numberRoles)
          : children}
      </Formula>
    );
  };

  // Keep mixed text in one inline flow, including inside flex/grid parents.
  // The notation used by this episode; Chinese prose stays in the Chinese font.
  const MathText = ({
    children,
    numberRoles = [],
    colorize = true,
  }: {
    children: string | number;
    numberRoles?: (Role | undefined)[];
    colorize?: boolean;
  }) => {
    const parts = String(children).split(notation.split);
    let number = 0;
    return (
      <span>
        {parts.map((part, i) => {
          const count = [...part.matchAll(/\d+(?:\.\d+)?/g)].length;
          const roles = numberRoles.slice(number, number + count);
          number += count;
          return notation.math.test(part) ? (
            <Fragment key={i}>
              {part.slice(0, part.length - part.trimStart().length)}
              <Latex numberRoles={roles} colorize={colorize}>
                {part
                  .trim()
                  .replace(/′/g, "'")
                  .replace(/−/g, "-")
                  .replace(/×/g, "\\times ")
                  .replace(/≠/g, "\\ne ")
                  .replace(/≤/g, "\\le ")
                  .replace(/≥/g, "\\ge ")
                  .replace(/→/g, "\\to ")
                  .replace(/↓/g, "\\downarrow ")
                  .replace(/↑/g, "\\uparrow ")
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
      </span>
    );
  };

  const SvgMathText = ({
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

  return { TeachingColors, Latex, MathText, SvgMathText };
}
