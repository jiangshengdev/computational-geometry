import {
  createShotLayoutCheck,
  captionsFromFrames,
} from "../../../shared/checks/ShotLayoutCheck";
import { checkTeachingPage } from "../../../shared/checks/dom";
import {
  rows,
  visualAt,
  motionCue,
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
      ...row.captions.flatMap((c) => [
        c.start - 1,
        c.start,
        Math.floor((c.start + c.end) / 2),
        c.end,
      ]),
      ...row.spoken.flatMap((phrase) => [
        phrase.start - 1,
        phrase.start,
        Math.floor((phrase.start + phrase.end) / 2),
        phrase.end,
        phrase.end + 1,
      ]),
      motionCue(row).start - 1,
      motionCue(row).start,
      motionCue(row).end,
      ...[0.15, 0.35, 0.65, 0.85].map((p) =>
        Math.floor(
          motionCue(row).start +
            p * (motionCue(row).end - motionCue(row).start),
        ),
      ),
    ].filter((frame) => frame >= 0 && frame < row.durationInFrames),
  auditPage(page, _id, visibleStep) {
    const errors: string[] = [];
    checkTeachingPage(page, visibleStep, errors);
    for (const svg of page.querySelectorAll<SVGSVGElement>(
      "svg[data-geometry-inputs]",
    )) {
      if (
        svg.viewBox.baseVal.width !== svg.width.baseVal.value ||
        svg.viewBox.baseVal.height !== svg.height.baseVal.value
      )
        errors.push("SVG viewport must be 1:1");
    }
    if (page.querySelector(".katex-error")) errors.push("Invalid math");
    if (page.querySelector("audio,video"))
      errors.push("Layout sampling must not play media");
    return errors;
  },
});
