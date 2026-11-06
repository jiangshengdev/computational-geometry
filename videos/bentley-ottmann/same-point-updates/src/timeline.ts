import { shots, pages } from "./storyboard.ts";
import { createShotTimeline } from "../../../shared/speech/shot-timeline.ts";
import type { AudioTiming, Caption } from "../../../shared/speech/timing.ts";
import audioData from "./audio-timing.json" with { type: "json" };
import captionData from "./captions.json" with { type: "json" };
export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "measured-narration";
export const audio = audioData as Record<string, AudioTiming>;
const measured = captionData as Record<
  string,
  (Caption & { source: number; target: string | null; focus: string | null })[]
>;
const shared = createShotTimeline({
  shots: shots.map((shot) => ({
    ...shot,
    step: shot.visibleStep,
    pauseAfter: shot.thinkAfter ?? 1,
  })),
  pages,
  timing: audio,
  captions: measured,
  fps,
  audioLeadFrames,
});
export const rows = shared.timelineFor().map((shot, index) => {
  return {
    ...shot,
    captions: measured[shot.id].map((c) => ({
      ...c,
      start: audioLeadFrames + Math.ceil((c.startMs * fps) / 1000),
      end: audioLeadFrames + Math.ceil((c.endMs * fps) / 1000),
    })),
    audioEndFrame: audioLeadFrames + shot.speechFrames,
    revealMs: 0,
    stages: [] as { ms: number }[],
    previousReached: shots
      .slice(0, index)
      .filter((s) => s.page === shot.page)
      .flatMap((s) => s.cues.flatMap((c) => (c.target ? [c.target] : []))),
  };
});
export type TimelineRow = (typeof rows)[number];
export const durationInFrames = rows.reduce(
  (total, row) => total + row.durationInFrames,
  0,
);
export function visualAt(row: TimelineRow, frame: number) {
  // Continue one semantic action through its internal measured pauses.
  const active = row.captions.find(
    (c, index) =>
      frame >= c.start &&
      frame <
        (c.target && c.target === row.captions[index + 1]?.target
          ? row.captions[index + 1].start
          : c.end),
  );
  const reached = row.captions.filter((c) => frame >= c.start);
  let first = active ? row.captions.indexOf(active) : -1;
  let last = first;
  if (active?.target) {
    while (first > 0 && row.captions[first - 1].target === active.target)
      first--;
    while (
      last + 1 < row.captions.length &&
      row.captions[last + 1].target === active.target
    )
      last++;
  }
  return {
    visibleStep: row.visibleStep,
    caption:
      active?.text ?? reached[reached.length - 1]?.text ?? row.previousCaption,
    target: active?.target ?? null,
    focus: active?.focus,
    reached: [
      ...row.previousReached,
      ...reached.flatMap((c) => (c.target ? [c.target] : [])),
    ],
    progress: active?.target
      ? (frame - row.captions[first].start) /
        (row.captions[last].end - row.captions[first].start)
      : 1,
    thinking: frame >= row.audioEndFrame,
  };
}
export type VisualState = ReturnType<typeof visualAt>;
export function rowAt(frame: number) {
  return (
    rows.find(
      (row) => frame >= row.from && frame < row.from + row.durationInFrames,
    ) ?? rows[rows.length - 1]
  );
}
