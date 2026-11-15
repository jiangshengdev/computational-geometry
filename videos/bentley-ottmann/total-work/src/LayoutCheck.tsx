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
  cuesFor,
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
  extraFrames: (row) =>
    [
      ...Object.values(cuesFor(row)).flatMap((value) =>
        typeof value === "number"
          ? [value - 1, value]
          : Array.isArray(value)
            ? value.flatMap((t) => [t - 1, t])
            : [value.start, value.end],
      ),
      ...[0, 0.05, 0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85, 1].map(
        (t) => audioLeadFrames + Math.floor(t * row.speechFrames),
      ),
    ].filter((frame) => frame >= 0 && frame < row.durationInFrames),
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
      errors.push("Layout-only inspection must not mount media");
    return errors;
  },
});
