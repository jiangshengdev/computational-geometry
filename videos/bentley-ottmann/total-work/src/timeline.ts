import { shots, pageList } from "./storyboard.ts";
export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "provisional-silent-reading";
let from = 0;
export const rows = shots.map((shot, index) => {
  const readingFrames = shot.readingSeconds * fps;
  const endsPage = shots[index + 1]?.page !== shot.page;
  const pauseAfter = endsPage
    ? pageList.find((p) => p.id === shot.page)!.holdAfterSeconds
    : 0.5;
  const durationInFrames = audioLeadFrames + readingFrames + pauseAfter * fps;
  const captions = shot.captions.map((text, i) => ({
    text,
    start:
      audioLeadFrames + Math.floor((i * readingFrames) / shot.captions.length),
    end:
      audioLeadFrames +
      Math.floor(((i + 1) * readingFrames) / shot.captions.length),
  }));
  const previous = shots[index - 1];
  const row = {
    ...shot,
    from,
    readingFrames,
    durationInFrames,
    pauseAfter,
    revealMs: -500,
    stages: [
      { ms: (readingFrames / fps) * 1000 * 0.25 },
      { ms: (readingFrames / fps) * 1000 * 0.5 },
      { ms: (readingFrames / fps) * 1000 * 0.75 },
    ],
    captions,
    previousCaption:
      previous?.page === shot.page ? previous.captions.at(-1)! : "",
  };
  from += durationInFrames;
  return row;
});
export const durationInFrames = from;
export type TimelineRow = (typeof rows)[number];
export function visualAt(row: TimelineRow, frame: number) {
  const progress = Math.max(
    0,
    Math.min(
      1,
      (frame - audioLeadFrames) / Math.max(1, row.readingFrames - 120),
    ),
  );
  return {
    visibleStep: row.step,
    captionIndex: row.captions.findLastIndex((c) => frame >= c.start),
    caption:
      row.captions.findLast((c) => frame >= c.start)?.text ??
      row.previousCaption,
    thinking: frame >= audioLeadFrames + row.readingFrames,
    progress,
    active: progress > 0.05 && progress < 0.85,
  };
}
export type VisualState = ReturnType<typeof visualAt>;
