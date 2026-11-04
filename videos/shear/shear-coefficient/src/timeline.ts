import timingData from "./audio-timing.json" with { type: "json" };
import captionData from "./captions.json" with { type: "json" };
import { pages, shots } from "./storyboard.ts";
import {
  phraseTime,
  type AudioTiming,
  type Caption,
} from "../../../shared/speech/timing.ts";
import { createShotTimeline } from "../../../shared/speech/shot-timeline.ts";

export const fps = 60;
export const audioLeadFrames = 12;
const timing = timingData as Record<string, AudioTiming>;
const captions = captionData as Record<string, Caption[]>;
const shared = createShotTimeline({
  shots,
  pages,
  timing,
  captions,
  fps,
  audioLeadFrames,
});
export function timelineFor(issue?: string) {
  return shared.timelineFor(issue).map((shot) => {
    const audio = timing[shot.id];
    const motion = shot.motionTiming
      ? {
          ...shot.motionTiming,
          midpoint: shot.motion?.midpoint
            ? phraseTime(audio, shot.motion.midpoint, "end")
            : undefined,
        }
      : null;
    return {
      ...shot,
      motionTiming: motion,
    };
  });
}
export type TimelineRow = ReturnType<typeof timelineFor>[number];
const progressAt = (ms: number, interval: { start: number; end: number }) =>
  Math.max(
    0,
    Math.min(1, (ms - interval.start) / (interval.end - interval.start)),
  );
export function visualAt(row: TimelineRow, frame: number) {
  const ms = ((frame - audioLeadFrames) * 1000) / fps;
  // The midpoint anchor means A is directly above B (x=1), not half
  // the movement distance. In the 0.006 exercise the destination is 1.2.
  const midpointProgress = 1 / (pages[row.page].diagram?.targetX ?? 2);
  const state = shared.visualAt(row, frame);
  return {
    ...state,
    progress:
      row.motionTiming?.midpoint !== undefined
        ? ms <= row.motionTiming.midpoint
          ? midpointProgress *
            progressAt(ms, {
              start: row.motionTiming.start,
              end: row.motionTiming.midpoint,
            })
          : midpointProgress +
            (1 - midpointProgress) *
              progressAt(ms, {
                start: row.motionTiming.midpoint,
                end: row.motionTiming.end,
              })
        : state.progress,
  };
}
