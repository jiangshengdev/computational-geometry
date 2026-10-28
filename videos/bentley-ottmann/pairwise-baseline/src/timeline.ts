import timing from "./audio-timing.json" with { type: "json" };
import captions from "./captions.json" with { type: "json" };
import { createShotTimeline } from "../../../shared/speech/shot-timeline.ts";
import {
  phraseTime,
  spokenWordPulse,
  type AudioTiming,
  type Caption,
} from "../../../shared/speech/timing.ts";
import { shots, pages } from "./storyboard.ts";
export const fps = 60;
export const audioLeadFrames = 12;
const audio = timing as Record<string, AudioTiming>;
const inputCues: Record<string, [string, number[]][]> = {
  D01: [
    ["第一份", [0]],
    ["第二份", [1]],
  ],
  D02: [
    ["第三份", [2]],
    ["第四份", [3]],
    ["四条线段在不同高度", [0, 1, 2, 3]],
  ],
  D03: [["每条线段各自所在的高度不同", [0, 1, 2, 3]]],
  D07: [
    ["先取输入一", [0]],
    ["与输入二配对", [0, 1]],
  ],
  D08: [
    ["仍然取输入一", [0]],
    ["再与输入三", [0, 2]],
    ["输入四配对", [0, 3]],
    ["一与二", [0, 1]],
    ["一与三", [0, 2]],
    ["一与四", [0, 3]],
  ],
  D09: [
    ["轮到输入二", [1]],
    ["所以检查二与三", [1, 2]],
    ["二与四", [1, 3]],
    ["不要再回头", []],
  ],
  D10: [
    ["输入三只与输入四配对", [2, 3]],
    ["到了输入四", [3]],
  ],
  D12: [
    ["一与二", [0, 1]],
    ["一与三", [0, 2]],
    ["一与四", [0, 3]],
    ["零与一", [0, 1]],
    ["零与二", [0, 2]],
    ["零与三", [0, 3]],
  ],
  D13: [
    ["二与三", [1, 2]],
    ["二与四", [1, 3]],
    ["三与四", [2, 3]],
  ],
};
const animationPhrases: Record<string, string> = {
  D25: "选定之后",
  D26: "每一种第一份的选择。都对应 n 减一 种第二份的选择",
  D27: "任意两份不同输入都恰好有这两种顺序",
  D32: "十二除以二等于六",
};
const inputTimings = Object.fromEntries(
  Object.entries(inputCues).map(([id, cues]) => [
    id,
    cues.map(([phrase, inputs]) => ({
      start: phraseTime(audio[id], phrase, "start"),
      inputs,
    })),
  ]),
);
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
      row.id === "D25" || row.id === "D16"
        ? { start: row.from, end: row.from + audioLeadFrames }
        : null,
    stages:
      row.id === "D35"
        ? [
            { step: 1, ms: Math.max(0, row.revealMs - 200) },
            {
              step: 2,
              ms: Math.max(
                0,
                phraseTime(audio[row.id], "一百份输入", "start") - 200,
              ),
            },
          ]
        : row.id === "D39"
          ? [
              { step: 1, ms: Math.max(0, row.revealMs - 200) },
              {
                step: 2,
                ms: Math.max(
                  0,
                  phraseTime(audio[row.id], "保存结果", "start") - 200,
                ),
              },
              {
                step: 3,
                ms: Math.max(
                  0,
                  phraseTime(audio[row.id], "使用精确分数时", "start") - 200,
                ),
              },
              {
                step: 4,
                ms: Math.max(
                  0,
                  phraseTime(audio[row.id], "因此本章", "start") - 200,
                ),
              },
            ]
          : row.id === "D40"
            ? [
                { step: 1, ms: Math.max(0, row.revealMs - 200) },
                {
                  step: 2,
                  ms: Math.max(
                    0,
                    phraseTime(audio[row.id], "能不能利用位置关系", "start") -
                      200,
                  ),
                },
              ]
            : row.id === "D25"
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
    activeInputs: (inputTimings[row.id] ?? []).reduce(
      (last, cue) => (ms >= cue.start ? cue.inputs : last),
      [] as number[],
    ),
    pulse: spokenWordPulse(audio[row.id], ms),
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
      row.id === "D25" || row.id === "D16"
        ? Math.max(0, Math.min(1, frame / audioLeadFrames))
        : row.id === "D26" || row.id === "D17"
          ? 1
          : 0,
    visibleStep: row.stages.reduce(
      (step, stage) => (ms >= stage.ms ? stage.step : step),
      row.previousStep,
    ),
  };
}
