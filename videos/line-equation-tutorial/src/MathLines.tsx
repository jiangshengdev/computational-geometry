import { useMemo } from "react";
import { Latex } from "./Latex";
import { MathText } from "./MathText";
import { mathLineGroups } from "./math-lines";

export const MathLines = ({
  lines,
  highlightDifferences = false,
}: {
  lines: string[];
  highlightDifferences?: boolean;
}) => {
  const groups = useMemo(
    () => mathLineGroups(lines, highlightDifferences),
    [lines, highlightDifferences],
  );
  return (
    <>
      {groups.map((group) => (
        <div
          key={group.start}
          style={{
            fontSize: group.fontSize,
            lineHeight: 1.65,
            color: group.start === lines.length - 1 ? "#2563eb" : "#172c45",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {group.latex === undefined ? (
            <MathText highlightDifferences={highlightDifferences}>
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
