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
    const comparison =
      shot.id === "207-05"
        ? [
            {
              start: phraseTime(audio, "左边固定坐标轴", "start"),
              end: phraseTime(audio, "画出新点", "end"),
            },
            {
              start: phraseTime(audio, "右边固定 P", "start"),
              end: phraseTime(audio, "更换读数所用的轴", "end"),
            },
          ]
        : null;
    const { previousStep, previousCaption, ...base } = shot;
    return {
      ...base,
      comparisonTiming: comparison,
      walkTiming:
        shot.id === "206-15"
          ? ["向左走一", "再向上走二"].map((phrase) => ({
              start: phraseTime(audio, phrase, "start"),
              end: phraseTime(audio, phrase, "end"),
            }))
          : null,
      previousStep,
      previousCaption,
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
  return {
    ...shared.visualAt(row, frame),
    walk: row.walkTiming
      ? (row.walkTiming.map((interval) => progressAt(ms, interval)) as [
          number,
          number,
        ])
      : ([1, 1] as [number, number]),
    comparison: row.comparisonTiming
      ? (row.comparisonTiming.map((interval) => progressAt(ms, interval)) as [
          number,
          number,
        ])
      : ([1, 1] as [number, number]),
  };
}
