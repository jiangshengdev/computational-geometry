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
  "232-02": [
    [3, "所以"],
    [4, "沿用前集结论"],
    [5, "约分后"],
    [6, "都不超过"],
  ],
  "232-04": [[1, "通分"]],
  "232-05": [
    [2, "它们"],
    [3, "分母乘积"],
    [4, "因此"],
    [5, "实际的"],
  ],
  "232-07": [
    [2, "把两个"],
    [3, "其中"],
    [4, "Q与T"],
    [5, "都不超过"],
  ],
  "232-08": [
    [6, "第一个分数"],
    [7, "通分以后"],
  ],
  "232-10": [
    [9, "横坐标不同"],
    [10, "它是"],
    [11, "除以"],
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
  const rows = shared.timelineFor(issue).map((row) => ({
    ...row,
    stages: (rowPhrases[row.id] ?? [[row.step, ""]]).map(([step, phrase]) => ({
      step,
      ms: phrase ? phraseTime(audio[row.id], phrase, "start") : row.revealMs,
    })),
  }));
  return rows.map((row) => {
    const page = pages[row.page];
    const split = page.mainSplitAfterGroup;
    if (!split) return { ...row, mainShift: null };
    const firstColumnSteps = page.groups
      .slice(0, split)
      .reduce((sum, group) => sum + group.count, 0);
    const nextColumn = rows.find(
      (candidate) =>
        candidate.page === row.page &&
        candidate.stages.some((stage) => stage.step > firstColumnSteps),
    );
    const stage = nextColumn?.stages.find(
      (candidate) => candidate.step > firstColumnSteps,
    );
    if (!nextColumn || !stage)
      throw Error(`Missing second-column reveal: ${row.page}`);
    // Finish moving at the existing reveal. The half-second transition spans
    // the inter-shot pause; absolute frames keep it continuous across shots.
    const end =
      nextColumn.from + audioLeadFrames + Math.ceil((stage.ms * fps) / 1000);
    return { ...row, mainShift: { start: end - fps / 2, end } };
  });
}
export function visualAt(
  row: ReturnType<typeof timelineFor>[number],
  frame: number,
) {
  const ms = ((frame - audioLeadFrames) * 1000) / fps;
  const revealed = row.stages.filter((stage) => stage.ms <= ms);
  const shift = row.mainShift
    ? Math.max(
        0,
        Math.min(
          1,
          (row.from + frame - row.mainShift.start) /
            (row.mainShift.end - row.mainShift.start),
        ),
      )
    : 1;
  return {
    ...shared.visualAt(row, frame),
    visibleStep: revealed[revealed.length - 1]?.step ?? row.previousStep,
    mainShiftProgress: shift * shift * (3 - 2 * shift),
  };
}
export type TimelineRow = ReturnType<typeof timelineFor>[number];
