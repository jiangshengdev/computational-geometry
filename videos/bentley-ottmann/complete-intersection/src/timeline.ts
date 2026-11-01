import { pages } from "./content.ts";
import { captionAt } from "../../../shared/speech/captions.ts";

export const fps = 60;
export const timingStatus = "provisional-reading-only" as const;
// Reading previews only: these are not measured speech or word timings.
export const rows = pages.flatMap((page) =>
  page.steps.map((step, index) => {
    const phrases =
      step.subtitle.match(/[^，。！？；：]+[，。！？；：]?/g) ?? [];
    let readingMs = 0;
    const captions = phrases.map((text) => {
      const startMs = readingMs;
      readingMs += Math.max(
        2000,
        text.replace(/\$[^$]+\$/g, "公式").length * 280,
      );
      return { text, startMs };
    });
    const readingFrames = Math.ceil((readingMs * fps) / 1000);
    const pauseFrames = Math.max(
      (step.thinkSeconds ?? 0) * fps,
      index === page.steps.length - 1 ? (page.dense ? 2 : 1) * fps : 0,
    );
    return {
      id: step.id,
      page,
      step,
      index,
      captions,
      readingFrames,
      durationInFrames: readingFrames + pauseFrames,
    };
  }),
);
export type ReadingRow = (typeof rows)[number];
let offset = 0;
export const timeline = rows.map((row) => {
  const from = offset;
  offset += row.durationInFrames;
  return { ...row, from };
});
export const durationInFrames = offset;
export function visualAt(row: ReadingRow, frame: number) {
  return {
    visibleLines: row.page.steps
      .slice(0, row.index + 1)
      .reduce((n, step) => n + step.lines.length, 0),
    caption: captionAt(row.captions, (frame * 1000) / fps),
    progress: Math.min(
      1,
      Math.max(0, frame / Math.max(1, row.readingFrames - 1)),
    ),
  };
}
