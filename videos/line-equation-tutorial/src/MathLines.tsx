import { useMemo } from "react";
import { Latex } from "./Latex";
import { MathText } from "./MathText";
import { mathLineGroups, mathSpacing, type TeachingGroup } from "./math-lines";
import { objectColors, type TeachingObject } from "./teaching-emphasis";

export const MathLines = ({
  lines,
  groups,
  highlightDifferences = false,
  activeLines = [lines.length - 1],
  visibleCount = lines.length,
  fontSize = 42,
  start = 0,
  end = lines.length,
  objects = [],
  emphasis = 1,
}: {
  lines: string[];
  groups?: TeachingGroup[];
  highlightDifferences?: boolean;
  activeLines?: number[];
  visibleCount?: number;
  fontSize?: number;
  start?: number;
  end?: number;
  objects?: TeachingObject[];
  emphasis?: number;
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
                color: objectColors[objects[row.index] ?? "line"],
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
                  <span
                    data-math-cell-content
                    style={{
                      lineHeight: 0,
                      position: "relative",
                      backgroundColor: activeLines.includes(row.index)
                        ? `${objectColors[objects[row.index] ?? "line"]}${Math.round(
                            12 + 12 * emphasis,
                          )
                            .toString(16)
                            .padStart(2, "0")}`
                        : undefined,
                      borderRadius: 4,
                    }}
                  >
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
                    {activeLines.includes(row.index) ? (
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: 0,
                          bottom: -7,
                          width: `${emphasis * 100}%`,
                          height: 3,
                          backgroundColor: "currentColor",
                          borderRadius: 2,
                          pointerEvents: "none",
                        }}
                      />
                    ) : null}
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
