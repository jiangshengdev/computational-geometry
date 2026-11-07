import { shots, pages } from "./storyboard.ts";
import { clauses } from "../../../shared/speech/timing.ts";
import { groupCaptionClauses } from "../../../shared/speech/captions.ts";
import { visualCues } from "./visual-cues.ts";
export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "provisional-visual-inspection";
/** Reading windows only; never audio metadata. #345 replaces this clock. */
let cursor = 0;
let previousCaption = "";
export const rows = shots.map((shot, index) => {
  let at = audioLeadFrames;
  const captions = shot.captions.flatMap((text, source) => {
    const parts = clauses(text);
    return groupCaptionClauses(parts, parts).map(({ text }) => {
      const start = at;
      at += Math.max(180, Math.ceil((text.length / 4.5) * fps));
      return { text, source, start, end: at };
    });
  });
  const last = shots[index + 1]?.page !== shot.page;
  const pauseAfter = Math.max(
    shot.thinkAfter ?? 1,
    last ? pages[shot.page].holdAfterSeconds : 0,
  );
  const durationInFrames = at + pauseAfter * fps;
  const operations = (visualCues[shot.id] ?? []).map((cue) => {
    const caption = captions.find((c) => c.text.includes(cue.phrase));
    if (!caption)
      throw new Error(`${shot.id}: missing visual anchor ${cue.phrase}`);
    const offset = caption.text.indexOf(cue.phrase);
    const span = caption.end - caption.start;
    return {
      name: cue.name,
      start:
        caption.start +
        Math.floor(
          (span * (offset + cue.phrase.length * (cue.part ?? 0))) /
            caption.text.length,
        ),
      end:
        caption.start +
        Math.floor((span * (offset + cue.phrase.length)) / caption.text.length),
    };
  });
  operations.forEach((op, i) => {
    op.end = Math.min(op.end, operations[i + 1]?.start ?? op.end);
  });
  const row = {
    ...shot,
    from: cursor,
    captions,
    operations,
    readingFrames: at - audioLeadFrames,
    durationInFrames,
    pauseAfter,
    revealMs: -500,
    stages: [] as { ms: number }[],
    previousCaption:
      shots[index - 1]?.page === shot.page ? previousCaption : "",
  };
  previousCaption = captions[captions.length - 1].text;
  cursor += durationInFrames;
  return row;
});
export type TimelineRow = (typeof rows)[number];
export const durationInFrames = cursor;
export function visualAt(row: TimelineRow, frame: number) {
  const activeCaption = row.captions.findIndex(
    (c) => frame >= c.start && frame < c.end,
  );
  const introduced = row.captions.filter((c) => frame >= c.start);
  const reached = introduced[introduced.length - 1];
  const start = row.captions[0].start;
  const end = row.captions[row.captions.length - 1].end;
  const progress = Math.max(0, Math.min(1, (frame - start) / (end - start)));
  const operation = row.operations.find(
    (op) => frame >= op.start && frame < op.end,
  );
  return {
    visibleStep: row.visibleStep,
    caption: reached?.text ?? row.previousCaption,
    activeCaption,
    reachedCaption: reached?.source ?? -1,
    progress,
    operations: row.operations
      .filter((op) => frame >= op.start)
      .map((op) => op.name),
    operation: operation?.name ?? null,
    operationProgress: operation
      ? (frame - operation.start) / (operation.end - operation.start)
      : 1,
    thinking: frame >= end,
    target: frame >= start && frame < end ? (row.target ?? null) : null,
  };
}
export type VisualState = ReturnType<typeof visualAt>;
export const rowAt = (frame: number) =>
  rows.find((r) => frame >= r.from && frame < r.from + r.durationInFrames) ??
  rows[rows.length - 1];
