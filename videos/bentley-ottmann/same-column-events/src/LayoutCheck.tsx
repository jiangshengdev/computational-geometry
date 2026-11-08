import {
  createShotLayoutCheck,
  captionsFromFrames,
} from "../../../shared/checks/ShotLayoutCheck";
import { checkTeachingPage } from "../../../shared/checks/dom";
import {
  rows,
  visualAt,
  fps,
  audioLeadFrames,
  motionStart,
  motionEnd,
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
  captions: captionsFromFrames(rows, fps, audioLeadFrames),
  extraFrames: (row) =>
    [
      29,
      30,
      ...[undefined, ...(row.id === "SC35" ? ["紫色退出"] : [])].flatMap(
        (anchor) => {
          const start = motionStart(row, anchor),
            end = motionEnd(row, anchor);
          return [start - 1, start, Math.floor((start + end) / 2), end];
        },
      ),
      ...row.spoken.flatMap((cue) => [cue.start - 1, cue.start, cue.end]),
      ...[0.25, 0.5, 0.75, 1].map(
        (p) => audioLeadFrames + Math.floor(row.speechFrames * p),
      ),
    ].filter((f) => f < row.durationInFrames),
  auditPage(page, _id, visibleStep) {
    const errors: string[] = [];
    checkTeachingPage(page, visibleStep, errors);
    for (const svg of page.querySelectorAll("svg")) {
      if (
        svg.querySelector("foreignObject") &&
        (svg.viewBox.baseVal.width !== svg.width.baseVal.value ||
          svg.viewBox.baseVal.height !== svg.height.baseVal.value)
      )
        errors.push("SVG math labels require a 1:1 viewport");
    }
    if (page.querySelector(".katex-error")) errors.push("Invalid math");
    if (page.querySelector("audio,video"))
      errors.push("Silent inspection must not play media");
    return errors;
  },
});
