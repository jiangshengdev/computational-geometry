import { pages, shots } from "./storyboard.ts";

export const fps = 60;
export const leadFrames = 30;
export const timingKind = "provisional-silent-reading";
const subtitleClauses = (text: string) =>
  text.match(/[^，。！？；]+[，。！？；]?/gu) ?? [];

// Reading estimates for the silent teaching draft, never measured audio data.
let from = 0;
export const rows = shots.map((shot, index) => {
  let cursor = leadFrames;
  const captions = shot.captions.flatMap(subtitleClauses).map((text) => {
    const start = cursor;
    cursor += Math.ceil(Math.max(3, [...text].length / 4.5) * fps);
    return { text, start, end: cursor };
  });
  const pauseAfter =
    shots[index + 1]?.page === shot.page
      ? 1
      : pages[shot.page].holdAfterSeconds;
  const row = {
    ...shot,
    from,
    captions,
    readingFrames: cursor - leadFrames,
    durationInFrames: cursor + pauseAfter * fps,
    pauseAfter,
    revealMs: -500,
    stages: [] as { ms: number }[],
    previousCaption:
      shots[index - 1]?.page === shot.page
        ? subtitleClauses(shots[index - 1].captions.slice(-1)[0]).slice(-1)[0]
        : "",
  };
  from += row.durationInFrames;
  return row;
});
export const durationInFrames = from;
export type TimelineRow = (typeof rows)[number];
export function visualAt(row: TimelineRow, frame: number) {
  const cues = row.captions.filter((cue) => cue.start <= frame);
  const progress = Math.max(
    0,
    Math.min(1, (frame - leadFrames) / row.readingFrames),
  );
  return {
    visibleStep: row.visibleStep,
    caption: cues[cues.length - 1]?.text ?? row.previousCaption,
    thinking: frame >= leadFrames + row.readingFrames,
    active: frame >= leadFrames && frame < leadFrames + row.readingFrames,
    progress,
    // One smooth movement per teaching operation, retained across captions.
    motion: Math.max(0, Math.min(1, (progress - 0.15) / 0.35)),
    phase: Math.max(0, cues.length - 1),
  };
}
export type VisualState = ReturnType<typeof visualAt>;
