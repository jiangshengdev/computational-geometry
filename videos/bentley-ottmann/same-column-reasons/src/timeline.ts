import { pages, shots } from "./storyboard.ts";
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
export const rows = measuredShotRows({
  shots,
  pages,
  audio,
  captions: captionData as Record<string, (Caption & { source: number })[]>,
  fps,
  audioLeadFrames,
});
export const durationInFrames = rows.reduce(
  (sum, row) => sum + row.durationInFrames,
  0,
);
export type TimelineRow = (typeof rows)[number];
// Each operation spans its actual spoken explanation, independently of subtitle grouping.
const motionAnchors: Record<string, [string, string?]> = {
  SR10: ["本次移去的结束成员", "新插入或重新排列的组"],
  SR15: ["随后才移去身份"],
  SR17: ["直接用第三章的右侧斜率结论排序"],
  SR20: ["旧块为空而有开始者", "就在高度空隙插入"],
  SR22: ["各个相遇高度都采用右侧次序", "开始者已进入"],
  SR27: ["但目标组在这列只有目标高度", "不参加任何低处事件"],
  SR28: ["低处新插入或重新排列的组", "高度严格低于目标高度"],
  SR29: ["在目标块里选相邻两组", "它们也是整个顺序中的邻居"],
  SR38: ["取得最大值的那份输入", "覆盖从当前列到最远右端的整个闭范围"],
  SR46: ["新成员只在自己的开始位置加入", "若最远右端延长"],
  SR47: ["再移去结束成员"],
  SR48: ["空组退出", "并检查新接起来的邻居"],
};
export function motionCue(row: TimelineRow, anchors = motionAnchors[row.id]) {
  const find = (anchor: string) => {
    const matches = row.spoken.filter((c) => c.text.includes(anchor));
    if (matches.length !== 1)
      throw Error(`${row.id}: missing or ambiguous motion cue ${anchor}`);
    return matches[0];
  };
  if (!anchors)
    return {
      start: row.spoken[0].start,
      end: row.spoken[row.spoken.length - 1].end,
    };
  return {
    start: find(anchors[0]).start,
    end: find(anchors[1] ?? anchors[0]).end,
  };
}
export const motionStart = (row: TimelineRow) => motionCue(row).start;
export const motionEnd = (row: TimelineRow) => motionCue(row).end;
const progressAt = (frame: number, start: number, end: number) =>
  Math.max(0, Math.min(1, (frame - start) / (end - start)));
export function visualAt(row: TimelineRow, frame: number) {
  const started = row.captions.filter((c) => frame >= c.start);
  const spoken = row.spoken.filter((c) => frame >= c.start);
  const operation = (start: string, end?: string) => {
    const cue = motionCue(row, [start, end]);
    return progressAt(frame, cue.start, cue.end);
  };
  const second =
    row.id === "SR20"
      ? motionCue(row, ["新块为空", "就检查移去后新接起来的外侧两组"])
      : row.id === "SR29"
        ? motionCue(row, ["沿此前有限次事件", "回看这一次形成并持续保持的邻接"])
        : null;
  return {
    visibleStep: row.visibleStep,
    caption: started[started.length - 1]?.text ?? row.previousCaption,
    thinking: frame >= row.audioEndFrame,
    active:
      frame >= row.spoken[0].start &&
      frame < row.spoken[row.spoken.length - 1].end,
    phase: Math.max(0, spoken.length - 1),
    motion: progressAt(frame, motionStart(row), motionEnd(row)),
    secondMotion: second ? progressAt(frame, second.start, second.end) : 0,
    secondOperation: second ? frame >= second.start : false,
    firstCoverage:
      row.id === "SR43"
        ? operation("第二类分别检查候选 x 坐标不超过第一组最远右端")
        : 0,
    secondCoverage: row.id === "SR43" ? operation("也不超过第二组最远右端") : 0,
  };
}
export type VisualState = ReturnType<typeof visualAt>;
