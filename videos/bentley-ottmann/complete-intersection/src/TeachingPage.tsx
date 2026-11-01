import { MathLessonPage } from "../../../shared/ui/MathLessonPage";
import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { left } from "../../../shared/math/math-lines";
import { colors } from "../../colors.ts";
import { pages } from "./content";
import { MathText, Latex } from "./MathText";
import { Diagram } from "./Diagram";
import { DecisionPath } from "./DecisionPath";
import { visualAt, fps, type ReadingRow } from "./timeline";

const MathLines = createTeachingMathLines({
  pages: Object.fromEntries(
    pages.map((page) => {
      const lines = page.steps
        .flatMap((step) => step.lines)
        .map((line) =>
          /^\$[^$]+\$$/.test(line)
            ? { math: line.slice(1, -1) }
            : { text: line },
        );
      return [page.id, { lines, groups: [left(lines.length)] }];
    }),
  ),
  MathText,
  Latex,
  colorMath: (text) => text,
  lineMarks: {},
  defaultMathColor: "#172c45",
  objectColors: { current: colors.amber },
  pageRoles: Object.fromEntries(
    pages.map((page) => [page.id, "current" as const]),
  ),
  wrapText: true,
});

export function TeachingPage({
  row,
  frame,
}: {
  row: ReadingRow;
  frame: number;
}) {
  const visual = visualAt(row, frame);
  const introduced = row.page.steps
    .slice(0, row.index + 1)
    .filter((step) => step.diagram)
    .slice(-1)[0];
  const firstDiagramIndex = row.page.steps.findIndex((step) => step.diagram);
  const scene =
    introduced?.diagram ?? row.page.steps[firstDiagramIndex]?.diagram;
  const isPointBranches = row.id === "C09";
  const diagramProgress =
    firstDiagramIndex > row.index
      ? 0
      : firstDiagramIndex === row.index && row.index > 0
        ? Math.min(1, frame / (0.75 * fps))
        : 1;
  return (
    <MathLessonPage
      title={<MathText>{row.page.title}</MathText>}
      caption={<MathText>{visual.caption}</MathText>}
      diagramProgress={diagramProgress}
      diagram={
        scene && !isPointBranches ? (
          <Diagram
            scene={scene}
            focus={row.step.focus}
            progress={visual.progress}
            step={row.index + 1}
          />
        ) : undefined
      }
    >
      {isPointBranches ? (
        <div style={{ width: 1660 }}>
          <MathLines pageId={row.page.id} visibleStep={visual.visibleLines} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Diagram
              scene="point-line"
              focus="outside-line"
              progress={Math.min(1, visual.progress * 2)}
              step={1}
            />
            <div
              style={{
                visibility: visual.progress < 0.5 ? "hidden" : "visible",
              }}
            >
              <Diagram
                scene="point-line"
                focus="extension"
                progress={Math.max(0, (visual.progress - 0.5) * 2)}
                step={1}
              />
            </div>
          </div>
        </div>
      ) : row.page.id === "complete-path" ? (
        <DecisionPath step={row.index + 1} />
      ) : (
        <MathLines pageId={row.page.id} visibleStep={visual.visibleLines} />
      )}
      <div
        style={{
          position: "absolute",
          top: -32,
          right: 0,
          fontSize: 20,
          color: "#64748b",
        }}
      >
        阅读预览 · 时间暂定 · 尚未接入配音
      </div>
    </MathLessonPage>
  );
}
