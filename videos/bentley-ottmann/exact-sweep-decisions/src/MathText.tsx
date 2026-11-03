import { createMathText } from "../../../shared/ui/MathText";

// Formula rows and subtitles remain neutral; geometry owns its input colors.
export const colorMath = (text: string) => text;
export const { MathText, Latex, SvgMathText } = createMathText(colorMath, {
  split: /([A-Za-z0-9₀-₉Δ′'−+×=<>≠≤≥|_*^{}()[\],./\\\s-]+)/g,
  math: /[A-Za-z0-9₀-₉Δ≠≤≥|]/,
});
