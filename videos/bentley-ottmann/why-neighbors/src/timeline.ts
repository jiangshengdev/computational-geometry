import timing from "./audio-timing.json" with { type: "json" };
import captions from "./captions.json" with { type: "json" };
import { createShotTimeline } from "../../../shared/speech/shot-timeline.ts";
import { createTeachingCues } from "../../../shared/speech/teaching-cues.ts";
import {
  phraseTime,
  type AudioTiming,
  type Caption,
} from "../../../shared/speech/timing.ts";
import { shots, pages } from "./lesson.ts";
import { teachingCues, reveals } from "./teaching-cues.ts";
export const fps = 60;
export const audioLeadFrames = 12;
const audio = timing as Record<string, AudioTiming>;
export const lessonCues = createTeachingCues(audio, teachingCues);
const shared = createShotTimeline({
  shots,
  pages,
  timing: audio,
  captions: captions as Record<string, Caption[]>,
  fps,
  audioLeadFrames,
});
export const timelineFor = () =>
  shared.timelineFor().map((row, index, rows) => {
    const stages = reveals[row.id].map(([step, phrase]) => ({
      step,
      ms: Math.max(0, phraseTime(audio[row.id], phrase, "start") - 200),
    }));
    const shiftEnd =
      row.page === "earliest"
        ? row.from + audioLeadFrames + Math.ceil((stages[1].ms * fps) / 1000)
        : 0;
    return {
      ...row,
      priorCueNames: rows
        .slice(0, index)
        .filter((earlier) => earlier.page === row.page)
        .flatMap((earlier) => teachingCues[earlier.id] ?? [])
        .flatMap((cue) => (cue.name ? [cue.name] : [])),
      stages,
      mainShift: shiftEnd ? { start: shiftEnd - 24, end: shiftEnd } : null,
    };
  });
export type TimelineRow = ReturnType<typeof timelineFor>[number];
export function visualAt(row: TimelineRow, frame: number) {
  const ms = ((frame - audioLeadFrames) * 1000) / fps;
  const reached = row.stages.filter(
    (stage) => frame >= audioLeadFrames + Math.ceil((stage.ms * fps) / 1000),
  );
  const current = lessonCues.at(row.id, ms);
  const shift = row.mainShift
    ? Math.max(
        0,
        Math.min(
          1,
          (row.from + frame - row.mainShift.start) /
            (row.mainShift.end - row.mainShift.start),
        ),
      )
    : 1;
  const focus =
    current || row.priorCueNames.length
      ? {
          ...(current ?? { phrase: "", active: false, progress: 1 }),
          reached: [...row.priorCueNames, ...(current?.reached ?? [])],
        }
      : undefined;
  return {
    ...shared.visualAt(row, frame),
    visibleStep: reached[reached.length - 1]?.step ?? row.previousStep,
    focus,
    diagramProgress: shift * shift * (3 - 2 * shift),
  };
}
