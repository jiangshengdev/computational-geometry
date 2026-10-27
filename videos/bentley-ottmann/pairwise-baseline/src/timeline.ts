import timing from "./audio-timing.json" with { type: "json" };
import captions from "./captions.json" with { type: "json" };
import { createShotTimeline } from "../../../shared/speech/shot-timeline.ts";
import {
  phraseTime,
  type AudioTiming,
  type Caption,
} from "../../../shared/speech/timing.ts";
import { shots, pages } from "./storyboard.ts";
export const fps = 60;
export const audioLeadFrames = 12;
const audio = timing as Record<string, AudioTiming>;
const shared = createShotTimeline({
  shots,
  pages,
  timing: audio,
  captions: captions as Record<string, Caption[]>,
  fps,
  audioLeadFrames,
});
export function timelineFor() {
  return shared.timelineFor().map((row) => ({
    ...row,
    mainShift:
      row.id === "D25"
        ? { start: row.from, end: row.from + audioLeadFrames }
        : null,
    stages:
      row.id === "D25"
        ? [
            { step: 3, ms: Math.max(0, row.revealMs - 200) },
            {
              step: 4,
              ms: Math.max(
                0,
                phraseTime(audio[row.id], "第二份不能", "start") - 200,
              ),
            },
          ]
        : [{ step: row.step, ms: Math.max(0, row.revealMs - 200) }],
  }));
}
export type TimelineRow = ReturnType<typeof timelineFor>[number];
export function visualAt(row: TimelineRow, frame: number) {
  const ms = ((frame - audioLeadFrames) * 1000) / fps;
  return {
    ...shared.visualAt(row, frame),
    shift:
      row.id === "D25"
        ? Math.max(0, Math.min(1, frame / audioLeadFrames))
        : row.id === "D26"
          ? 1
          : 0,
    visibleStep: row.stages.reduce(
      (step, stage) => (ms >= stage.ms ? stage.step : step),
      row.previousStep,
    ),
  };
}
