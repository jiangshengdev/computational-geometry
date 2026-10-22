import { renderToString } from "katex";
import { useMemo, type CSSProperties } from "react";
import "katex/dist/katex.min.css";
import { colorObjectNotation } from "./teaching-emphasis";

/** Pass LaTeX source without $ delimiters, preferably using String.raw. */
export const Latex = ({
  children,
  displayMode = false,
  style,
}: {
  children: string;
  displayMode?: boolean;
  style?: CSSProperties;
}) => {
  const html = useMemo(
    () =>
      renderToString(colorObjectNotation(children), {
        displayMode,
        throwOnError: true,
        strict: "error",
        trust: false,
        output: "htmlAndMathml",
      }),
    [children, displayMode],
  );
  const Tag = displayMode ? "div" : "span";
  return <Tag style={style} dangerouslySetInnerHTML={{ __html: html }} />;
};
