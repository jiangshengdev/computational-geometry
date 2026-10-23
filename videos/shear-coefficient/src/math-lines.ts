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

// Self-contained counterpart of the reference tutorial's teaching-group layout.
export const mathLineGroups = (lines: Line[], groups: TeachingGroup[]) => {
  if (
    groups.some((group) => !Number.isInteger(group.count) || group.count < 1) ||
    groups.reduce((sum, group) => sum + group.count, 0) !== lines.length
  )
    throw new Error("Teaching groups must cover every line exactly once");
  let offset = 0;
  return groups.map((group) => {
    const start = offset;
    offset += group.count;
    const complete = lines.slice(start, offset);
    return {
      start,
      align: group.align,
      rowHeight: complete.some((line) => line.math?.includes("\\frac"))
        ? mathSpacing.tallRow
        : mathSpacing.row,
      rows: complete.map((line, i) => {
        if (group.align === "left") return { index: start + i, cells: [line] };
        if (!line.math)
          throw new Error("Aligned teaching group requires a formula");
        // Color annotations contain braces. Only split at the outer relation,
        // preserving each annotated expression and all subsequent equalities.
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
        if (relation < 0)
          throw new Error(`Missing outer equality: ${line.math}`);
        return {
          index: start + i,
          cells: [
            { math: line.math.slice(0, relation) },
            { math: "{}" + line.math.slice(relation) },
          ],
        };
      }),
    };
  });
};
