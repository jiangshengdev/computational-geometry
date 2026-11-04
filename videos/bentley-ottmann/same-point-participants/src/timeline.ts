import { shots, pages } from "./storyboard.ts";
import { validateCaptionClauses } from "../../../shared/speech/timing.ts";
import { groupCaptionClauses } from "../../../shared/speech/captions.ts";

export const fps = 60;
export const audioLeadFrames = 30;
/** Reading slots are an editing aid, never measured speech or word times. */
export const timingKind = "provisional-silent-reading";
const display = shots.map((shot) =>
  shot.captions.flatMap((text, source) => {
    const { visible, audible } = validateCaptionClauses(text, text);
    return groupCaptionClauses(visible, audible).map((part) => ({
      text: part.text,
      source,
    }));
  }),
);
let cursor = 0;
export const rows = shots.map((shot, index) => {
  const samePage = shots[index - 1]?.page === shot.page;
  const captions = display[index].map((part, i) => ({
    ...part,
    start: audioLeadFrames + i * 300,
    end: audioLeadFrames + (i + 1) * 300,
  }));
  const readingFrames = captions.length * 300;
  const endsPage = shots[index + 1]?.page !== shot.page;
  const durationInFrames =
    audioLeadFrames +
    readingFrames +
    Math.round(
      Math.max(
        shot.thinkAfter ?? 1,
        endsPage ? pages[shot.page].holdAfterSeconds : 0,
      ) * fps,
    );
  const previousReached = shots
    .slice(0, index)
    .filter((s) => s.page === shot.page)
    .flatMap((s) => s.targets ?? []);
  const row = {
    ...shot,
    from: cursor,
    durationInFrames,
    readingFrames,
    revealMs: -500,
    stages: [],
    captions,
    previousCaption: samePage
      ? display[index - 1][display[index - 1].length - 1].text
      : "",
    previousReached,
  };
  cursor += durationInFrames;
  return row;
});
export type TimelineRow = (typeof rows)[number];
export const durationInFrames = cursor;

export function visualAt(row: TimelineRow, frame: number) {
  const activeCaption = row.captions.findIndex(
    (c) => frame >= c.start && frame < c.end,
  );
  const current = row.captions[activeCaption];
  const reached = [
    ...row.previousReached,
    ...row.captions
      .filter((c) => frame >= c.start)
      .flatMap((c) => row.targets?.[c.source] ?? []),
  ];
  const target = current ? (row.targets?.[current.source] ?? null) : null;
  let first = activeCaption,
    last = activeCaption;
  if (target) {
    while (
      first > 0 &&
      row.targets?.[row.captions[first - 1].source] === target
    )
      first--;
    while (
      last + 1 < row.captions.length &&
      row.targets?.[row.captions[last + 1].source] === target
    )
      last++;
  }
  const caption =
    current?.text ??
    (frame < audioLeadFrames
      ? row.previousCaption
      : row.captions[row.captions.length - 1].text);
  return {
    visibleStep: row.visibleStep,
    activeCaption: current?.source ?? null,
    caption,
    reached,
    target,
    progress: current
      ? Math.max(
          0,
          Math.min(
            1,
            (frame - row.captions[first].start) /
              (row.captions[last].end - row.captions[first].start),
          ),
        )
      : 1,
    thinking: frame >= audioLeadFrames + row.readingFrames,
  };
}

export function rowAt(frame: number) {
  return (
    rows.find(
      (row) => frame >= row.from && frame < row.from + row.durationInFrames,
    ) ?? rows[rows.length - 1]
  );
}
