import timingData from "./audio-timing.json";
import { shots } from "./storyboard";

export const fps = 60;
export const audioLeadFrames = 12;
type Timing = { duration: number; speech: string; voice: string };
const timing = timingData as Record<string, Timing>;
export function timelineFor(issue?: string) {
  let from = 0;
  return shots
    .filter((shot) => !issue || shot.id.startsWith(`${issue}-`))
    .map((shot) => {
      const audio = timing[shot.id];
      if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0)
        throw Error(
          `Generate and verify audio for ${shot.id} before previewing`,
        );
      const speechFrames = Math.ceil(audio.duration * fps);
      const durationInFrames =
        audioLeadFrames +
        speechFrames +
        Math.round((shot.pauseAfter ?? 0.4) * fps);
      const row = { ...shot, from, durationInFrames, speechFrames };
      from += durationInFrames;
      return row;
    });
}
