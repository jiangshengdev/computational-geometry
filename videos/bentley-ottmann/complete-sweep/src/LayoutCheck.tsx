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
  motionCue,
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
    if (/E_\{?\d|E\d+|[七八]号位置/.test(page.textContent ?? ""))
      errors.push(
        "Audience-facing content must use event identities, not event numbers",
      );
    const initial = page.querySelector("[data-initial-endpoints]");
    if (
      initial &&
      (initial.querySelectorAll("[data-endpoint-row]").length !== 12 ||
        initial.querySelector('[data-event-identity="7"]'))
    )
      errors.push(
        "Initialization must show twelve endpoint positions without P",
      );
    for (const joint of page.querySelectorAll('[data-event-identity="8"]')) {
      const labels = joint.querySelectorAll<HTMLElement>(
        "[data-diagram-label]",
      );
      if (
        !labels[0]?.textContent?.includes("V尾") ||
        !labels[1]?.textContent?.includes("Z点") ||
        labels[0].style.color === labels[1].style.color
      )
        errors.push(
          "The shared endpoint must retain distinct colored V-tail and Z-point identities",
        );
    }
    for (const group of page.querySelectorAll('[data-order-member="G"]'))
      if (/G\s*\[\s*\]/.test(group.textContent ?? ""))
        errors.push(
          "A visible group must retain its entering or exiting members",
        );
    if (page.querySelector("audio,video"))
      errors.push("Silent layout audit must not mount media");
    return errors;
  },
});
