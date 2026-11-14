import { shots } from "./storyboard.ts";
export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "provisional-silent-reading";
// The shared measured timeline requires real audio. This stage has none.
// Reading windows are explicitly provisional; no synthetic word timings.
let cursor = 0;
export const rows = shots.map((shot, index) => {
  let end = audioLeadFrames;
  const captions = shot.captions.map((text) => {
    const start = end;
    end += Math.max(180, Math.ceil((text.length / 4.5) * fps));
    return { text, start, end };
  });
  const endsPage = shots[index + 1]?.page !== shot.page;
  const row = {
    ...shot,
    from: cursor,
    captions,
    readingFrames: end - audioLeadFrames,
    durationInFrames: end + (endsPage ? 120 : 30),
    pauseAfter: endsPage ? 2 : 0.5,
    revealMs: 0,
    stages: [],
    previousCaption:
      shots[index - 1]?.page === shot.page
        ? (shots[index - 1].captions.at(-1) ?? "")
        : "",
  };
  cursor += row.durationInFrames;
  return row;
});
export const durationInFrames = cursor;
export type TimelineRow = (typeof rows)[number];
export function visualAt(row: TimelineRow, frame: number) {
  const cue = row.captions.findLast((c) => frame >= c.start);
  return {
    visibleStep: row.step,
    caption: cue?.text ?? row.previousCaption,
    thinking: frame >= row.readingFrames + audioLeadFrames,
    active: frame >= 60 && frame < 180,
  };
}
export type VisualState = ReturnType<typeof visualAt>;
