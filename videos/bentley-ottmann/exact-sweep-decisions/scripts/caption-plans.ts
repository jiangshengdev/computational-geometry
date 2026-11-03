import { shots } from "../src/storyboard.ts";
import sentences from "../src/sentence-plan.json" with { type: "json" };
import type { CaptionPlan } from "../../../shared/speech/timing.ts";

// Reviewed display-fragment correspondence, retaining all original punctuation.
// Others use one display caption per complete original semantic sentence.
const displayPhraseCounts: Record<string, number[]> = {
  ES06: [1, 2, 1, 1],
  ES17: [2, 1, 2, 1, 2],
  ES30: [1, 1, 2, 2, 1],
  ES37: [1, 1, 3, 2],
  ES42: [2, 1, 2, 2],
};
export function captionPlanFor(id: string): CaptionPlan {
  const shot = shots.find((s) => s.id === id);
  if (!shot) throw Error(`Unknown shot ${id}`);
  const plan = sentences[id as keyof typeof sentences];
  const counts = displayPhraseCounts[id] ?? plan.map((s) => s.speech.length);
  const phrases = plan.flatMap((s) => s.speech);
  if (
    counts.length !== shot.captions.length ||
    counts.reduce((n, c) => n + c, 0) !== phrases.length
  )
    throw Error(`${id}: display/speech mapping differs`);
  let cursor = 0;
  return shot.captions.map((caption, i) => {
    const speech = phrases.slice(cursor, cursor + counts[i]).join("");
    cursor += counts[i];
    return { caption, speech };
  });
}
