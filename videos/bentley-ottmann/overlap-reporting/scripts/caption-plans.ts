import assert from "node:assert/strict";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import {
  clauses,
  createCaptions,
  validateCaptionClauses,
  type AudioTiming,
} from "../../../shared/speech/timing.ts";

/** The two endpoints in OR21 share one written clause but two spoken phrases. */
export function captionPlan(id: string) {
  const shot = shots.find((s) => s.id === id)!;
  assert(shot, `Unknown shot ${id}`);
  const display = clauses(shot.captions.join(""));
  const audible = clauses(narration[id as keyof typeof narration]).map(
    (c) => c.text,
  );
  if (id === "OR21") audible.splice(2, 2, audible[2] + audible[3]);
  assert.equal(
    display.length,
    audible.length,
    `${id}: review subtitle correspondence`,
  );
  const plan = display.map((part, i) => ({
    caption: part.text,
    speech: audible[i],
  }));
  validateCaptionClauses(
    shot.captions.join(""),
    narration[id as keyof typeof narration],
    plan,
  );
  return plan;
}

export function measuredCaptions(timing: Record<string, AudioTiming>) {
  return Object.fromEntries(
    shots.map((shot) => {
      let offset = 0;
      const ends = shot.captions.map((text) => (offset += text.length));
      offset = 0;
      const captions = createCaptions(
        shot.captions.join(""),
        timing[shot.id],
        captionPlan(shot.id),
      ).map((caption) => {
        const source = ends.findIndex((end) => offset < end);
        offset += caption.text.length;
        assert(
          source >= 0 && offset <= ends[source],
          `${shot.id}: subtitle crosses a semantic source`,
        );
        return { ...caption, source };
      });
      return [shot.id, captions];
    }),
  );
}
