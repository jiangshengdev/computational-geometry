import { createShotLayoutCheck } from "../../../shared/checks/ShotLayoutCheck";
import {
  checkPageBounds,
  checkDiagramLabels,
  contains,
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
  return <TeachingPage shot={row} {...visualAt(row, frame)} />;
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
      [start, start + (end - start) * 0.25, (start + end) / 2, end].map(
        (ms) => audioLeadFrames + Math.ceil((ms * fps) / 1000),
      ),
    ),
  auditPage(page, _pageId, visibleStep) {
    const errors: string[] = [];
    checkPageBounds(page, errors);
    const diagram = page.querySelector<HTMLElement>("[data-pairing-diagram]");
    if (diagram && getComputedStyle(diagram).visibility !== "hidden") {
      const bounds = diagram.getBoundingClientRect();
      for (const ink of page.querySelectorAll<HTMLElement>("[data-line-ink]")) {
        if (getComputedStyle(ink).visibility === "hidden") continue;
        const rect = ink.getBoundingClientRect();
        if (
          Math.min(rect.right, bounds.right) >
            Math.max(rect.left, bounds.left) &&
          Math.min(rect.bottom, bounds.bottom) > Math.max(rect.top, bounds.top)
        )
          errors.push("Pairing diagram overlaps teaching text");
      }
      for (const label of diagram.querySelectorAll<HTMLElement>(".katex")) {
        if (
          getComputedStyle(label).visibility !== "hidden" &&
          !contains(bounds, label.getBoundingClientRect())
        )
          errors.push(`Pairing label overflow: ${label.textContent}`);
        const cell = label.closest<HTMLElement>("[data-choice-cell]");
        if (
          cell &&
          getComputedStyle(label).visibility !== "hidden" &&
          !contains(cell.getBoundingClientRect(), label.getBoundingClientRect())
        )
          errors.push(`Choice cell overflow: ${label.textContent}`);
      }
    }
    const visibleInk: DOMRect[] = [];
    for (const column of page.querySelectorAll<HTMLElement>(
      "[data-teaching-column]",
    )) {
      const bounds = column.getBoundingClientRect();
      for (const ink of column.querySelectorAll<HTMLElement>(
        "[data-line-ink]",
      )) {
        const rect = ink.getBoundingClientRect();
        if (!contains(bounds, rect))
          errors.push(`Column overflow: ${ink.textContent}`);
        if (getComputedStyle(ink).visibility !== "hidden") {
          if (
            visibleInk.some(
              (other) =>
                Math.min(rect.right, other.right) >
                  Math.max(rect.left, other.left) &&
                Math.min(rect.bottom, other.bottom) >
                  Math.max(rect.top, other.top),
            )
          )
            errors.push("Teaching columns overlap during movement");
          visibleInk.push(rect);
        }
      }
    }
    const enumeration = page.querySelector<HTMLElement>("[data-enumeration]");
    if (
      enumeration &&
      (getComputedStyle(enumeration).visibility === "visible") !==
        visibleStep >= 3
    )
      errors.push("Enumeration comparison revealed at wrong step");
    checkDiagramLabels(
      [...page.querySelectorAll<HTMLElement>("[data-diagram-label]")].filter(
        (label) => getComputedStyle(label).visibility !== "hidden",
      ),
      errors,
    );
    [...page.querySelectorAll<HTMLElement>("[data-content-line]")].forEach(
      (line, i) => {
        if (
          (getComputedStyle(line).visibility === "visible") !==
          i < visibleStep
        )
          errors.push(`Incorrect reveal: ${i + 1}`);
      },
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
