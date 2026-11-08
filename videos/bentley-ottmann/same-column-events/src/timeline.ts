import { shots, pages } from "./storyboard.ts";
export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "silent-inspection-only";
// Reading estimates enable inspection only. No audio files or measured cues exist.
let cursor = 0;
export const rows = shots.map((shot, index) => {
  let local = audioLeadFrames;
  const captions = shot.captions
    .flatMap((text) => text.match(/[^，。；？！]+[，。；？！]?/g) ?? [])
    .map((text) => {
      const start = local;
      local += Math.ceil(Math.max(2, text.length / 4) * fps);
      return { text, start, end: local };
    });
  const pauseAfter =
    shots[index + 1]?.page !== shot.page
      ? pages[shot.page].holdAfterSeconds
      : 1;
  const row = {
    ...shot,
    from: cursor,
    durationInFrames: local + pauseAfter * fps,
    readingFrames: local - audioLeadFrames,
    pauseAfter,
    revealMs: -500,
    stages: [] as { ms: number }[],
    captions,
    previousCaption:
      index && shots[index - 1].page === shot.page
        ? shots[index - 1].captions
            .slice(-1)[0]
            .match(/[^，。；？！]+[，。；？！]?/g)!
            .slice(-1)[0]
        : "",
  };
  cursor += row.durationInFrames;
  return row;
});
export const durationInFrames = cursor;
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
export function motionStart(row: TimelineRow, anchor = motionAnchors[row.id]) {
  return anchor
    ? row.captions.find((c) => c.text.includes(anchor))!.start
    : audioLeadFrames + 60;
}
export function visualAt(row: TimelineRow, frame: number) {
  const activeCaption = row.captions.findIndex(
    (c) => frame >= c.start && frame < c.end,
  );
  const end = audioLeadFrames + row.readingFrames;
  const started = row.captions.filter((c) => frame >= c.start);
  const progress = Math.max(
    0,
    Math.min(1, (frame - audioLeadFrames) / row.readingFrames),
  );
  return {
    visibleStep: row.visibleStep,
    caption: started[started.length - 1]?.text ?? row.previousCaption,
    thinking: frame >= end,
    active: frame >= audioLeadFrames && frame < end,
    activeCaption,
    progress,
    reached: started.map((c) => c.text),
    motion: Math.max(0, Math.min(1, (frame - motionStart(row)) / 90)),
    secondMotion:
      row.id === "SC35"
        ? Math.max(0, Math.min(1, (frame - motionStart(row, "紫色退出")) / 90))
        : 0,
  };
}
export type VisualState = ReturnType<typeof visualAt>;
