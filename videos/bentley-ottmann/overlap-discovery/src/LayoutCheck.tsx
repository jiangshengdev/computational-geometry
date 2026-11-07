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
    [
      ...row.phaseStarts.flatMap((start, i) => [
        start - 1,
        start,
        Math.floor(
          (start +
            (row.phaseStarts[i + 1] ?? audioLeadFrames + row.readingFrames)) /
            2,
        ),
      ]),
      ...row.captions.flatMap((c) => [
        c.start - 1,
        c.start,
        Math.floor((c.start + c.end) / 2),
        c.end - 1,
      ]),
      ...[0, 1 / 3, 2 / 3, 1].flatMap((p) => {
        const f = audioLeadFrames + Math.floor(row.readingFrames * p);
        return [f - 1, f, f + 1];
      }),
    ].filter((f) => f >= 0 && f < row.durationInFrames),
  auditPage(page, _id, visibleStep) {
    const errors: string[] = [];
    checkTeachingPage(page, visibleStep, errors);
    if (page.querySelector(".katex-error")) errors.push("Invalid math");
    if (page.querySelector("audio,video"))
      errors.push("#347 must remain silent");
    return errors;
  },
});
