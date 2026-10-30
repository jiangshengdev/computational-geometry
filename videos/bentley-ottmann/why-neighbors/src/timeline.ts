import { pages, shots } from "./lesson.ts";
export const fps = 60;
export const timingKind = "provisional-visual" as const;
/** Explicit reading windows, separate from all historic audio/caption records. */
export const timelineFor = () => {
  let from = 0;
  return shots.map((shot) => {
    const page = pages[shot.page];
    let cursor = 0;
    const stages = page.steps.map((step, index) => {
      const stage = {
        step: index + 1,
        frame: cursor,
        ms: (cursor * 1000) / fps,
      };
      cursor += Math.ceil(step.seconds * fps);
      return stage;
    });
    const row = {
      ...shot,
      from,
      stages,
      readingFrames: cursor,
      durationInFrames: cursor + page.hold * fps,
    };
    from += row.durationInFrames;
    return row;
  });
};
export type TimelineRow = ReturnType<typeof timelineFor>[number];
export function visualAt(row: TimelineRow, frame: number) {
  const stage =
    row.stages.filter((stage) => stage.frame <= frame).slice(-1)[0] ??
    row.stages[0];
  const step = pages[row.page].steps[stage.step - 1];
  const elapsed = frame - stage.frame;
  return {
    visibleStep: stage.step,
    caption: step.caption,
    thinking: false,
    cueActive: elapsed < 4 * fps,
    cueProgress: Math.min(1, elapsed / (2 * fps)),
  };
}
