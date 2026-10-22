import { useMemo } from "react";
import { Latex } from "./Latex";
import { MathText } from "./MathText";
import { mathLineGroups } from "./math-lines";

export const MathLines = ({
  lines,
  highlightDifferences = false,
  activeLines = [lines.length - 1],
  visibleCount = lines.length,
  fontSize,
}: {
  lines: string[];
  highlightDifferences?: boolean;
  activeLines?: number[];
  visibleCount?: number;
  fontSize?: number;
}) => {
  const groups = useMemo(
    () =>
      mathLineGroups(lines, highlightDifferences, activeLines, visibleCount),
    [lines, highlightDifferences, activeLines, visibleCount],
  );
  return (
    <>
      {groups.map((group) => (
        <div
          key={group.start}
          style={{
            fontSize: fontSize ?? group.fontSize,
            lineHeight: 1.5,
            color: activeLines.includes(group.start) ? "#2563eb" : "#65758a",
            visibility: group.start >= visibleCount ? "hidden" : "visible",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {group.latex === undefined ? (
            <MathText
              highlightDifferences={
                highlightDifferences && activeLines.includes(group.start)
              }
            >
              {group.lines[0]}
            </MathText>
          ) : (
            <Latex>{group.latex}</Latex>
          )}
        </div>
      ))}
    </>
  );
};
