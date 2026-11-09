import { shots, pages } from "./storyboard.ts";
import captionData from "./captions.json" with { type: "json" };
import audioData from "./audio-timing.json" with { type: "json" };
import { measuredShotRows } from "../../../shared/speech/measured-shot-rows.ts";
import {
  type AudioTiming,
  type Caption,
} from "../../../shared/speech/timing.ts";
export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "measured-narration";
export const audio = audioData as Record<string, AudioTiming>;
const mapped = captionData as Record<string, (Caption & { source: number })[]>;
export const rows = measuredShotRows({
  shots,
  pages,
  audio,
  captions: mapped,
  fps,
  audioLeadFrames,
});
export const durationInFrames = rows.reduce(
  (sum, row) => sum + row.durationInFrames,
  0,
);
export type TimelineRow = (typeof rows)[number];
const motionAnchors: Record<string, string> = {
  SC14: "蓝色输入加入",
  SC15: "橙色输入加入",
  SC16: "紫色输入加入",
  SC17: "绿色输入加入",
  SC22: "低处块改为",
  SC27: "右侧绿色在下",
  SC32: "在右侧排在蓝色下方",
  SC33: "橙色退出",
  SC34: "绿色退出",
  SC35: "蓝色退出",
};
function motionCue(row: TimelineRow, anchor = motionAnchors[row.id]) {
  if (!anchor)
    return {
      start: row.spoken[0].start,
      end: row.spoken[row.spoken.length - 1].end,
    };
  const matches = row.spoken.filter((c) => c.text.includes(anchor));
  if (matches.length !== 1)
    throw Error(`${row.id}: missing or ambiguous motion cue ${anchor}`);
  return matches[0];
}
export const motionStart = (row: TimelineRow, anchor?: string) =>
  motionCue(row, anchor).start;
export const motionEnd = (row: TimelineRow, anchor?: string) =>
  motionCue(row, anchor).end;
const progressAt = (frame: number, start: number, end: number) =>
  Math.max(0, Math.min(1, (frame - start) / (end - start)));
export function visualAt(row: TimelineRow, frame: number) {
  const activeCaption = row.captions.findIndex(
    (c) => frame >= c.start && frame < c.end,
  );
  const started = row.captions.filter((c) => frame >= c.start);
  const reached = row.spoken.filter((c) => frame >= c.start).map((c) => c.text);
  const secondPair = row.id === "SC12" && frame >= row.spoken[2].start;
  const emphasis =
    row.id === "SC12"
      ? {
          start: row.spoken[secondPair ? 2 : 0].start,
          end: row.spoken[secondPair ? 3 : 1].end,
        }
      : row.id === "SC35"
        ? motionCue(
            row,
            reached.some((c) => c.includes("紫色退出"))
              ? "紫色退出"
              : "蓝色退出",
          )
        : {
            start: row.spoken[0].start,
            end: row.spoken[row.spoken.length - 1].end,
          };
  return {
    visibleStep: row.visibleStep,
    caption: started[started.length - 1]?.text ?? row.previousCaption,
    thinking: frame >= row.audioEndFrame,
    active:
      frame >= row.spoken[0].start &&
      frame < row.spoken[row.spoken.length - 1].end,
    diagramActive: frame >= emphasis.start && frame < emphasis.end,
    secondPair,
    activeCaption,
    progress: progressAt(frame, emphasis.start, emphasis.end),
    reached,
    motion: progressAt(frame, motionStart(row), motionEnd(row)),
    secondMotion:
      row.id === "SC35"
        ? progressAt(
            frame,
            motionStart(row, "紫色退出"),
            motionEnd(row, "紫色退出"),
          )
        : 0,
  };
}
export type VisualState = ReturnType<typeof visualAt>;
