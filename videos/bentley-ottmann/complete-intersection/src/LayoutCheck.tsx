import { createShotLayoutCheck } from "../../../shared/checks/ShotLayoutCheck";
import {
  checkPageBounds,
  checkDiagramLabels,
} from "../../../shared/checks/dom";
import { timeline, visualAt, fps } from "./timeline";
import { TeachingPage } from "./TeachingPage";

const auditRows = timeline.map((row) => ({
  id: row.id,
  page: row.page.id,
  source: row,
  from: row.from,
  revealMs: 0,
  readingFrames: row.readingFrames,
  durationInFrames: row.durationInFrames,
  pauseAfter: row.durationInFrames - row.readingFrames,
  stages: row.captions.map((caption) => ({ ms: caption.startMs })),
}));

export const LayoutCheck = createShotLayoutCheck({
  rows: auditRows,
  fps,
  audioLeadFrames: 0,
  captions: Object.fromEntries(
    timeline.map((row) => [
      row.id,
      row.captions.map((caption, i) => ({
        ...caption,
        endMs: row.captions[i + 1]?.startMs ?? (row.readingFrames * 1000) / fps,
        timestampMs: null,
        confidence: null,
      })),
    ]),
  ),
  visualAt: (row, frame) => ({
    ...visualAt(row.source, frame),
    visibleStep: visualAt(row.source, frame).visibleLines,
    thinking: false,
  }),
  extraFrames: (row) =>
    [0.25, 0.5, 0.75, 1].map((p) => Math.floor((row.readingFrames - 1) * p)),
  SceneAtFrame: ({ row, frame }) => (
    <TeachingPage row={row.source} frame={frame} />
  ),
  auditPage: (page, _id, visibleLines) => {
    const errors: string[] = [];
    checkPageBounds(page, errors);
    checkDiagramLabels(
      Array.from(page.querySelectorAll<HTMLElement>("[data-diagram-label]")),
      errors,
    );
    const revealed = page.querySelectorAll('[data-revealed="true"]').length;
    if (_id !== "complete-path" && revealed !== visibleLines)
      errors.push(
        `Expected ${visibleLines} complete teaching lines; found ${revealed}`,
      );
    return errors;
  },
});
