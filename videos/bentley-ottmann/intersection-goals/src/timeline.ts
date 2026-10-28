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
export type DiagramFocus = {
  target: "start" | "end" | "segment" | "origin" | "diamond" | "identity";
  progress: number;
};
const focusPhrases: Record<string, [DiagramFocus["target"], string][]> = {
  U01: [
    ["start", "横坐标负一、纵坐标零的点"],
    ["end", "横坐标一、纵坐标零的点"],
    ["segment", "是一条经过原点的水平线段"],
  ],
  U02: [
    ["start", "横坐标零、纵坐标负一的点"],
    ["end", "横坐标零、纵坐标一的点"],
    ["segment", "是一条经过原点的竖直线段"],
  ],
  U03: [
    ["origin", "两个端点横坐标和纵坐标都是零"],
    ["origin", "它只包含原点这一个点"],
    ["identity", "这仍然是一份独立输入"],
    ["diamond", "菱形只是帮助我们认出它"],
    ["origin", "不表示有面积"],
  ],
  U04: [["origin", "公共位置只有原点"]],
};
const focusCues = Object.fromEntries(
  Object.entries(focusPhrases).map(([id, phrases]) => [
    id,
    phrases.map(([target, phrase]) => ({
      target,
      start: phraseTime(audio[id], phrase, "start"),
      end: phraseTime(audio[id], phrase, "end"),
    })),
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
    stages: [{ step: row.step, ms: Math.max(0, row.revealMs - 200) }],
  }));
}
export type TimelineRow = ReturnType<typeof timelineFor>[number];
export function visualAt(row: TimelineRow, frame: number) {
  const ms = ((frame - audioLeadFrames) * 1000) / fps;
  const cue = focusCues[row.id].find(
    ({ start, end }) => ms >= start && ms < end,
  );
  return {
    ...shared.visualAt(row, frame),
    activeInput: row.step,
    focus: cue
      ? {
          target: cue.target,
          progress: (ms - cue.start) / (cue.end - cue.start),
        }
      : undefined,
    visibleStep: row.stages.reduce(
      (step, stage) => (ms >= stage.ms ? stage.step : step),
      row.previousStep,
    ),
  };
}
