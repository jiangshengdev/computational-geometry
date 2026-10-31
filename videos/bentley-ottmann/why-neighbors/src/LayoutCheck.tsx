import { createShotLayoutCheck } from "../../../shared/checks/ShotLayoutCheck";
import {
  checkPageBounds,
  checkDiagramLabels,
  contains,
} from "../../../shared/checks/dom";
import { timelineFor, visualAt, fps, type TimelineRow } from "./timeline";
import { TeachingPage } from "./TeachingPage";
import { pages } from "./lesson";
function SceneAtFrame({ row, frame }: { row: TimelineRow; frame: number }) {
  return (
    <div data-shot-id={row.id}>
      <TeachingPage shot={row} {...visualAt(row, frame)} />
    </div>
  );
}
const rows = timelineFor();
export const LayoutCheck = createShotLayoutCheck({
  rows: rows.map((row) => ({ ...row, revealMs: 0 })),
  visualAt,
  fps,
  audioLeadFrames: 0,
  captions: Object.fromEntries(rows.map((row) => [row.id, row.captions])),
  SceneAtFrame,
  extraFrames: (row) => [
    ...row.diagramCues.flatMap((cue) => [
      Math.ceil((cue.start * fps) / 1000) - 1,
      Math.ceil((cue.start * fps) / 1000),
      Math.floor(((cue.start + cue.end) * fps) / 2000),
      Math.ceil((cue.end * fps) / 1000),
    ]),
    ...row.stages.flatMap((stage) => [
      Math.floor((stage.speechStartMs * fps) / 1000),
      Math.ceil((stage.speechStartMs * fps) / 1000),
      Math.floor(((stage.speechStartMs + stage.speechEndMs) * fps) / 2000),
      Math.ceil((stage.speechEndMs * fps) / 1000) - 1,
      Math.ceil((stage.speechEndMs * fps) / 1000),
    ]),
  ],
  auditPage(page, pageId, visibleStep) {
    const errors: string[] = [];
    checkPageBounds(page, errors);
    const visible = (node: Element) =>
      getComputedStyle(node).visibility !== "hidden";
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
    const main = page.querySelector<HTMLElement>("[data-main-content]")!;
    const aside = page.querySelector<HTMLElement>("aside");
    if (
      aside &&
      aside.getBoundingClientRect().bottom > main.getBoundingClientRect().top
    )
      errors.push("References overlap the derivation");
    for (const reference of page.querySelectorAll<HTMLElement>(
      "[data-reference]",
    )) {
      if (
        !contains(
          aside!.getBoundingClientRect(),
          reference.getBoundingClientRect(),
        )
      )
        errors.push("Reference not fully reachable");
    }
    if (
      page.querySelectorAll("[data-reference]").length !==
      pages[pageId].basis.length
    )
      errors.push("Missing reference");
    if (page.querySelector(".katex-error"))
      errors.push("Invalid mathematical notation");
    if (page.querySelector("audio"))
      errors.push("Layout inspection must remain silent");
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
