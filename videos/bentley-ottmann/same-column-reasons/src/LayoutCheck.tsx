import {
  createShotLayoutCheck,
  captionsFromFrames,
} from "../../../shared/checks/ShotLayoutCheck";
import { checkTeachingPage } from "../../../shared/checks/dom";
import { rows, visualAt, fps, leadFrames, type TimelineRow } from "./timeline";
import { TeachingPage } from "./TeachingPage";
function SceneAtFrame({ row, frame }: { row: TimelineRow; frame: number }) {
  return <TeachingPage row={row} state={visualAt(row, frame)} />;
}
export const LayoutCheck = createShotLayoutCheck({
  rows,
  visualAt,
  fps,
  audioLeadFrames: leadFrames,
  SceneAtFrame,
  captions: captionsFromFrames(rows, fps, leadFrames),
  extraFrames: (row) =>
    [0.15, 0.325, 0.5, 0.8].flatMap((p) => {
      const f = leadFrames + Math.floor(row.readingFrames * p);
      return [f - 1, f, f + 1];
    }),
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
