import { createMathText } from "../../shared/ui/MathText";
export const colorMath = (text: string) => text;
export const { Latex, MathText, SvgMathText } = createMathText(colorMath, {
  split: /([A-Za-z0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹′'−+×=<>≤≥|_^{}()[\],./\s-]+)/g,
  math: /[A-Za-z0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹≤≥|]/,
});
