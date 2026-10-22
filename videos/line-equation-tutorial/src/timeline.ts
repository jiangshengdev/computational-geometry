import narration from "./narration.json" with { type: "json" };
import timingData from "./audio-timing.json" with { type: "json" };
import { derivations } from "./derivations.ts";
const timing: Record<string, { frames: number; duration: number }> = timingData;
// Stored timing and storyboard animation keyframes use the original 30 fps.
export const sourceFps = 30;
export const fps = 60;
export const frameScale = fps / sourceFps;
export const audioLeadInFrames = 0.2 * fps;
const pageHolds = new Map(
  derivations.map((page) => [
    page.rows[page.rows.length - 1],
    page.holdAfterSeconds ?? 3,
  ]),
);
export const chapters = narration.map((chapter) => {
  let from = 0;
  const rows = chapter.rows.map((row) => {
    const animationDurationInFrames = timing[row.id].frames * frameScale;
    // Each intro row replaces the page; body pages can span several rows.
    const holdSeconds =
      pageHolds.get(row.id) ?? (row.id.startsWith("189-") ? 3 : 0);
    const durationInFrames = Math.max(
      animationDurationInFrames,
      audioLeadInFrames +
        Math.ceil(timing[row.id].duration * fps) +
        holdSeconds * fps,
    );
    const result = {
      ...row,
      from,
      durationInFrames,
      animationDurationInFrames,
    };
    from += durationInFrames;
    return result;
  });
  return { ...chapter, rows, durationInFrames: from };
});
// Added reading time must not stretch the original animation or reveal timing.
export const storyboardSeconds = (
  row: { start: number; end: number; animationDurationInFrames: number },
  frame: number,
) =>
  (Math.min(frame, row.animationDurationInFrames - 1) /
    row.animationDurationInFrames) *
  (row.end - row.start);
export const offsets = chapters.map((_, i) =>
  chapters
    .slice(0, i)
    .reduce((sum, chapter) => sum + chapter.durationInFrames, 0),
);
export const totalFrames = chapters.reduce(
  (sum, chapter) => sum + chapter.durationInFrames,
  0,
);
