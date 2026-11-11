import { shots, pages } from "./storyboard.ts";
import captionData from "./captions.json" with { type: "json" };
import audioData from "./audio-timing.json" with { type: "json" };
import { measuredShotRows } from "../../../shared/speech/measured-shot-rows.ts";
import type { AudioTiming, Caption } from "../../../shared/speech/timing.ts";

export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "measured-narration";
export const audio = audioData as Record<string, AudioTiming>;
export const rows = measuredShotRows({
  shots,
  pages,
  audio,
  captions: captionData as Record<string, (Caption & { source: number })[]>,
  fps,
  audioLeadFrames,
  betweenShotPauseSeconds: 0,
});
export const durationInFrames = rows.reduce(
  (sum, row) => sum + row.durationInFrames,
  0,
);
export type TimelineRow = (typeof rows)[number];
// Operations follow measured spoken phrases, independently of subtitle grouping.
const motionAnchors: Record<string, [string, string?]> = {
  VS05: ["竖直输入同时包含", "就描述不了"],
  VS09: ["坐标轴固定", "把新坐标画成新点"],
  VS31: ["两项都通过", "才把这个位置登记"],
  VS33: ["橙色斜率零较小", "最高紫色"],
  VS38: ["现在登记"],
  VS40: ["紫色在蓝色下方", "最高是蓝色"],
  VS48: ["先用系数", "坐标零、一"],
  VS50: ["先求系数", "坐标零、二"],
  VS53: ["统一变换后", "两份仍在同一条直线上"],
  VS54: ["按第五章", "到两倍系数、二的整段"],
  VS55: ["下端的新", "高度二不变"],
  VS56: ["由整条线段对应结论", "恢复的是这两个边界"],
  VS58: ["两个新端点", "同一个事件"],
  VS60: ["先让蓝色", "两对各产生"],
  VS62: ["新 x 坐标", "三对各自恢复"],
};
export function motionCue(row: TimelineRow, anchors = motionAnchors[row.id]) {
  const find = (text: string) => {
    const hits = row.spoken.filter((c) => c.text.includes(text));
    if (hits.length !== 1)
      throw Error(row.id + ": ambiguous/missing cue " + text);
    return hits[0];
  };
  return anchors
    ? { start: find(anchors[0]).start, end: find(anchors[1] ?? anchors[0]).end }
    : { start: row.spoken[0].start, end: row.spoken[0].end };
}
const progressAt = (frame: number, start: number, end: number) =>
  Math.max(0, Math.min(1, (frame - start) / (end - start)));
export function visualAt(row: TimelineRow, frame: number) {
  const captionIndex = row.captions.findLastIndex((c) => frame >= c.start);
  const { start: motionStart, end: motionEnd } = motionCue(row);
  const boundaryPointIndex =
    row.id === "VS55" && frame >= motionCue(row, ["上端的新"]).start ? 1 : 0;
  const boundaryCue =
    row.id === "VS55"
      ? motionCue(
          row,
          boundaryPointIndex === 0
            ? ["下端的新", "高度一不变"]
            : ["上端的新", "高度二不变"],
        )
      : null;
  return {
    visibleStep: row.visibleStep,
    caption: row.captions[captionIndex]?.text ?? row.previousCaption,
    thinking: frame >= row.audioEndFrame,
    active: frame >= motionStart && frame < motionEnd,
    motion: progressAt(frame, motionStart, motionEnd),
    captionIndex,
    boundaryPointIndex,
    boundaryProgress: boundaryCue
      ? progressAt(frame, boundaryCue.start, boundaryCue.end)
      : 0,
    currentReport:
      row.id === "VS32"
        ? frame >= motionCue(row, ["首先记录"]).start
        : row.id === "VS39" &&
          frame >= motionCue(row, ["报告蓝色与紫色"]).start,
    firstPointPair:
      row.id === "VS60" && frame >= motionCue(row, ["先让蓝色"]).start,
    secondPointPair:
      row.id === "VS60" && frame >= motionCue(row, ["再与第二份"]).start,
    pointIdentityPair:
      row.id === "VS61" && frame >= motionCue(row, ["所以这一对也有"]).start,
  };
}
export type VisualState = ReturnType<typeof visualAt>;
