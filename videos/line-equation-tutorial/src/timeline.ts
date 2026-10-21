import narration from "./narration.json";
import timingData from "./audio-timing.json";
const timing: Record<string, { frames: number; duration: number }> = timingData;
export const fps = 30;
export const chapters = narration.map((chapter) => {
  let from = 0;
  const rows = chapter.rows.map((row) => {
    const durationInFrames = timing[row.id].frames;
    const result = { ...row, from, durationInFrames };
    from += durationInFrames;
    return result;
  });
  return { ...chapter, rows, durationInFrames: from };
});
export const offsets = chapters.map((_, i) =>
  chapters
    .slice(0, i)
    .reduce((sum, chapter) => sum + chapter.durationInFrames, 0),
);
export const totalFrames = chapters.reduce(
  (sum, chapter) => sum + chapter.durationInFrames,
  0,
);
