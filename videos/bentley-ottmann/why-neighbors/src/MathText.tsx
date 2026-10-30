import { createMathText } from "../../../shared/ui/MathText";
export const colorMath = (text: string, _role?: string, marks: string[] = []) =>
  marks.reduce(
    (value, term) => value.split(term).join(`{\\color{#b45309}${term}}`),
    text,
  );
export const { MathText, Latex, SvgMathText } = createMathText(colorMath, {
  split: /([A-Za-z0-9₀-₉′'−+×=<>≠≤≥|_*^{}()[\],./\\\s-]+)/g,
  math: /[A-Za-z0-9₀-₉≠≤≥|]/,
});
