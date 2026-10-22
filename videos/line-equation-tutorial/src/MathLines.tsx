import { useMemo } from "react";
import { Latex } from "./Latex";
import { MathText } from "./MathText";
import { mathLineGroups, mathSpacing, type TeachingGroup } from "./math-lines";

export const MathLines = ({
  lines,
  groups,
  highlightDifferences = false,
  activeLines = [lines.length - 1],
  visibleCount = lines.length,
  fontSize = 42,
  start = 0,
  end = lines.length,
}: {
  lines: string[];
  groups?: TeachingGroup[];
  highlightDifferences?: boolean;
  activeLines?: number[];
  visibleCount?: number;
  fontSize?: number;
  start?: number;
  end?: number;
}) => {
  const layout = useMemo(
    () =>
      mathLineGroups(
        lines,
        groups,
        highlightDifferences,
        start,
        end,
        activeLines,
      ),
    [lines, groups, highlightDifferences, start, end, activeLines],
  );
  return (
    <div
      data-math-column
      style={{ fontSize, fontWeight: 500, whiteSpace: "nowrap" }}
    >
      {layout.map((group, groupIndex) => (
        <div
          key={group.start}
          data-teaching-group={group.start}
          style={{
            display: "table",
            borderCollapse: "collapse",
            marginTop: groupIndex ? mathSpacing.group : 0,
          }}
        >
          {group.rows.map((row) => (
            <div
              key={row.index}
              data-math-row={row.index}
              style={{
                display: "table-row",
                height: group.rowHeight,
                color: activeLines.includes(row.index) ? "#2563eb" : "#65758a",
                visibility: row.index >= visibleCount ? "hidden" : "visible",
              }}
            >
              {row.cells.map((cell, column) => (
                <div
                  key={column}
                  style={{
                    display: "table-cell",
                    verticalAlign: "top",
                    lineHeight: 0,
                    textAlign:
                      group.align === "equals" && column === 0
                        ? "right"
                        : "left",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 0,
                      height:
                        mathSpacing.baseline +
                        (group.rowHeight - mathSpacing.row) / 2,
                    }}
                  />
                  <span data-math-cell-content style={{ lineHeight: 0 }}>
                    {cell.latex !== undefined ? (
                      <Latex>{cell.latex}</Latex>
                    ) : (
                      <MathText
                        highlightDifferences={
                          highlightDifferences &&
                          activeLines.includes(row.index)
                        }
                      >
                        {cell.text}
                      </MathText>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
