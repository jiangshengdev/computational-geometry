import { pageList, shots } from "./storyboard.ts";
import audioData from "./audio-timing.json" with { type: "json" };
import captionData from "./captions.json" with { type: "json" };
import sentences from "./sentence-plan.json" with { type: "json" };
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
  shots: shots.map((shot) => ({ ...shot, visibleStep: shot.step })),
  pages: Object.fromEntries(
    pageList.map((page) => [page.id, { holdAfterSeconds: 2 }]),
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
  const first = sentences[row.id as keyof typeof sentences][0].speech.join("");
  return {
    activeStart: at(first),
    activeEnd: at(first, "end"),
    extension: row.id === "OC35" ? at("图中新增成员使最远右端延长", "end") : 0,
    queued: row.id === "OC35" ? at("确认交点时只能用真实闭范围", "end") : 0,
    updated:
      row.id === "OC39" ? at("成员、顺序、覆盖和累计结果的保证继续成立") : 0,
    updateEnd:
      row.id === "OC39"
        ? at("成员、顺序、覆盖和累计结果的保证继续成立", "end")
        : 0,
    taken: row.id === "OC45" ? at("必然取到 Q 这个位置", "end") : 0,
    participants: row.id === "OC45" ? at("到站后仍收齐全部参与者") : 0,
    complete: row.id === "OC52" ? at("所以全部真实事件都已到达") : 0,
  };
}
export function visualAt(row: TimelineRow, frame: number) {
  const cue = row.captions.findLast((c) => frame >= c.start);
  const timing = cuesFor(row);
  return {
    visibleStep: row.step,
    caption: cue?.text ?? row.previousCaption,
    thinking: frame >= row.audioEndFrame,
    active: frame >= timing.activeStart && frame < timing.activeEnd,
    coverageStage:
      row.id !== "OC35"
        ? undefined
        : frame < timing.extension
          ? "before"
          : frame < timing.queued
            ? "extended"
            : "queued",
    preservationAfter: row.id === "OC39" && frame >= timing.updated,
    boundaryDiagramProgress:
      row.id === "OC39" ? Math.min(1, frame / audioLeadFrames) : 1,
    preservationEmphasis:
      row.id === "OC39" && frame >= timing.updated && frame < timing.updateEnd,
    nextEventTaken: row.id === "OC45" && frame >= timing.taken,
    nextEventParticipants: row.id === "OC45" && frame >= timing.participants,
    emptyQueueConclusion: row.id === "OC52" && frame >= timing.complete,
  };
}
export type VisualState = ReturnType<typeof visualAt>;
