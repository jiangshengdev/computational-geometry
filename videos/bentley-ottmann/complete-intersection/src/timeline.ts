import { shots } from "./storyboard.ts";
export const fps = 60;
/** Reading placeholders only. #323 replaces these with actual uncut WAV durations. */
const readingFrames = (caption: string) =>
  Math.max(3 * fps, Math.ceil((Array.from(caption).length / 4.2) * fps));
let offset = 0;
export const rows = shots.map((shot) => {
  let cursor = fps / 2; // Complete teaching row before the first reading phrase.
  const captions = shot.captions.map((text, index) => {
    const start = cursor;
    cursor += readingFrames(text);
    const target = shot.targets?.[index] ?? null;
    const gestures = Array.isArray(target)
      ? target.map((cue) => {
          const at = text.indexOf(cue.phrase);
          if (at < 0)
            throw Error(`${shot.id}: unknown semantic phrase ${cue.phrase}`);
          return {
            target: cue.target,
            start: start + Math.floor((at / text.length) * (cursor - start)),
            end: cursor,
          };
        })
      : target
        ? [{ target, start, end: cursor }]
        : [];
    for (let i = 0; i < gestures.length - 1; i++) {
      if (gestures[i].start >= gestures[i + 1].start)
        throw Error(`${shot.id}: unordered semantic phrases`);
      gestures[i].end = gestures[i + 1].start;
    }
    return { text, start, end: cursor, gestures };
  });
  const durationInFrames = cursor + (shot.thinkAfter ?? 1) * fps;
  const row = {
    ...shot,
    from: offset,
    captions,
    readingFrames: cursor,
    durationInFrames,
    revealMs: 0,
    stages: [] as { ms: number }[],
  };
  offset += durationInFrames;
  return row;
});
export const durationInFrames = offset;
export type TimelineRow = (typeof rows)[number];
export function visualAt(row: TimelineRow, frame: number) {
  const phrase = row.captions.find((c) => frame >= c.start && frame < c.end);
  const last = row.captions[row.captions.length - 1];
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
    thinking: frame >= row.readingFrames,
    caption: (phrase ?? (frame >= last.end ? last : row.captions[0])).text,
    target: gesture?.target ?? null,
    progress,
    reached: row.captions
      .flatMap((c) => c.gestures)
      .filter((g) => g.start <= frame)
      .map((g) => g.target),
  };
}
