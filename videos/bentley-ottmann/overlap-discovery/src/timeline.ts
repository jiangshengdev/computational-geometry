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
  OD20: ["也不超过另一组的六", "并预约这个真实交点"],
  OD23: ["到候选点时", "到候选点时"],
  OD24: ["到 x 坐标六处", "到七处"],
  OD28: ["到一处", "到一处"],
  OD37: ["上下边界", "以及空块移走后"],
  OD47: ["至少一个原来不足的组延长了覆盖", "检查时两组已经同时够到目标"],
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
