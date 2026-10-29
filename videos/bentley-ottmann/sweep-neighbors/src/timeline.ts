import timing from "./audio-timing.json" with { type: "json" };
import captions from "./captions.json" with { type: "json" };
import { createShotTimeline } from "../../../shared/speech/shot-timeline.ts";
import { createTeachingCues } from "../../../shared/speech/teaching-cues.ts";
import type { AudioTiming, Caption } from "../../../shared/speech/timing.ts";
import { shots, pages } from "./storyboard.ts";
import { teachingCues } from "./teaching-cues.ts";
export const fps = 60;
export const audioLeadFrames = 12;
const audio = timing as Record<string, AudioTiming>;
export const lessonCues = createTeachingCues(audio, teachingCues);
const shared = createShotTimeline({
  shots,
  pages,
  timing: audio,
  captions: captions as Record<string, Caption[]>,
  fps,
  audioLeadFrames,
});
export const timelineFor = () =>
  shared.timelineFor().map((row, index) => ({
    ...row,
    previousState: shots[index - 1]?.state ?? "blank",
    stages: [{ step: row.step, ms: Math.max(0, row.revealMs - 200) }],
  }));
export type TimelineRow = ReturnType<typeof timelineFor>[number];
export function visualAt(row: TimelineRow, frame: number) {
  return {
    ...shared.visualAt(row, frame),
    visibleStep:
      frame < audioLeadFrames + Math.ceil((row.stages[0].ms * fps) / 1000)
        ? row.previousStep
        : row.step,
    stateName:
      frame < audioLeadFrames + Math.ceil((row.stages[0].ms * fps) / 1000)
        ? row.previousState
        : row.state,
    focus: lessonCues.at(row.id, ((frame - audioLeadFrames) * 1000) / fps),
  };
}
