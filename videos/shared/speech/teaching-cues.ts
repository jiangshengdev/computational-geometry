import { phraseTime, type AudioTiming } from "./timing.ts";

export type AttentionMark =
  | { kind: "point"; at: [number, number]; color?: string }
  | {
      kind: "rect";
      from: [number, number];
      to: [number, number];
      radius: number;
      color?: string;
    }
  | {
      kind: "line";
      from: [number, number];
      to: [number, number];
      color?: string;
    };
export type TeachingCue = {
  phrase: string;
  through?: string;
  name?: string;
  panels?: Record<string, AttentionMark[]>;
  keys?: string[];
};
export type TeachingFocus = TeachingCue & {
  progress: number;
  active: boolean;
  reached: string[];
};

/** One semantic phrase owns a cue. Word times locate it, never provide a beat. */
export function createTeachingCues(
  audio: Record<string, AudioTiming>,
  cues: Record<string, TeachingCue[]>,
) {
  const timings = Object.fromEntries(
    Object.entries(cues).map(([id, entries]) => {
      const timed = entries.map((cue) => ({
        ...cue,
        start: phraseTime(audio[id], cue.phrase, "start"),
        end: phraseTime(audio[id], cue.through ?? cue.phrase, "end"),
      }));
      timed.forEach((cue, index) => {
        if (
          cue.end <= cue.start ||
          (index > 0 && cue.start < timed[index - 1].end)
        )
          throw Error(
            `${id}: invalid or overlapping teaching cue: ${cue.phrase}`,
          );
      });
      return [id, timed];
    }),
  );
  return {
    timings,
    at(id: string, ms: number): TeachingFocus | undefined {
      const reached = (timings[id] ?? []).filter((cue) => cue.start <= ms);
      const cue = reached[reached.length - 1];
      if (!cue) return undefined;
      return {
        ...cue,
        reached: reached.flatMap((entry) => (entry.name ? [entry.name] : [])),
        active: ms < cue.end,
        progress: Math.min(1, (ms - cue.start) / (cue.end - cue.start)),
      };
    },
  };
}

export const point = (x: number, y: number, color?: string): AttentionMark => ({
  kind: "point",
  at: [x, y],
  color,
});
export const stroke = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color?: string,
): AttentionMark => ({ kind: "line", from: [x1, y1], to: [x2, y2], color });
