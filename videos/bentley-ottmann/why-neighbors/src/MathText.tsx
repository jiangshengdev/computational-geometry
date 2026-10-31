import { colors, proofColors } from "../../colors.ts";
import { createMathText } from "../../../shared/ui/MathText";
import { Fragment } from "react";

// Match whole quantities before symbols, without recoloring generated LaTeX.
// Endpoint values keep their colors through expansion and substitution.
const quantities: Record<string, string> = {
  "d(u)": colors.blue,
  "d(v)": colors.orange,
  "\\alpha u+\\beta": colors.blue,
  "\\alpha v+\\beta": colors.orange,
  "d(v)-d(u)": colors.violet,
  "\\alpha v-\\alpha u": colors.violet,
};
const escapePattern = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const colorMath = (
  text: string,
  _role?: string,
  marks: string[] = [],
) => {
  const terms = [
    ...new Set([
      ...Object.keys(quantities),
      ...marks.filter(
        (mark) =>
          !Object.keys(quantities).some((quantity) => mark.includes(quantity)),
      ),
    ]),
  ].sort((a, b) => b.length - a.length);
  // Consume a LaTeX row break whole so its second slash cannot absorb the
  // next quantity's first letter as a command (for example, \\y or \\d).
  const pattern = new RegExp(
    `${terms.map(escapePattern).join("|")}|[ymb]_[ACUVW](?:\\([^()]*\\))?|(?<![A-Za-z\\\\])[ACUVW](?:_\\*)?(?![A-Za-z])|\\\\(?:\\\\|[A-Za-z]+)`,
    "g",
  );
  return text.replace(pattern, (term) => {
    const object = term.match(/^(?:[ymb]_)?([ACUVW])(?:_|\(|$)/)?.[1];
    const color =
      quantities[term] ??
      (object
        ? proofColors[object as keyof typeof proofColors]
        : marks.includes(term)
          ? colors.amber
          : undefined);
    // Relations remain outside color groups for equation alignment. Keep
    // arithmetic operators neutral even within a colored compound quantity.
    return color
      ? `{\\color{${color}}${term.replace(/[+\-=]/g, (operator) => `\\${operator === "=" ? "mathrel" : "mathbin"}{\\color{#172c45}${operator}}`)}}`
      : term;
  });
};
const {
  MathText: InlineMathText,
  Latex,
  SvgMathText,
} = createMathText(colorMath, {
  split: /([A-Za-z0-9₀-₉′'−+×=<>≠≤≥|_*^{}()[\],./\\\s-]+)/g,
  math: /[A-Za-z0-9₀-₉≠≤≥|]/,
});
export { Latex, SvgMathText };

export function MathText(props: Parameters<typeof InlineMathText>[0]) {
  return (
    <>
      {String(props.children)
        .split("\n")
        .map((part, index) => (
          <Fragment key={index}>
            {index ? <br /> : null}
            <InlineMathText {...props}>{part}</InlineMathText>
          </Fragment>
        ))}
    </>
  );
}
