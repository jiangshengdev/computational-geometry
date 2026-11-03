import { shots, pages } from "./storyboard.ts";
import plans from "./sentence-plan.json" with { type: "json" };
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
  const sentences = plans[shot.id as keyof typeof plans];
  let offset = 0;
  const frames = (ms: number) => audioLeadFrames + Math.ceil((ms * fps) / 1000);
  // Offsets locate reviewed semantic phrases; all times remain actual word times.
  const interval = (from: number, to: number) => {
    const words = recording.words.filter(
      (word) =>
        word.textOffset < to && word.textOffset + word.wordLength > from,
    );
    if (!words.length) throw Error(`${shot.id}: missing measured phrase`);
    return {
      start: frames(words[0].startMs),
      end: frames(
        words[words.length - 1].startMs + words[words.length - 1].durationMs,
      ),
    };
  };
  const captions = sentences.map((sentence, index) => {
    const spoken = sentence.speech.join("");
    const beginning = offset;
    offset += spoken.length;
    const { start, end } = interval(beginning, offset);
    const target = shot.targets?.[index] ?? null;
    let cursor = 0;
    const gestures = Array.isArray(target)
      ? target.map((cue) => {
          const at = spoken.indexOf(cue.phrase, cursor);
          if (at < 0)
            throw Error(`${shot.id}: missing spoken cue ${cue.phrase}`);
          cursor = at + cue.phrase.length;
          return {
            target: cue.target,
            ...interval(beginning + at, beginning + cursor),
          };
        })
      : target
        ? [{ target, start, end }]
        : [];
    for (let i = 0; i < gestures.length - 1; i++)
      if (gestures[i].end > gestures[i + 1].start)
        throw Error(`${shot.id}: measured gestures overlap`);
    return { text: sentence.caption, start, end, gestures };
  });
  if (offset !== recording.speech.length)
    throw Error(`${shot.id}: unused spoken text`);
  return {
    ...shot,
    captions,
    audioEndFrame: audioLeadFrames + shot.speechFrames,
    revealMs: 0,
    stages: [] as { ms: number }[],
  };
});
export const durationInFrames = rows.reduce(
  (sum, row) => sum + row.durationInFrames,
  0,
);
export type TimelineRow = (typeof rows)[number];
export function visualAt(row: TimelineRow, frame: number) {
  const phrase = row.captions.find((c) => frame >= c.start && frame < c.end);
  const gesture = phrase?.gestures.find(
    (g) => frame >= g.start && frame < g.end,
  );
  const raw = gesture
    ? (frame - gesture.start) / (gesture.end - gesture.start)
    : 1;
  // Phrase-bounded gesture. Retained objects never inherit this opacity.
  const progress = Math.max(0, Math.min(1, (raw - 0.1) / 0.8));
  return {
    activeCaption: phrase ? row.captions.indexOf(phrase) : null,
    visibleStep: row.visibleStep,
    thinking: frame >= row.audioEndFrame,
    caption: captionAt(
      measuredCaptions[row.id],
      ((frame - audioLeadFrames) * 1000) / fps,
      row.previousCaption,
    ),
    target: gesture?.target ?? null,
    progress,
    reached: row.captions
      .flatMap((c) => c.gestures)
      .filter((g) => g.start <= frame)
      .map((g) => g.target),
  };
}
