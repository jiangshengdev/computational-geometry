import { createMathText } from "../../shared/ui/MathText";
export const colorMath = (text: string) => text;
export const { MathText, Latex, SvgMathText } = createMathText(colorMath, {
  split: /([A-Za-z0-9₀-₉′'−+×=<>≠≤≥|_^{}()[\],./\s-]+)/g,
  math: /[A-Za-z0-9₀-₉≠≤≥|]/,
});
