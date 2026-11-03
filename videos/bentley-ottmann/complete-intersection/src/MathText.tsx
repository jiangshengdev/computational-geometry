import { createMathText } from "../../../shared/ui/MathText";
import {
  escapePattern,
  normalizeMath,
  type ColorMark,
} from "./teaching-colors";

// Explicit row marks only; consume commands whole to avoid coloring their letters.
export const colorMath = (
  text: string,
  _role?: string,
  marks: ColorMark[] = [],
) => {
  const selected = new Map(
    marks.map((mark) => [normalizeMath(mark.term), mark.color]),
  );
  const terms = [...selected.keys()]
    .filter((term) => !/[\u3400-\u9fff]/.test(term))
    .sort((a, b) => b.length - a.length);
  const value = normalizeMath(text);
  if (!terms.length) return value;
  const quantities = terms.map(
    (term) =>
      // Indexed coefficients may be immediately multiplied by x/y; a bare x/y
      // must not also match the base of an endpoint coordinate such as x_{A_i}.
      `${escapePattern(term)}(?![${/_[0-9]+$/.test(term) ? "0-9_" : "A-Za-z0-9_"}])`,
  );
  const pattern = new RegExp(
    `(?<![A-Za-z])(?:${quantities.join("|")})|\\\\(?:\\\\|[A-Za-z]+)`,
    "g",
  );
  return value.replace(pattern, (term) =>
    selected.has(term) ? `{\\color{${selected.get(term)}}${term}}` : term,
  );
};
const {
  MathText: InlineMathText,
  Latex,
  SvgMathText,
} = createMathText(colorMath, {
  split: /([A-Za-z0-9₀-₉ᵢωΔ′'−+×=<>≠≤≥|_*^{}()[\],./\\\s-]+)/g,
  math: /[A-Za-z0-9₀-₉ᵢωΔ≠≤≥|]/,
});
export { Latex, SvgMathText };

/** Keep the shared mixed-math parser; Chinese teaching phrases stay ordinary text. */
export function MathText({
  children,
  marks = [],
  colorize = true,
}: {
  children: string | number;
  marks?: ColorMark[];
  colorize?: boolean;
}) {
  const text = String(children).replace(/ᵢ/g, "_i");
  const phrases = marks.filter((mark) => /[\u3400-\u9fff]/.test(mark.term));
  const terms = [...new Set(phrases.map((mark) => mark.term))].sort(
    (a, b) => b.length - a.length,
  );
  if (!colorize || !terms.length)
    return (
      <InlineMathText marks={marks} colorize={colorize}>
        {text}
      </InlineMathText>
    );
  const parts = text.split(
    new RegExp(`(${terms.map(escapePattern).join("|")})`, "g"),
  );
  return (
    <span>
      {parts.map((part, index) => (
        <span
          key={index}
          style={{ color: phrases.find((mark) => mark.term === part)?.color }}
        >
          <InlineMathText marks={marks}>{part}</InlineMathText>
        </span>
      ))}
    </span>
  );
}
