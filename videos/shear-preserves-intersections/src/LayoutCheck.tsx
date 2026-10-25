import { createShotLayoutCheck } from "../../shared/checks/ShotLayoutCheck";
import {
  checkPageBounds,
  checkDiagramLabels,
  contains,
} from "../../shared/checks/dom";
import {
  timelineFor,
  visualAt,
  fps,
  audioLeadFrames,
  type TimelineRow,
} from "./timeline";
import { TeachingPage } from "./TeachingPage";
import { pages } from "./storyboard";
import captions from "./captions.json";
function SceneAtFrame({ row, frame }: { row: TimelineRow; frame: number }) {
  return <TeachingPage shot={row} {...visualAt(row, frame)} />;
}
export const LayoutCheck = createShotLayoutCheck({
  rows: timelineFor(),
  visualAt,
  fps,
  audioLeadFrames,
  captions,
  SceneAtFrame,
  auditPage(page, pageId, visibleStep) {
    const errors: string[] = [];
    checkPageBounds(page, errors);
    const lines = [
      ...page.querySelectorAll<HTMLElement>("[data-content-line]"),
    ];
    lines.forEach((line, i) => {
      if ((getComputedStyle(line).visibility === "visible") !== i < visibleStep)
        errors.push(`Missing or premature row ${i + 1}`);
    });
    const column = page.querySelector<HTMLElement>("[data-main-column]")!;
    for (const ink of column.querySelectorAll<HTMLElement>("[data-line-ink]")) {
      if (
        !contains(column.getBoundingClientRect(), ink.getBoundingClientRect())
      )
        errors.push(`Column overflow: ${ink.textContent}`);
    }
    for (const basis of pages[pageId].basis) {
      if (!page.querySelector(`[data-basis-from="${basis.from}"] .katex`))
        errors.push(`Missing cross-page basis: ${basis.from}`);
    }
    checkDiagramLabels(
      [...page.querySelectorAll<HTMLElement>("[data-diagram-label]")],
      errors,
    );
    const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (
        /[A-Za-z0-9₀-₉≠≤≥]/.test(walker.currentNode.textContent ?? "") &&
        !walker.currentNode.parentElement?.closest(".katex")
      )
        errors.push(`Math outside LaTeX: ${walker.currentNode.textContent}`);
    }
    return errors;
  },
});
