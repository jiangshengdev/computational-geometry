import { MathLines as MathTable } from "../../shared/ui/MathLines";
import { useMemo } from "react";
import { Latex } from "./Latex";
import { MathText } from "./MathText";
import { mathLineGroups, type TeachingGroup } from "./math-lines";
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
    <MathTable
      groups={layout}
      style={{ fontSize, fontWeight: 500 }}
      rowProps={(index) => ({
        "data-math-row": index,
        style: {
          color: objectColors[objects[index] ?? "line"],
          visibility: index >= visibleCount ? "hidden" : "visible",
        },
      })}
      renderCell={(cell, index) => (
        <span
          data-math-cell-content
          style={{
            lineHeight: 0,
            position: "relative",
            backgroundColor: activeLines.includes(index)
              ? `${objectColors[objects[index] ?? "line"]}${Math.round(
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
                highlightDifferences && activeLines.includes(index)
              }
            >
              {cell.text}
            </MathText>
          )}
          {activeLines.includes(index) ? (
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
      )}
    />
  );
};
