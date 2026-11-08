import assert from "node:assert/strict";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import {
  clauses,
  createCaptions,
  validateCaptionClauses,
  type AudioTiming,
} from "../../../shared/speech/timing.ts";

// Each written clause corresponds to one frozen spoken phrase in this episode.
export function captionPlan(id: string) {
  const shot = shots.find((s) => s.id === id);
  assert(shot, `Unknown shot ${id}`);
  const display = clauses(shot.captions.join(""));
  const spoken = narration[id as keyof typeof narration];
  const audible = clauses(spoken);
  assert.equal(
    display.length,
    audible.length,
    `${id}: review subtitle correspondence`,
  );
  const plan = display.map((part, i) => ({
    caption: part.text,
    speech: audible[i].text,
  }));
  validateCaptionClauses(shot.captions.join(""), spoken, plan);
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
