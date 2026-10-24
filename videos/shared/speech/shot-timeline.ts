import {
  captionAt,
  phraseTime,
  type AudioTiming,
  type Caption,
} from "./timing.ts";

type Shot = {
  id: string;
  page: string;
  step: number;
  pauseAfter?: number;
  reveal?: string;
  motion?: { start: string; end: string };
};

/** Preserve original audio duration; page holds and thinking windows add time. */
export function createShotTimeline<S extends Shot>({
  shots,
  pages,
  timing,
  captions,
  fps,
  audioLeadFrames,
}: {
  shots: S[];
  pages: Record<string, { holdAfterSeconds?: number }>;
  timing: Record<string, AudioTiming>;
  captions: Record<string, Caption[]>;
  fps: number;
  audioLeadFrames: number;
}) {
  function timelineFor(issue?: string) {
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
  function visualAt(
    row: ReturnType<typeof timelineFor>[number],
    frame: number,
  ) {
    const ms = ((frame - audioLeadFrames) * 1000) / fps;
    return {
      caption: captionAt(captions[row.id], ms, row.previousCaption),
      progress: row.motionTiming
        ? Math.max(
            0,
            Math.min(
              1,
              (ms - row.motionTiming.start) /
                (row.motionTiming.end - row.motionTiming.start),
            ),
          )
        : 1,
      visibleStep: ms >= row.revealMs ? row.step : row.previousStep,
      thinking: Boolean(
        row.pauseAfter && frame >= audioLeadFrames + row.speechFrames,
      ),
    };
  }
  return { timelineFor, visualAt };
}
