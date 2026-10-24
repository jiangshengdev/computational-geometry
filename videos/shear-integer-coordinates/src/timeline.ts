import timingData from "./audio-timing.json" with { type: "json" };
import captionData from "./captions.json" with { type: "json" };
import { pages, shots } from "./storyboard.ts";
import { createShotTimeline } from "../../shared/speech/shot-timeline.ts";
import type { AudioTiming, Caption } from "../../shared/speech/timing.ts";

export const fps = 60;
export const audioLeadFrames = 12;
export const { timelineFor, visualAt } = createShotTimeline({
  shots,
  pages,
  timing: timingData as Record<string, AudioTiming>,
  captions: captionData as Record<string, Caption[]>,
  fps,
  audioLeadFrames,
});
export type TimelineRow = ReturnType<typeof timelineFor>[number];
