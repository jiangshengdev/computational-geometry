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
const SceneAtFrame = ({ row, frame }: { row: TimelineRow; frame: number }) => (
  <TeachingPage row={row} state={visualAt(row, frame)} />
);
export const LayoutCheck = createShotLayoutCheck({
  rows,
  visualAt,
  fps,
  audioLeadFrames,
  SceneAtFrame,
  captions: captionsFromFrames(rows, fps, audioLeadFrames),
  extraFrames: (row) => [
    59,
    60,
    120,
    179,
    180,
    ...row.captions.flatMap((c) => [c.start, c.end - 1]),
  ],
  auditPage(page, _id, step) {
    const errors: string[] = [];
    checkTeachingPage(page, step, errors);
    for (const svg of page.querySelectorAll<SVGSVGElement>(
      "svg[data-geometry-inputs]",
    ))
      if (
        svg.viewBox.baseVal.width !== svg.width.baseVal.value ||
        svg.viewBox.baseVal.height !== svg.height.baseVal.value
      )
        errors.push("SVG viewport must be 1:1");
    if (page.querySelector(".katex-error")) errors.push("Invalid mathematics");
    if (page.querySelector("audio,video"))
      errors.push("Silent stage must not mount media");
    return errors;
  },
});
