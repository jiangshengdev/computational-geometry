import { mathTextParts } from "./math-text.ts";

const fontSize = (line: string) =>
  line.length > 24 ? 36 : line.length > 18 ? 40 : 48;

export const mathLineGroups = (
  lines: string[],
  highlightDifferences = false,
  activeLines = [lines.length - 1],
  visibleCount = lines.length,
) => {
  const groups: { start: number; lines: string[]; formulas: string[] }[] = [];
  lines.forEach((line, index) => {
    const parts = mathTextParts(
      line,
      highlightDifferences && activeLines.includes(index),
    );
    const formula = parts.length === 1 ? parts[0].latex : undefined;
    const previous = groups[groups.length - 1];
    if (formula !== undefined && previous?.formulas.length) {
      previous.lines.push(line);
      previous.formulas.push(formula);
    } else {
      groups.push({
        start: index,
        lines: [line],
        formulas: formula === undefined ? [] : [formula],
      });
    }
  });
  return groups.map((group) => {
    if (group.formulas.length < 2) {
      return { ...group, fontSize: fontSize(group.lines[0]), latex: undefined };
    }
    const rows = group.formulas.map((formula) => {
      const parts = formula.split(/(=|\\le |\\ge |\\ne )/);
      // A continuation without a relation starts in the expression column.
      if (parts.length === 1) return ["", parts[0]];
      const cells = [parts[0], `{}` + parts[1] + parts[2]];
      for (let i = 3; i < parts.length; i += 2) {
        cells.push("", `{}` + parts[i] + parts[i + 1]);
      }
      return cells;
    });
    const columns = Math.max(...rows.map((row) => row.length));
    const body = rows
      .map((row, index) => {
        const color = activeLines.includes(group.start + index)
          ? "#2563eb"
          : "#65758a";
        return Array.from({ length: columns }, (_, column) =>
          group.start + index >= visibleCount
            ? `\\phantom{${row[column] ?? ""}}`
            : `{\\color{${color}}${row[column] ?? ""}}`,
        ).join(" & ");
      })
      .join(String.raw` \\[0.1em] `);
    return {
      ...group,
      fontSize: Math.min(...group.lines.map(fontSize)),
      latex: `\\begin{alignedat}{${columns / 2}}${body}\\end{alignedat}`,
    };
  });
};
