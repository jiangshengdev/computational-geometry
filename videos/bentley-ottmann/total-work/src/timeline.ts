import { pageList, shots } from "./storyboard.ts";
import audioData from "./audio-timing.json" with { type: "json" };
import captionData from "./captions.json" with { type: "json" };
import { measuredShotRows } from "../../../shared/speech/measured-shot-rows.ts";
import {
  phraseTime,
  type AudioTiming,
  type Caption,
} from "../../../shared/speech/timing.ts";
export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "measured-narration";
export const audio = audioData as Record<string, AudioTiming>;
export const rows = measuredShotRows({
  shots: shots.map((shot) => ({
    ...shot,
    visibleStep: shot.step,
  })),
  pages: Object.fromEntries(
    pageList.map((page) => [
      page.id,
      { holdAfterSeconds: page.holdAfterSeconds },
    ]),
  ),
  audio,
  captions: captionData as Record<string, (Caption & { source: number })[]>,
  fps,
  audioLeadFrames,
  betweenShotPauseSeconds: 0.5,
});
export const durationInFrames = rows.reduce(
  (sum, row) => sum + row.durationInFrames,
  0,
);
export type TimelineRow = (typeof rows)[number];
export function cuesFor(row: TimelineRow) {
  const at = (text: string, edge: "start" | "end" = "start") =>
    audioLeadFrames +
    Math.ceil((phraseTime(audio[row.id], text, edge) * fps) / 1000);
  const span = (start: string, end: string) => ({
    start: at(start),
    end: at(end, "end"),
  });
  const motion =
    row.id === "TW03"
      ? span("依次记录这六个不同的原始无序输入对", "但每对身份分别保留")
      : row.id === "TW15"
        ? span("每两个组各选一份成员", "不同组对选出的原始对不同")
        : { start: row.spoken[0].start, end: row.spoken.at(-1)!.end };
  return {
    motion,
    ledger:
      row.id === "TW06"
        ? [
            at("前三个事件各有一组参与"),
            at("前三个事件各有一组参与", "end"),
            at("第四个事件有四组参与"),
            at("第四个事件有四组参与", "end"),
            at("最后三个事件也各有一组参与"),
            at("最后三个事件也各有一组参与", "end"),
          ]
        : [],
    remove:
      row.id === "TW22"
        ? at("只按结束身份删除短成员", "end")
        : row.id === "TW23"
          ? at("组才变空", "end")
          : 0,
    inputs:
      row.id === "TW01"
        ? [
            at("蓝色与橙色两条穿过原点"),
            at("紫色这一条在这里结束"),
            at("绿色这一条从这里开始"),
          ]
        : [],
    neighbors:
      row.id === "TW33"
        ? [
            at("内部邻居对数至多是组数减一"),
            at("内部邻居对数至多是组数减一", "end"),
            at("两端各至多一对"),
            at("两端各至多一对", "end"),
          ]
        : [],
  };
}
export function visualAt(row: TimelineRow, frame: number) {
  const cue = row.captions.findLast((c) => frame >= c.start);
  const timing = cuesFor(row);
  const progress = Math.max(
    0,
    Math.min(
      1,
      (frame - timing.motion.start) /
        Math.max(1, timing.motion.end - timing.motion.start),
    ),
  );
  const ledger = timing.ledger;
  // Each group of ledger rows is reached during its measured spoken phrase.
  const ledgerCount =
    row.id !== "TW06"
      ? 7
      : frame < ledger[0]
        ? 0
        : frame < ledger[1]
          ? Math.min(
              3,
              1 +
                Math.floor(
                  (3 * (frame - ledger[0])) /
                    Math.max(1, ledger[1] - ledger[0]),
                ),
            )
          : frame < ledger[2]
            ? 3
            : frame < ledger[4]
              ? 4
              : Math.min(
                  7,
                  5 +
                    Math.floor(
                      (3 * (frame - ledger[4])) /
                        Math.max(1, ledger[5] - ledger[4]),
                    ),
                );
  return {
    visibleStep: row.step,
    captionSource: cue?.source ?? 0,
    caption: cue?.text ?? row.previousCaption,
    thinking: frame >= row.audioEndFrame,
    progress,
    active: frame >= timing.motion.start && frame < timing.motion.end,
    ledgerCount,
    membersRemoved: frame >= timing.remove,
    inputSelected:
      row.id === "TW01"
        ? frame < timing.inputs[0]
          ? -1
          : frame < timing.inputs[1]
            ? 1
            : frame < timing.inputs[2]
              ? 2
              : 3
        : -1,
    neighborCount:
      row.id === "TW33" ? timing.neighbors.filter((t) => frame >= t).length : 4,
  };
}
export type VisualState = ReturnType<typeof visualAt>;
