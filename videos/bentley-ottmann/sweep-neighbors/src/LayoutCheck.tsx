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
import { shots } from "./storyboard";
import { states } from "./sweep-state";
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
  auditPage(page) {
    const errors: string[] = [];
    checkPageBounds(page, errors);
    checkDiagramLabels(
      [...page.querySelectorAll<HTMLElement>("[data-diagram-label]")].filter(
        (e) => getComputedStyle(e).visibility !== "hidden",
      ),
      errors,
    );
    const id = page
      .querySelector("[data-shot-id]")
      ?.getAttribute("data-shot-id");
    const shot = shots.find((s) => s.id === id);
    if (!shot) errors.push("Missing production shot identity");
    else {
      if (
        shot.id === "S40" &&
        /不取消|不删除|仍然保留|继续保留/.test(page.innerText)
      )
        errors.push("The thinking window reveals whether P should be removed");
      const state =
        states[
          page.querySelector("[data-state]")?.getAttribute("data-state") ??
            shot.state
        ];
      const marked = [...page.querySelectorAll("[data-intersection]")].map(
        (e) => e.getAttribute("data-intersection"),
      );
      if (marked.join() !== state.discovered.join())
        errors.push(
          "Undiscovered intersection shown or discovered point missing",
        );
      const reports = [...page.querySelectorAll("[data-result]")].map((e) =>
        e.getAttribute("data-result"),
      );
      if (reports.join() !== state.reported.join())
        errors.push("Premature or missing result");
      if (state.records >= 2) {
        const queue = [...page.querySelectorAll("[data-event-x]")].map((e) =>
          Number(e.getAttribute("data-event-x")),
        );
        if (queue.join() !== state.queue.map((e) => e.x).join())
          errors.push("Displayed queue differs from state");
      }
    }
    const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
    while (walker.nextNode())
      if (
        /[A-Za-z0-9₀-₉≠≤≥]/.test(walker.currentNode.textContent ?? "") &&
        !walker.currentNode.parentElement?.closest(".katex")
      )
        errors.push(`Math outside LaTeX: ${walker.currentNode.textContent}`);
    return errors;
  },
});
