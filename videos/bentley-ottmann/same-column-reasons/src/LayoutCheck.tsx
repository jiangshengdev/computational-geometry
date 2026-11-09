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
  audioLeadFrames: audioLeadFrames,
  SceneAtFrame,
  captions: captionsFromFrames(rows, fps, audioLeadFrames),
  extraFrames: (row) => [
    ...row.spoken.flatMap((c) => [
      c.start - 1,
      c.start,
      Math.floor((c.start + c.end) / 2),
      c.end,
    ]),
    ...[0.15, 0.325, 0.5, 0.8].flatMap((p) => {
      const f = audioLeadFrames + Math.floor(row.speechFrames * p);
      return [f - 1, f, f + 1];
    }),
  ],
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
        errors.push("Coordinate labels require a 1:1 SVG viewport");
    }
    if (page.querySelector(".katex-error")) errors.push("Invalid math");
    if (page.querySelector("audio,video"))
      errors.push("Silent inspection must not play media");
    return errors;
  },
});
