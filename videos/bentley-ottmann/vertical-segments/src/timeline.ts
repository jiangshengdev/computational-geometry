import { shots } from "./storyboard.ts";
export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "provisional-visual-inspection";
let cursor = 0;
let previousCaption = "";
export const rows = shots.map((shot) => {
  let end = audioLeadFrames;
  const captions = shot.captions.map((text) => {
    const start = end;
    end += Math.max(180, text.length * 12);
    return { text, start, end };
  });
  const durationInFrames = end + shot.pauseAfter * fps;
  const row = {
    ...shot,
    from: cursor,
    durationInFrames,
    captions,
    previousCaption,
    readingFrames: end - audioLeadFrames,
    revealMs: 0,
    stages: [] as { ms: number }[],
  };
  cursor += durationInFrames;
  previousCaption = captions.at(-1)!.text;
  return row;
});
export const durationInFrames = cursor;
export type TimelineRow = (typeof rows)[number];
const motionAnchors: Record<string, [string, string?]> = {
  VS09: ["坐标轴固定"],
  VS31: ["两项都通过"],
  VS33: ["引用第三章", "更新后"],
  VS38: ["现在登记"],
  VS48: ["先用系数", "高度仍是"],
  VS50: ["先求系数", "高度是二"],
  VS55: ["下端的新", "上端的新"],
  VS58: ["两个新端点", "同一个事件"],
  VS60: ["先让蓝色", "两对各产生"],
  VS62: ["新 x 坐标", "三对各自恢复"],
};
export function motionCue(row: TimelineRow) {
  const anchors = motionAnchors[row.id];
  const find = (text: string) => {
    const hits = row.captions.filter((c) => c.text.includes(text));
    if (hits.length !== 1)
      throw Error(row.id + ": ambiguous/missing cue " + text);
    return hits[0];
  };
  return anchors
    ? { start: find(anchors[0]).start, end: find(anchors[1] ?? anchors[0]).end }
    : { start: row.captions[0].start, end: row.captions[0].end };
}
export function visualAt(row: TimelineRow, frame: number) {
  const captionIndex = row.captions.findLastIndex((c) => frame >= c.start);
  const { start: motionStart, end: motionEnd } = motionCue(row);
  return {
    visibleStep: row.visibleStep,
    caption: row.captions[captionIndex]?.text ?? row.previousCaption,
    thinking: frame >= audioLeadFrames + row.readingFrames,
    active: frame >= motionStart && frame < motionEnd,
    motion: Math.max(
      0,
      Math.min(1, (frame - motionStart) / (motionEnd - motionStart)),
    ),
    captionIndex,
    captionProgress:
      captionIndex < 0
        ? 0
        : Math.min(
            1,
            (frame - row.captions[captionIndex].start) /
              (row.captions[captionIndex].end -
                row.captions[captionIndex].start),
          ),
  };
}
export type VisualState = ReturnType<typeof visualAt>;
