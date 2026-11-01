import { createMathText } from "../../../shared/ui/MathText";

// Authored math uses explicit delimiters; prose stays in the Chinese text flow.
export const { MathText, Latex, SvgMathText } = createMathText(
  (text: string) => text,
  { split: /\$([^$]+)\$/g, math: /[A-Za-z0-9\\]/ },
);
