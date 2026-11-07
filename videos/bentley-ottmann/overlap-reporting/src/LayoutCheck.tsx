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
    [...row.captions, ...row.operations].flatMap((c) => [
      Math.max(0, c.start - 1),
      c.start,
      c.start + 1,
      Math.floor((c.start + c.end) / 2),
      c.end - 1,
      c.end,
    ]),
  auditPage(page, _id, visibleStep) {
    const errors: string[] = [];
    checkTeachingPage(page, visibleStep, errors);
    if (page.querySelector(".katex-error")) errors.push("Invalid math");
    if (page.querySelector("audio,video"))
      errors.push("Visual-stage scene must remain silent");
    return errors;
  },
});
