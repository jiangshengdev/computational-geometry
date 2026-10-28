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
const animationPhrases: Record<string, string> = {
  D25: "选定之后",
  D26: "每一种第一份的选择。都对应 n 减一 种第二份的选择",
  D27: "任意两份不同输入都恰好有这两种顺序",
  D32: "十二除以二等于六",
};
const animations = Object.fromEntries(
  Object.entries(animationPhrases).map(([id, phrase]) => [
    id,
    {
      start: phraseTime(audio[id], phrase, "start"),
      end: phraseTime(audio[id], phrase, "end"),
    },
  ]),
);
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
    motionTiming: animations[row.id] ?? row.motionTiming,
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
  const animation = animations[row.id];
  const progress = animation
    ? Math.max(
        0,
        Math.min(1, (ms - animation.start) / (animation.end - animation.start)),
      )
    : 0;
  return {
    ...shared.visualAt(row, frame),
    pairing: {
      selection: row.id === "D25" ? progress : 1,
      first:
        row.id === "D25"
          ? progress > 0
            ? 1
            : 0
          : row.id === "D26" && progress < 1
            ? Math.min(4, 1 + Math.floor(progress * 4))
            : 0,
      merge:
        row.id === "D27" || row.id === "D32"
          ? progress
          : row.page === "unordered"
            ? 1
            : 0,
    },
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
