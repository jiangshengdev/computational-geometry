import { mathTextParts } from "./math-text.ts";

// Teaching groups are authored, never inferred from punctuation or whitespace.
export type TeachingGroup = { count: number; align: "left" | "equals" };
export const left = (count: number): TeachingGroup => ({
  count,
  align: "left",
});
export const equals = (count: number): TeachingGroup => ({
  count,
  align: "equals",
});
export const mathSpacing = { row: 72, tallRow: 96, group: 24, baseline: 52 };

type Cell = { text: string; latex?: never } | { latex: string; text?: never };
export const mathLineGroups = (
  lines: string[],
  groups: TeachingGroup[] = [left(lines.length)],
  highlightDifferences = false,
  start = 0,
  end = lines.length,
  activeLines = [lines.length - 1],
) => {
  if (
    groups.some((group) => !Number.isInteger(group.count) || group.count < 1) ||
    groups.reduce((sum, group) => sum + group.count, 0) !== lines.length
  ) {
    throw new Error("Teaching groups must cover every line exactly once");
  }
  let offset = 0;
  return groups.flatMap((group) => {
    const first = offset;
    offset += group.count;
    const rows = lines.slice(first, offset).map((text, index) => {
      const parts = mathTextParts(
        text,
        highlightDifferences && activeLines.includes(first + index),
      );
      let cells: Cell[] = [{ text }];
      if (group.align === "equals") {
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
      return { index: first + index, cells };
    });
    // The complete group determines row height, including unrevealed lines.
    const tall = lines
      .slice(first, offset)
      .some((line) =>
        mathTextParts(line).some((part) => part.latex?.includes("\\frac")),
      );
    const columnRows = rows.filter(
      (row) => row.index >= start && row.index < end,
    );
    return columnRows.length
      ? [
          {
            start: columnRows[0].index,
            align: group.align,
            rowHeight: tall ? mathSpacing.tallRow : mathSpacing.row,
            rows: columnRows,
          },
        ]
      : [];
  });
};
