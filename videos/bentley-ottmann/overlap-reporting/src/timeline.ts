import { shots, pages } from "./storyboard.ts";
import captionData from "./captions.json" with { type: "json" };
import audioData from "./audio-timing.json" with { type: "json" };
import { createShotTimeline } from "../../../shared/speech/shot-timeline.ts";
import type { AudioTiming, Caption } from "../../../shared/speech/timing.ts";
import { measuredOperations } from "./operation-timing.ts";

export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "measured-narration";
export const audio = audioData as Record<string, AudioTiming>;
const mapped = captionData as Record<string, (Caption & { source: number })[]>;
const shared = createShotTimeline({
  shots: shots.map((shot) => ({
    ...shot,
    step: shot.visibleStep,
    pauseAfter: shot.thinkAfter ?? 1,
  })),
  pages,
  timing: audio,
  captions: mapped,
  fps,
  audioLeadFrames,
});
export const rows = shared.timelineFor().map((row, index) => ({
  ...row,
  audioEndFrame: audioLeadFrames + row.speechFrames,
  pauseAfter: Math.max(
    row.thinkAfter ?? 1,
    shots[index + 1]?.page !== row.page ? pages[row.page].holdAfterSeconds : 0,
  ),
  revealMs: -500,
  stages: [] as { ms: number }[],
  captions: mapped[row.id].map((caption) => ({
    ...caption,
    start: audioLeadFrames + Math.floor((caption.startMs * fps) / 1000),
    end: audioLeadFrames + Math.ceil((caption.endMs * fps) / 1000),
  })),
  operations: measuredOperations(row.id, audio[row.id], fps, audioLeadFrames),
}));
export type TimelineRow = (typeof rows)[number];
export const durationInFrames = rows.reduce(
  (sum, row) => sum + row.durationInFrames,
  0,
);
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
    thinking: frame >= row.audioEndFrame,
    target: frame >= start && frame < end ? (row.target ?? null) : null,
  };
}
export type VisualState = ReturnType<typeof visualAt>;
export const rowAt = (frame: number) =>
  rows.find(
    (row) => frame >= row.from && frame < row.from + row.durationInFrames,
  ) ?? rows[rows.length - 1];
