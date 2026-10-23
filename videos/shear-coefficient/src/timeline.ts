import timingData from "./audio-timing.json" with { type: "json" };
import captionData from "./captions.json" with { type: "json" };
import { pages, shots } from "./storyboard.ts";
import {
  captionAt,
  phraseTime,
  type AudioTiming,
  type Caption,
} from "./speech-timing.ts";

export const fps = 60;
export const audioLeadFrames = 12;
const timing = timingData as Record<string, AudioTiming>;
const captions = captionData as Record<string, Caption[]>;
export function timelineFor(issue?: string) {
  let from = 0;
  return shots
    .filter((shot) => !issue || shot.id.startsWith(`${issue}-`))
    .map((shot, index, selected) => {
      const audio = timing[shot.id];
      if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0)
        throw Error(
          `Generate and verify audio for ${shot.id} before previewing`,
        );
      const speechFrames = Math.ceil(audio.duration * fps);
      const endsPage = selected[index + 1]?.page !== shot.page;
      const pauseSeconds = Math.max(
        shot.pauseAfter ?? 0.4,
        endsPage ? (pages[shot.page].holdAfterSeconds ?? 3) : 0,
      );
      const durationInFrames =
        audioLeadFrames + speechFrames + Math.round(pauseSeconds * fps);
      const previous = selected[index - 1];
      const samePage = previous?.page === shot.page;
      const previousCues = samePage ? captions[previous.id] : [];
      const revealMs = shot.reveal
        ? phraseTime(audio, shot.reveal, "start")
        : audio.words[0].startMs;
      const motion = shot.motion
        ? {
            start: phraseTime(audio, shot.motion.start, "start"),
            end: phraseTime(audio, shot.motion.end, "end"),
            midpoint: shot.motion.midpoint
              ? phraseTime(audio, shot.motion.midpoint, "end")
              : undefined,
          }
        : null;
      const row = {
        ...shot,
        from,
        durationInFrames,
        speechFrames,
        revealMs,
        motionTiming: motion,
        previousStep: samePage ? previous.step : 0,
        previousCaption: previousCues?.[previousCues.length - 1]?.text ?? "",
      };
      from += durationInFrames;
      return row;
    });
}
export type TimelineRow = ReturnType<typeof timelineFor>[number];
const progressAt = (ms: number, interval: { start: number; end: number }) =>
  Math.max(
    0,
    Math.min(1, (ms - interval.start) / (interval.end - interval.start)),
  );
export function visualAt(row: TimelineRow, frame: number) {
  const ms = ((frame - audioLeadFrames) * 1000) / fps;
  // The midpoint anchor means A is directly above B (x=1), not half
  // the movement distance. In the 0.006 exercise the destination is 1.2.
  const midpointProgress = 1 / (pages[row.page].diagram?.targetX ?? 2);
  return {
    caption: captionAt(captions[row.id], ms, row.previousCaption),
    progress:
      row.motionTiming?.midpoint !== undefined
        ? ms <= row.motionTiming.midpoint
          ? midpointProgress *
            progressAt(ms, {
              start: row.motionTiming.start,
              end: row.motionTiming.midpoint,
            })
          : midpointProgress +
            (1 - midpointProgress) *
              progressAt(ms, {
                start: row.motionTiming.midpoint,
                end: row.motionTiming.end,
              })
        : row.motionTiming
          ? progressAt(ms, row.motionTiming)
          : 1,
    visibleStep: ms >= row.revealMs ? row.step : row.previousStep,
    thinking: Boolean(
      row.pauseAfter && frame >= audioLeadFrames + row.speechFrames,
    ),
  };
}
