import { createMathText } from "../../shared/ui/MathText";
import { colorMath } from "./teaching-emphasis";

export const { TeachingColors, Latex, MathText, SvgMathText } = createMathText(
  colorMath,
  {
    split: /([A-Za-z0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹′'−+×=<>≤≥|_^{}()[\],./\s-]+)/g,
    math: /[A-Za-z0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹≤≥|]/,
  },
);
