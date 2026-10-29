import { createMathText } from "../../../shared/ui/MathText";
export const { MathText, Latex, SvgMathText } = createMathText(
  (text: string) => text,
  {
    split: /([A-Za-z0-9₀-₉′'−+×=<>≠≤≥|_^{}()[\],./\\\s-]+)/g,
    math: /[A-Za-z0-9₀-₉≠≤≥|]/,
  },
);
