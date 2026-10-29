import { createShotLayoutCheck } from "../../../shared/checks/ShotLayoutCheck";
import {
  checkPageBounds,
  checkDiagramLabels,
} from "../../../shared/checks/dom";
import {
  timelineFor,
  visualAt,
  fps,
  audioLeadFrames,
  lessonCues,
  type TimelineRow,
} from "./timeline";
import { TeachingPage } from "./TeachingPage";
import captions from "./captions.json";
function SceneAtFrame({ row, frame }: { row: TimelineRow; frame: number }) {
  return (
    <div data-shot-id={row.id}>
      <TeachingPage shot={row} {...visualAt(row, frame)} />
    </div>
  );
}
export const LayoutCheck = createShotLayoutCheck({
  rows: timelineFor(),
  visualAt,
  fps,
  audioLeadFrames,
  captions,
  SceneAtFrame,
  extraFrames: (row) =>
    (lessonCues.timings[row.id] ?? []).flatMap(({ start, end }) =>
      [start, (start + end) / 2, end].map(
        (ms) => audioLeadFrames + Math.ceil((ms * fps) / 1000),
      ),
    ),
  auditPage(page, pageId, visibleStep) {
    const errors: string[] = [];
    checkPageBounds(page, errors);
    const visible = (element: Element) =>
      getComputedStyle(element).visibility !== "hidden";
    checkDiagramLabels(
      [...page.querySelectorAll<HTMLElement>("[data-diagram-label]")].filter(
        visible,
      ),
      errors,
    );
    const revealed = [...page.querySelectorAll("[data-content-line]")].filter(
      visible,
    );
    if (revealed.length !== visibleStep)
      errors.push("Missing retained row or premature teaching row");
    if (pageId === "between" && /三线共点|与条件矛盾/.test(page.innerText))
      errors.push("Thinking scene reveals contradiction");
    if (
      pageId === "earliest" &&
      /登记并保留|此前事件已正确处理/.test(page.innerText)
    )
      errors.push("Earliest-missed question reveals its answer");
    const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (
        /[A-Za-z0-9₀-₉≠≤≥]/.test(walker.currentNode.textContent ?? "") &&
        !walker.currentNode.parentElement?.closest(".katex")
      )
        errors.push("Math outside LaTeX: " + walker.currentNode.textContent);
    }
    return errors;
  },
});
