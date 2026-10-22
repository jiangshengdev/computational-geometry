import { useMemo } from "react";
import { Latex, MathText } from "./MathText";
import { mathLineGroups, mathSpacing } from "./math-lines";
import { pages } from "./storyboard";
import {
  colorMath,
  lineMarks,
  lineNumberRoles,
  objectColors,
  pageRoles,
} from "./teaching-emphasis";

export const MathLines = ({
  pageId,
  visibleStep,
}: {
  pageId: string;
  visibleStep: number;
}) => {
  const role = pageRoles[pageId];
  const theme = objectColors[role];
  const groups = useMemo(() => {
    const page = pages[pageId];
    // Apply semantic annotations before splitting so occurrence-based colors
    // cannot restart at the right-hand cell or lose a marked expression.
    return mathLineGroups(
      page.lines.map((line, index) =>
        line.math
          ? {
              math: colorMath(
                line.math,
                pageRoles[pageId],
                lineMarks[pageId]?.[index],
              ),
            }
          : line,
      ),
      page.groups,
    );
  }, [pageId]);
  return (
    <div data-math-column style={{ whiteSpace: "nowrap" }}>
      {groups.map((group, groupIndex) => (
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
              data-content-line
              data-revealed={row.index < visibleStep}
              style={{
                display: "table-row",
                height: group.rowHeight,
                visibility: row.index < visibleStep ? "visible" : "hidden",
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
                    color: cell.math ? theme : "#172c45",
                    fontSize: cell.math ? 42 : 36,
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
                    data-line-ink
                    style={{
                      position: "relative",
                      lineHeight: 0,
                      backgroundColor:
                        row.index === visibleStep - 1
                          ? `${theme}18`
                          : undefined,
                      borderRadius: 4,
                    }}
                  >
                    {cell.math ? (
                      <Latex colorize={false}>{cell.math}</Latex>
                    ) : (
                      <MathText
                        numberRoles={lineNumberRoles[pageId]?.[row.index]}
                      >
                        {cell.text ?? ""}
                      </MathText>
                    )}
                    {row.index === visibleStep - 1 ? (
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: -7,
                          height: 3,
                          backgroundColor: theme,
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
