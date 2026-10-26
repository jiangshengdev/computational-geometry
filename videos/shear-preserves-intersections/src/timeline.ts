import timing from "./audio-timing.json" with { type: "json" };
import captions from "./captions.json" with { type: "json" };
import { createShotTimeline } from "../../shared/speech/shot-timeline.ts";
import type { AudioTiming, Caption } from "../../shared/speech/timing.ts";
import { shots, pages } from "./storyboard.ts";
export const fps = 60;
export const audioLeadFrames = 12;
const shared = createShotTimeline({
  shots,
  pages,
  timing: timing as Record<string, AudioTiming>,
  captions: captions as Record<string, Caption[]>,
  fps,
  audioLeadFrames,
});
export function timelineFor(issue?: string) {
  return shared.timelineFor(issue).map((row) => ({
    ...row,
    stages: [{ step: row.step, ms: Math.max(0, row.revealMs - 200) }],
  }));
}
export type TimelineRow = ReturnType<typeof timelineFor>[number];
export function visualAt(row: TimelineRow, frame: number) {
  // Reveal complete rows, using measured speech onset rather than word fragments.
  const ms = ((frame - audioLeadFrames) * 1000) / fps;
  return {
    ...shared.visualAt(row, frame),
    visibleStep: ms >= row.stages[0].ms ? row.step : row.previousStep,
  };
}
