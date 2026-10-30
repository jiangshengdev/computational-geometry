import { createSentencePlanTools } from "../../../shared/speech/sentence-plan-tools.ts";
import { shots } from "../src/lesson.ts";
import plans from "../src/sentence-plan.json" with { type: "json" };
import narration from "../src/narration-text.json" with { type: "json" };
import { validateCaptionClauses } from "../../../shared/speech/timing.ts";
// Keep the recorded pause groups intact, but align subtitles clause by clause.
// A whole teaching explanation must not become a single summary subtitle.
export const narrationShots = shots.map((shot) => ({
  ...shot,
  captionPlan: plans[shot.id as keyof typeof plans].flatMap((sentence) => {
    const { visible, audible } = validateCaptionClauses(
      sentence.caption,
      sentence.speech.join(""),
    );
    return visible.map((clause, index) => ({
      caption: clause.text,
      speech: audible[index].text,
    }));
  }),
}));
export const { checkSentencePlan, updateSentencePauses } =
  createSentencePlanTools({
    shots,
    plans,
    narration,
    path: new URL("../src/speech-text.json", import.meta.url),
  });
