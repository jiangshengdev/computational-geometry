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
  type TimelineRow,
} from "./timeline";
import { TeachingPage } from "./TeachingPage";
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
    checkDiagramLabels(
      [...page.querySelectorAll<HTMLElement>("[data-diagram-label]")].filter(
        (label) => getComputedStyle(label).visibility !== "hidden",
      ),
      errors,
    );
    if (
      pageId === "opening" &&
      visibleStep < 4 &&
      [...page.querySelectorAll<HTMLElement>("[data-page-block]")].some(
        (block) =>
          getComputedStyle(block).visibility === "visible" &&
          block.textContent?.includes("求交结果应该"),
      )
    )
      errors.push("Premature question");
    if (
      pageId === "opening" &&
      /三条结果|结果(?:是|为|共有|有|共计|计为)?[：:\s]*[3三]\s*条/.test(
        page.innerText,
      )
    )
      errors.push("Opening reveals the answer");
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
