import { MathLines as MathTable } from "./MathLines";
import { useMemo } from "react";
import { mathLineGroups } from "../math/math-lines";
import type { ComponentType } from "react";
import type { TeachingGroup } from "../math/math-lines";

export function createTeachingMathLines<Role extends string, Mark>({
  pages,
  colorMath,
  lineMarks,
  lineNumberRoles = {},
  objectColors,
  pageRoles,
  Latex,
  MathText,
  defaultMathColor,
}: {
  pages: Record<
    string,
    { lines: { math?: string; text?: string }[]; groups: TeachingGroup[] }
  >;
  colorMath: (text: string, role?: Role, marks?: Mark[]) => string;
  lineMarks: Record<string, Mark[][]>;
  lineNumberRoles?: Record<string, Record<number, (Role | undefined)[]>>;
  objectColors: Record<Role, string>;
  pageRoles: Record<string, Role>;
  Latex: ComponentType<{ children: string; colorize?: boolean }>;
  MathText: ComponentType<{
    children: string;
    numberRoles?: (Role | undefined)[];
  }>;
  defaultMathColor?: string;
}) {
  const MathLines = ({
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
      <MathTable
        groups={groups}
        rowProps={(index) => ({
          "data-content-line": true,
          "data-revealed": index < visibleStep,
          style: { visibility: index < visibleStep ? "visible" : "hidden" },
        })}
        cellStyle={(cell) => ({
          color: cell.math ? (defaultMathColor ?? theme) : "#172c45",
          fontSize: cell.math ? 42 : 36,
        })}
        renderCell={(cell, index) => (
          <span
            data-line-ink
            style={{
              position: "relative",
              lineHeight: 0,
              backgroundColor:
                index === visibleStep - 1 ? `${theme}18` : undefined,
              borderRadius: 4,
            }}
          >
            {cell.math ? (
              <Latex colorize={false}>{cell.math}</Latex>
            ) : (
              <MathText numberRoles={lineNumberRoles[pageId]?.[index]}>
                {cell.text ?? ""}
              </MathText>
            )}
            {index === visibleStep - 1 ? (
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
        )}
      />
    );
  };

  return MathLines;
}
