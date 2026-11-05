import { shots, pages } from "./storyboard.ts";
import plans from "./narration-map.json" with { type: "json" };
import audioData from "./audio-timing.json" with { type: "json" };
import { createShotTimeline } from "../../../shared/speech/shot-timeline.ts";
import {
  captionAt,
  validateCaptionClauses,
  wordsInTextRange,
  type AudioTiming,
} from "../../../shared/speech/timing.ts";
import { timedCaption } from "../../../shared/speech/captions.ts";
export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "measured-narration";
export const audio = audioData as Record<string, AudioTiming>;
type Phrase = {
  caption: string;
  speech: string;
  source: number;
  target?: string;
};
const mapped = Object.fromEntries(
  shots.map((shot) => {
    const plan: Phrase[] = plans[shot.id as keyof typeof plans];
    const recording = audio[shot.id];
    validateCaptionClauses(
      plan.map((p) => p.caption).join(""),
      recording.speech,
      plan,
    );
    let offset = 0;
    return [
      shot.id,
      plan.map((part) => {
        const words = wordsInTextRange(
          recording,
          offset,
          offset + part.speech.length,
        ).filter((w) => w.durationMs > 0);
        offset += part.speech.length;
        if (!words.length) throw Error(`${shot.id}: missing measured phrase`);
        return {
          ...timedCaption(part.caption, words),
          source: part.source,
          target: part.target ?? shot.targets?.[part.source] ?? null,
        };
      }),
    ];
  }),
);
const shared = createShotTimeline({
  shots: shots.map((s) => ({
    ...s,
    step: s.visibleStep,
    pauseAfter: s.thinkAfter ?? 1,
  })),
  pages,
  timing: audio,
  captions: mapped,
  fps,
  audioLeadFrames,
});
export const rows = shared.timelineFor().map((shot, index) => ({
  ...shot,
  audioEndFrame: audioLeadFrames + shot.speechFrames,
  revealMs: 0,
  stages: [] as { ms: number }[],
  captions: mapped[shot.id].map((c) => ({
    ...c,
    start: audioLeadFrames + Math.ceil((c.startMs * fps) / 1000),
    end: audioLeadFrames + Math.ceil((c.endMs * fps) / 1000),
  })),
  previousReached: shots
    .slice(0, index)
    .filter((s) => s.page === shot.page)
    .flatMap((s) => mapped[s.id].flatMap((c) => (c.target ? [c.target] : []))),
}));
export type TimelineRow = (typeof rows)[number];
export const durationInFrames = rows.reduce(
  (n, r) => n + r.durationInFrames,
  0,
);
export function visualAt(row: TimelineRow, frame: number) {
  const current = row.captions.find((c) => frame >= c.start && frame < c.end);
  const introduced = row.captions.filter((c) => frame >= c.start);
  // One semantic action can span several subtitle clauses; do not restart it.
  let first = row.captions.findIndex((c) => frame >= c.start && frame < c.end);
  if (first < 0)
    first = row.captions.findIndex(
      (c, i) =>
        frame >= c.end &&
        frame < (row.captions[i + 1]?.start ?? c.end) &&
        c.target === row.captions[i + 1]?.target,
    );
  let last = first;
  const target = first >= 0 ? row.captions[first].target : null;
  if (target) {
    while (first > 0 && row.captions[first - 1].target === target) first--;
    while (
      last + 1 < row.captions.length &&
      row.captions[last + 1].target === target
    )
      last++;
  }
  return {
    visibleStep: row.visibleStep,
    reachedCaption: introduced[introduced.length - 1]?.source ?? null,
    activeCaption: current?.source ?? null,
    caption: captionAt(
      mapped[row.id],
      ((frame - audioLeadFrames) * 1000) / fps,
      row.previousCaption,
    ),
    reached: [
      ...row.previousReached,
      ...row.captions
        .filter((c) => frame >= c.start)
        .flatMap((c) => (c.target ? [c.target] : [])),
    ],
    target,
    progress:
      target && first >= 0
        ? Math.max(
            0,
            Math.min(
              1,
              (frame - row.captions[first].start) /
                (row.captions[last].end - row.captions[first].start),
            ),
          )
        : 1,
    thinking: frame >= row.audioEndFrame,
  };
}
export function rowAt(frame: number) {
  return (
    rows.find((r) => frame >= r.from && frame < r.from + r.durationInFrames) ??
    rows[rows.length - 1]
  );
}
