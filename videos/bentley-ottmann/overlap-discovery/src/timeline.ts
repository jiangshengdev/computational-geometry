import { shots, pages } from "./storyboard.ts";
import { phraseTime, type AudioTiming } from "../../../shared/speech/timing.ts";
import { createShotTimeline } from "../../../shared/speech/shot-timeline.ts";
import audioData from "./audio-timing.json" with { type: "json" };
import captionData from "./captions.json" with { type: "json" };

export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "measured-narration";
export const audio = audioData as Record<string, AudioTiming>;
// Teaching transitions use actual spoken phrases and original measured words.
const phaseAnchors: Record<string, string[]> = {
  OD10: ["求得唯一候选点"],
  OD11: [
    "候选严格在当前右侧",
    "第一组覆盖它",
    "第二组也覆盖它",
    "后两个条件各保证",
  ],
  OD20: ["也不超过另一组的六", "并预约这个真实交点"],
  OD21: ["最远右端增大时", "就重新检查这个组", "上下邻组", "某一侧没有邻组"],
  OD23: ["到候选点时", "到候选点时"],
  OD24: ["到 x 坐标六处", "到七处"],
  OD25: ["因此删除结束者", "组才退出"],
  OD28: ["到一处", "到一处"],
  OD37: ["上下边界", "以及空块移走后"],
  OD35: ["按斜率从小到大排列"],
  OD39: ["某组覆盖延长", "必须补检当前邻居", "当前相遇块外的组"],
  OD44: ["当时的检查就会预约它"],
  OD47: [
    "至少一个原来不足的组延长了覆盖",
    "检查时两组已经同时够到目标",
    "即使较早的加入",
    "只让一组够到",
    "最后使两组同时够到",
  ],
  OD48: ["于是补检必会预约"],
};
const shared = createShotTimeline({
  shots: shots.map((shot) => ({
    ...shot,
    step: shot.visibleStep,
    pauseAfter: shot.thinkAfter ?? 1,
  })),
  pages,
  timing: audio,
  captions: captionData,
  fps,
  audioLeadFrames,
});
export const rows = shared.timelineFor().map((shot, index) => {
  const captions = captionData[shot.id as keyof typeof captionData].map(
    (caption) => ({
      text: caption.text,
      start: audioLeadFrames + Math.floor((caption.startMs * fps) / 1000),
      end: audioLeadFrames + Math.ceil((caption.endMs * fps) / 1000),
    }),
  );
  const pauseAfter = Math.max(
    shot.thinkAfter ?? 1,
    shots[index + 1]?.page !== shot.page
      ? pages[shot.page].holdAfterSeconds
      : 0,
  );
  const row = {
    ...shot,
    captions,
    phaseStarts: (phaseAnchors[shot.id] ?? []).map(
      (anchor) =>
        audioLeadFrames +
        Math.floor((phraseTime(audio[shot.id], anchor, "start") * fps) / 1000),
    ),
    pauseAfter,
    revealMs: -500,
    stages: [] as { ms: number }[],
  };
  return row;
});
export type TimelineRow = (typeof rows)[number];
export const durationInFrames = rows.reduce(
  (sum, row) => sum + row.durationInFrames,
  0,
);
export function visualAt(row: TimelineRow, frame: number) {
  const end = audioLeadFrames + row.speechFrames;
  const introduced = row.captions.filter((c) => frame >= c.start);
  const progress = Math.max(
    0,
    Math.min(1, (frame - audioLeadFrames) / row.speechFrames),
  );
  const phase = row.phaseStarts.filter((start) => frame >= start).length;
  const operationStart = phase ? row.phaseStarts[phase - 1] : audioLeadFrames;
  const operationEnd = row.phaseStarts[phase] ?? end;
  return {
    visibleStep: row.visibleStep,
    caption: introduced[introduced.length - 1]?.text ?? row.previousCaption,
    thinking: frame >= end,
    active: frame >= audioLeadFrames && frame < end,
    progress,
    phase,
    operationProgress: Math.max(
      0,
      Math.min(
        1,
        (frame - operationStart) / Math.max(1, operationEnd - operationStart),
      ),
    ),
  };
}
export type VisualState = ReturnType<typeof visualAt>;
