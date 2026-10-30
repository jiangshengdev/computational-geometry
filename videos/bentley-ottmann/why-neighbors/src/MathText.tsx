import { createMathText } from "../../../shared/ui/MathText";
import { Fragment } from "react";

export const teachingColors = {
  blue: "#2878a0",
  red: "#c25959",
  green: "#278878",
  difference: "#8055a0",
  attention: "#b45309",
};

// Match whole quantities before symbols, without recoloring generated LaTeX.
// Endpoint values keep their colors through expansion and substitution.
const quantities: Record<string, string> = {
  "d(u)": teachingColors.blue,
  "d(v)": teachingColors.red,
  "\\alpha u+\\beta": teachingColors.blue,
  "\\alpha v+\\beta": teachingColors.red,
  "d(v)-d(u)": teachingColors.difference,
  "\\alpha v-\\alpha u": teachingColors.difference,
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
  const pattern = new RegExp(
    `${terms.map(escapePattern).join("|")}|[ymb]_[ACUVW](?:\\([^()]*\\))?|(?<![A-Za-z\\\\])[ACUVW](?:_\\*)?(?![A-Za-z])|\\\\[A-Za-z]+`,
    "g",
  );
  return text.replace(pattern, (term) => {
    const object = term.match(/^(?:[ymb]_)?([ACUVW])(?:_|\(|$)/)?.[1];
    const color =
      quantities[term] ??
      (object
        ? object === "A" || object === "U"
          ? teachingColors.blue
          : object === "C" || object === "V"
            ? teachingColors.red
            : teachingColors.green
        : marks.includes(term)
          ? teachingColors.attention
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
