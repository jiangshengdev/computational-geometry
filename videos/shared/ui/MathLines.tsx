import type { CSSProperties, ReactNode } from "react";
import { mathSpacing, type TeachingGroup } from "../math/math-lines";

export function MathLines<Cell>({
  groups,
  style,
  groupStyle,
  rowProps,
  cellStyle,
  renderCell,
}: {
  groups: {
    start: number;
    align: TeachingGroup["align"];
    rowHeight: number;
    rows: { index: number; cells: Cell[] }[];
  }[];
  style?: CSSProperties;
  groupStyle?: CSSProperties;
  rowProps: (index: number) => {
    style?: CSSProperties;
    "data-content-line"?: boolean;
    "data-revealed"?: boolean;
    "data-math-row"?: number;
  };
  cellStyle?: (cell: Cell) => CSSProperties;
  renderCell: (cell: Cell, index: number) => ReactNode;
}) {
  return (
    <div data-math-column style={{ whiteSpace: "nowrap", ...style }}>
      {groups.map((group, groupIndex) => (
        <div
          key={group.start}
          data-teaching-group={group.start}
          style={{
            display: "table",
            borderCollapse: "collapse",
            marginTop: groupIndex ? mathSpacing.group : 0,
            ...groupStyle,
          }}
        >
          {group.rows.map((row) => {
            const props = rowProps(row.index);
            return (
              <div
                key={row.index}
                {...props}
                style={{
                  display: "table-row",
                  height: group.rowHeight,
                  ...props.style,
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
                      ...cellStyle?.(cell),
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
                    {renderCell(cell, row.index)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
