import { shots, pages } from "./storyboard.ts";
import { groupCaptionClauses } from "../../../shared/speech/captions.ts";
export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "provisional-silent-reading";
function captionChunks(text: string) {
  const clauses = Array.from(
    text.matchAll(/[^，。！？；：]+[，。！？；：]?/g),
    (match) => ({ text: match[0], offset: match.index! }),
  );
  return groupCaptionClauses(clauses, clauses);
}
// Visual rehearsal only; never passed to an audio timing API.
let cursor = 0;
export const rows = shots.map((shot, index) => {
  let frame = audioLeadFrames;
  const captions = shot.cues.flatMap((cue, source) => {
    return captionChunks(cue.caption).map(({ text }) => {
      const start = frame;
      frame += Math.ceil(Math.max(2, text.length / 4.3) * fps);
      return { ...cue, text, source, start, end: frame };
    });
  });
  const endsPage = shots[index + 1]?.page !== shot.page;
  const pauseAfter = Math.max(
    shot.thinkAfter ?? 1,
    endsPage ? pages[shot.page].holdAfterSeconds : 0,
  );
  const previous = shots[index - 1];
  const row = {
    ...shot,
    from: cursor,
    captions,
    readingFrames: frame - audioLeadFrames,
    durationInFrames: frame + pauseAfter * fps,
    pauseAfter,
    revealMs: 0,
    stages: [] as { ms: number }[],
    previousCaption:
      previous?.page === shot.page
        ? (() => {
            const text = previous.cues[previous.cues.length - 1].caption;
            const chunks = captionChunks(text);
            return chunks[chunks.length - 1].text;
          })()
        : "",
    previousReached: shots
      .slice(0, index)
      .filter((s) => s.page === shot.page)
      .flatMap((s) => s.cues.flatMap((c) => (c.target ? [c.target] : []))),
  };
  cursor += row.durationInFrames;
  return row;
});
export type TimelineRow = (typeof rows)[number];
export const durationInFrames = cursor;
export function visualAt(row: TimelineRow, frame: number) {
  const active = row.captions.find((c) => frame >= c.start && frame < c.end);
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
    thinking: frame >= audioLeadFrames + row.readingFrames,
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
