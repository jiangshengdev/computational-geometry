import assert from "node:assert/strict";
import {
  clauses,
  createCaptions,
  validateCaptionClauses,
  type AudioTiming,
  type CaptionPlan,
} from "./timing.ts";

/** Bind complete subtitle text to frozen speech, retaining semantic sources. */
export function createCaptionPlans(
  shots: { id: string; captions: string[] }[],
  narration: Record<string, string>,
  mappings: Record<string, number[] | CaptionPlan> = {},
) {
  // Default correspondence is one-to-one; reviewed mappings can group either side.
  function captionPlan(id: string) {
    const shot = shots.find((s) => s.id === id);
    assert(shot, `Unknown shot ${id}`);
    const display = clauses(shot.captions.join(""));
    const spoken = narration[id];
    const mapping = mappings[id];
    if (mapping?.length && typeof mapping[0] === "object") {
      const plan = mapping as CaptionPlan;
      validateCaptionClauses(shot.captions.join(""), spoken, plan);
      return plan;
    }
    const raw = clauses(spoken);
    const counts = (mapping as number[] | undefined) ?? display.map(() => 1);
    assert.equal(
      counts.reduce((a, b) => a + b, 0),
      raw.length,
      `${id}: incomplete spoken clause mapping`,
    );
    let cursor = 0;
    const audible = counts.map((count) => {
      assert(Number.isInteger(count) && count > 0);
      const text = raw
        .slice(cursor, cursor + count)
        .map((c) => c.text)
        .join("");
      cursor += count;
      return { text };
    });
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

  function measuredCaptions(timing: Record<string, AudioTiming>) {
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

  return { captionPlan, measuredCaptions };
}
