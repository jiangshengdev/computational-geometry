import {
  createShotLayoutCheck,
  captionsFromFrames,
} from "../../../shared/checks/ShotLayoutCheck";
import { checkTeachingPage } from "../../../shared/checks/dom";
import { rows, visualAt, fps, motionCue, type TimelineRow } from "./timeline";
import { TeachingPage } from "./TeachingPage";
const SceneAtFrame = ({ row, frame }: { row: TimelineRow; frame: number }) => (
  <TeachingPage row={row} state={visualAt(row, frame)} />
);
export const LayoutCheck = createShotLayoutCheck({
  rows,
  visualAt,
  fps,
  audioLeadFrames: 0,
  SceneAtFrame,
  captions: captionsFromFrames(rows, fps, 0),
  extraFrames: (row) => [
    ...row.captions.flatMap((c) => [c.start, c.end - 1]),
    ...[0, 0.25, 0.5, 0.75, 1].map((p) =>
      Math.floor(
        motionCue(row).start + p * (motionCue(row).end - motionCue(row).start),
      ),
    ),
  ],
  auditPage(page, _id, visibleStep) {
    const errors: string[] = [];
    checkTeachingPage(page, visibleStep, errors);
    for (const svg of page.querySelectorAll<SVGSVGElement>(
      "svg[data-geometry-inputs]",
    ))
      if (
        svg.viewBox.baseVal.width !== svg.width.baseVal.value ||
        svg.viewBox.baseVal.height !== svg.height.baseVal.value
      )
        errors.push("SVG viewport must be 1:1");
    if (page.querySelector(".katex-error")) errors.push("Invalid math");
    for (const group of page.querySelectorAll('[data-order-member="G"]'))
      if (/G\s*\[\s*\]/.test(group.textContent ?? ""))
        errors.push(
          "A visible group must retain its entering or exiting members",
        );
    if (page.querySelector("audio,video"))
      errors.push("Visual stage must not mount media");
    return errors;
  },
});
