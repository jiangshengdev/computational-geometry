import { shots, pages } from "./storyboard.ts";
import { cues } from "./diagram-cues.ts";
import audioData from "./audio-timing.json" with { type: "json" };
import captionData from "./captions.json" with { type: "json" };
import { createShotTimeline } from "../../../shared/speech/shot-timeline.ts";
import {
  captionAt,
  type AudioTiming,
  type Caption,
} from "../../../shared/speech/timing.ts";

export const fps = 60;
export const audioLeadFrames = fps / 2;
export const timingKind = "measured-narration";
export const audio = audioData as Record<string, AudioTiming>;
const measuredCaptions = captionData as Record<string, Caption[]>;
const shared = createShotTimeline({
  shots: shots.map((shot) => ({
    ...shot,
    step: shot.visibleStep,
    pauseAfter: shot.thinkAfter ?? 1,
  })),
  pages,
  timing: audio,
  captions: measuredCaptions,
  fps,
  audioLeadFrames,
});
export const rows = shared.timelineFor().map((shot) => {
  const recording = audio[shot.id];
  const frames = (ms: number) => audioLeadFrames + Math.ceil((ms * fps) / 1000);
  const captions = measuredCaptions[shot.id].map((c) => ({
    text: c.text,
    start: frames(c.startMs),
    end: frames(c.endMs),
  }));
  let cueCursor = 0;
  const gestures = (cues[shot.id] ?? []).map((cue) => {
    const phrase = cue.speechPhrase ?? cue.phrase;
    const offset = recording.speech.indexOf(phrase, cueCursor);
    if (offset < 0)
      throw Error(`${shot.id}: missing spoken semantic anchor ${phrase}`);
    cueCursor = offset + phrase.length;
    const words = recording.words.filter(
      (w) => w.textOffset < cueCursor && w.textOffset + w.wordLength > offset,
    );
    if (!words.length)
      throw Error(`${shot.id}: semantic anchor has no measured words`);
    return {
      ...cue,
      start: frames(words[0].startMs),
      end: frames(
        words[words.length - 1].startMs + words[words.length - 1].durationMs,
      ),
    };
  });
  for (let i = 1; i < gestures.length; i++)
    if (gestures[i].start < gestures[i - 1].end)
      throw Error(`${shot.id}: measured semantic gestures overlap`);
  return {
    ...shot,
    captions,
    gestures,
    audioEndFrame: audioLeadFrames + shot.speechFrames,
    stages: [] as { ms: number }[],
  };
});
export type TimelineRow = (typeof rows)[number];
export const durationInFrames = rows.reduce(
  (n, row) => n + row.durationInFrames,
  0,
);
export function visualAt(row: TimelineRow, frame: number) {
  const gesture = row.gestures.find(
    (entry) => frame >= entry.start && frame < entry.end,
  );
  const earlier = rows.filter(
    (entry) => entry.page === row.page && entry.from < row.from,
  );
  return {
    visibleStep: row.visibleStep,
    caption: captionAt(
      measuredCaptions[row.id],
      ((frame - audioLeadFrames) * 1000) / fps,
      row.previousCaption,
    ),
    thinking: frame >= row.audioEndFrame,
    target: gesture?.target ?? null,
    progress: gesture
      ? (frame - gesture.start) / (gesture.end - gesture.start)
      : 1,
    reached: [
      ...earlier.flatMap((entry) => entry.gestures),
      ...row.gestures.filter((entry) => entry.start <= frame),
    ].map((entry) => entry.target),
  };
}
