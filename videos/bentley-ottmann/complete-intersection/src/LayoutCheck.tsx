import {
  createShotLayoutCheck,
  captionsFromFrames,
} from "../../../shared/checks/ShotLayoutCheck";
import { checkTeachingPage } from "../../../shared/checks/dom";
import { rows, visualAt, fps, audioLeadFrames } from "./timeline";
import { TeachingPage } from "./TeachingPage";
import type { TimelineRow } from "./timeline";
function SceneAtFrame({ row, frame }: { row: TimelineRow; frame: number }) {
  return <TeachingPage row={row} {...visualAt(row, frame)} />;
}
export const LayoutCheck = createShotLayoutCheck({
  rows,
  visualAt,
  fps,
  audioLeadFrames,
  SceneAtFrame,
  captions: captionsFromFrames(rows, fps, audioLeadFrames),
  extraFrames: (r) =>
    r.captions.flatMap((c) => [
      c.start - 1,
      c.start,
      Math.floor(c.start + (c.end - c.start) * 0.3),
      Math.floor((c.start + c.end) / 2),
      c.end - 1,
      c.end,
      ...c.gestures.flatMap((g) => [
        g.start - 1,
        g.start,
        Math.floor((g.start + g.end) / 2),
        g.end - 1,
        g.end,
      ]),
    ]),
  auditPage(page, pageId, visibleStep) {
    const errors: string[] = [];
    checkTeachingPage(
      page,
      visibleStep,
      errors,
      "Missing retained teaching row or premature reveal",
    );
    if (page.querySelector("audio,video"))
      errors.push("Visual-stage inspection must remain silent");
    if (page.querySelector(".katex-error"))
      errors.push("Invalid mathematical notation");
    if (
      pageId === "whole-path" &&
      page.querySelectorAll("[data-path-level]").length !== visibleStep
    )
      errors.push("Incomplete or premature judgment path");
    return errors;
  },
});
