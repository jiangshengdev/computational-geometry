import { createShotTimeline } from "./shot-timeline.ts";
import {
  clauses,
  wordsInTextRange,
  type AudioTiming,
  type Caption,
} from "./timing.ts";
/** Shared frame adaptation for measured, complete-shot narration. */
export function measuredShotRows<
  S extends { id: string; page: string; visibleStep: number },
>({
  shots,
  pages,
  audio,
  captions: mapped,
  fps,
  audioLeadFrames,
}: {
  shots: S[];
  pages: Record<string, { holdAfterSeconds: number }>;
  audio: Record<string, AudioTiming>;
  captions: Record<string, (Caption & { source: number })[]>;
  fps: number;
  audioLeadFrames: number;
}) {
  const shared = createShotTimeline({
    shots: shots.map((shot) => ({
      ...shot,
      step: shot.visibleStep,
      pauseAfter: 1,
    })),
    pages,
    timing: audio,
    captions: mapped,
    fps,
    audioLeadFrames,
  });
  return shared.timelineFor().map((row, index) => {
    const spoken = clauses(audio[row.id].speech).map(({ text, offset }) => {
      const words = wordsInTextRange(
        audio[row.id],
        offset,
        offset + text.length,
      );
      if (!words.length) throw Error(`${row.id}: missing spoken phrase timing`);
      const last = words[words.length - 1];
      return {
        text,
        start: audioLeadFrames + Math.floor((words[0].startMs * fps) / 1000),
        end:
          audioLeadFrames +
          Math.ceil(((last.startMs + last.durationMs) * fps) / 1000),
      };
    });
    return {
      ...(row as Omit<typeof row, "captions">),
      pauseAfter:
        shots[index + 1]?.page !== row.page
          ? pages[row.page].holdAfterSeconds
          : 1,
      audioEndFrame: audioLeadFrames + row.speechFrames,
      revealMs: -500,
      stages: [] as { ms: number }[],
      spoken,
      captions: mapped[row.id].map((caption) => ({
        ...caption,
        start: audioLeadFrames + Math.floor((caption.startMs * fps) / 1000),
        end: audioLeadFrames + Math.ceil((caption.endMs * fps) / 1000),
      })),
    };
  });
}
