import timing from "./audio-timing.json" with { type: "json" };
import captions from "./captions.json" with { type: "json" };
import { createShotTimeline } from "../../shared/speech/shot-timeline.ts";
import {
  phraseTime,
  type AudioTiming,
  type Caption,
} from "../../shared/speech/timing.ts";
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

// A sentence may explain multiple rows: reveal each at its measured phrase,
// retaining earlier rows instead of showing the final transformation early.
const rowPhrases: Record<string, [number, string][]> = {
  "232-01": [
    [1, "全部输入"],
    [2, "M是"],
  ],
  "232-05": [
    [2, "因此"],
    [3, "实际的"],
  ],
  "232-08": [
    [1, "第一个分数"],
    [2, "通分以后"],
  ],
  "232-10": [
    [4, "它是"],
    [5, "除以"],
  ],
  "232-11": [
    [1, "先把"],
    [2, "再把"],
  ],
  "232-12": [
    [3, "八乘以八"],
    [4, "因此"],
  ],
  "232-14": [
    [2, "二分之一"],
    [3, "分子同为一"],
  ],
  "232-16": [
    [1, "距离等于"],
    [2, "所以"],
  ],
  "232-17": [
    [3, "再用"],
    [4, "这是"],
  ],
};
const audio = timing as Record<string, AudioTiming>;
export function timelineFor(issue?: string) {
  return shared.timelineFor(issue).map((row) => ({
    ...row,
    stages: (rowPhrases[row.id] ?? [[row.step, ""]]).map(([step, phrase]) => ({
      step,
      ms: phrase ? phraseTime(audio[row.id], phrase, "start") : row.revealMs,
    })),
  }));
}
export function visualAt(
  row: ReturnType<typeof timelineFor>[number],
  frame: number,
) {
  const ms = ((frame - audioLeadFrames) * 1000) / fps;
  const revealed = row.stages.filter((stage) => stage.ms <= ms);
  return {
    ...shared.visualAt(row, frame),
    visibleStep: revealed[revealed.length - 1]?.step ?? row.previousStep,
  };
}
export type TimelineRow = ReturnType<typeof timelineFor>[number];
