import { createMathText } from "../../../shared/ui/MathText";

// Color belongs to a teaching operation, never to every occurrence of a letter.
export const colorMath = (text: string) => text.replace(/ᵢ/g, "_i");
export const { MathText, Latex, SvgMathText } = createMathText(colorMath, {
  split: /([A-Za-z0-9₀-₉ᵢωΔ′'−+×=<>≠≤≥|_*^{}()[\],./\\\s-]+)/g,
  math: /[A-Za-z0-9₀-₉ᵢωΔ≠≤≥|]/,
});
