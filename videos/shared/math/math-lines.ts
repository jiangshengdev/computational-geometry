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

type Line = { math?: string; text?: string };

export const mathLineGroups = (lines: Line[], groups: TeachingGroup[]) => {
  return groupLines(
    lines,
    groups,
    (line, index, align) => {
      if (align === "left") return [line];
      if (!line.math)
        throw new Error("Aligned teaching group requires a formula");
      let depth = 0;
      let relation = -1;
      for (let j = 0; j < line.math.length; j++) {
        const char = line.math[j];
        if (char === "{") depth++;
        if (char === "}") depth--;
        if (char === "=" && depth === 0) {
          relation = j;
          break;
        }
      }
      if (relation < 0) throw new Error(`Missing outer equality: ${line.math}`);
      return [
        { math: line.math.slice(0, relation) },
        { math: "{}" + line.math.slice(relation) },
      ];
    },
    (line) => !!line.math?.includes("\\frac"),
  );
};

export function groupLines<Line, Cell>(
  lines: Line[],
  groups: TeachingGroup[],
  cells: (line: Line, index: number, align: TeachingGroup["align"]) => Cell[],
  tall: (line: Line) => boolean,
  start = 0,
  end = lines.length,
) {
  if (
    groups.some((group) => !Number.isInteger(group.count) || group.count < 1) ||
    groups.reduce((sum, group) => sum + group.count, 0) !== lines.length
  )
    throw new Error("Teaching groups must cover every line exactly once");
  let offset = 0;
  return groups.flatMap((group) => {
    const first = offset;
    offset += group.count;
    const complete = lines.slice(first, offset);
    const rows = complete
      .map((line, index) => ({
        index: first + index,
        cells: cells(line, first + index, group.align),
      }))
      .filter((row) => row.index >= start && row.index < end);
    return rows.length
      ? [
          {
            start: rows[0].index,
            align: group.align,
            rowHeight: complete.some(tall)
              ? mathSpacing.tallRow
              : mathSpacing.row,
            rows,
          },
        ]
      : [];
  });
}
