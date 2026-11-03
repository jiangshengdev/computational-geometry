import { createShotLayoutCheck } from "../../../shared/checks/ShotLayoutCheck";
import {
  checkPageBounds,
  checkDiagramLabels,
} from "../../../shared/checks/dom";
import {
  rows,
  visualAt,
  fps,
  audioLeadFrames,
  type TimelineRow,
} from "./timeline";
import { TeachingPage } from "./TeachingPage";

function SceneAtFrame({ row, frame }: { row: TimelineRow; frame: number }) {
  return <TeachingPage row={row} state={visualAt(row, frame)} />;
}
export const LayoutCheck = createShotLayoutCheck({
  rows,
  visualAt,
  fps,
  audioLeadFrames,
  SceneAtFrame,
  captions: Object.fromEntries(
    rows.map((row) => [
      row.id,
      row.captions.map((c) => ({
        text: c.text,
        startMs: ((c.start - audioLeadFrames) / fps) * 1000,
        endMs: ((c.end - audioLeadFrames) / fps) * 1000,
        timestampMs: null,
        confidence: null,
      })),
    ]),
  ),
  extraFrames: (row) =>
    row.gestures.flatMap((g) => [
      g.start - 1,
      g.start,
      Math.floor((g.start + g.end) / 2),
      g.end - 1,
      g.end,
    ]),
  auditPage(page, _pageId, visibleStep) {
    const errors: string[] = [];
    checkPageBounds(page, errors);
    checkDiagramLabels(
      [...page.querySelectorAll<HTMLElement>("[data-diagram-label]")],
      errors,
    );
    const shown = [
      ...page.querySelectorAll<HTMLElement>("[data-content-line]"),
    ].filter((line) => getComputedStyle(line).visibility !== "hidden");
    if (shown.length !== visibleStep)
      errors.push("Missing retained teaching line or premature reveal");
    if (page.querySelector(".katex-error")) errors.push("Invalid math");
    if (page.querySelector("audio,video"))
      errors.push("Visual-stage composition must be silent");
    return errors;
  },
});
