import { mathTextParts } from "./math-text.ts";

import {
  groupLines,
  left,
  type TeachingGroup,
} from "../../shared/math/math-lines.ts";
export {
  left,
  equals,
  mathSpacing,
  type TeachingGroup,
} from "../../shared/math/math-lines.ts";

type Cell = { text: string; latex?: never } | { latex: string; text?: never };
export const mathLineGroups = (
  lines: string[],
  groups: TeachingGroup[] = [left(lines.length)],
  highlightDifferences = false,
  start = 0,
  end = lines.length,
  activeLines = [lines.length - 1],
) => {
  return groupLines<string, Cell>(
    lines,
    groups,
    (text, index, align) => {
      const parts = mathTextParts(
        text,
        highlightDifferences && activeLines.includes(index),
      );
      let cells: Cell[] = [{ text }];
      if (align === "equals") {
        if (parts.length !== 1 || parts[0].latex === undefined) {
          throw new Error(`Aligned teaching group requires a formula: ${text}`);
        }
        const formula = parts[0].latex;
        const relation = formula.indexOf("=");
        cells =
          relation < 0
            ? [{ latex: "" }, { latex: formula }]
            : [
                { latex: formula.slice(0, relation) },
                { latex: `{}` + formula.slice(relation) },
              ];
      }
      return cells;
    },
    (line) =>
      mathTextParts(line).some((part) => part.latex?.includes("\\frac")),
    start,
    end,
  );
};
