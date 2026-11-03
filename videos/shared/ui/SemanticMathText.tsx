import { createMathText } from "./MathText";
import {
  colorMath,
  escapePattern,
  type ColorMark,
} from "../math/semantic-colors";

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
