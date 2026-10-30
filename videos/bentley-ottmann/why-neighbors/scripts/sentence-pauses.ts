import { createSentencePlanTools } from "../../../shared/speech/sentence-plan-tools.ts";
import { shots } from "../src/lesson.ts";
import plans from "../src/sentence-plan.json" with { type: "json" };
import narration from "../src/narration-text.json" with { type: "json" };
// The reviewed semantic mapping also owns subtitle-to-speech alignment.
export const narrationShots = shots.map((shot) => ({
  ...shot,
  captionPlan: plans[shot.id as keyof typeof plans].map((sentence) => ({
    caption: sentence.caption,
    speech: sentence.speech.join(""),
  })),
}));
export const { checkSentencePlan, updateSentencePauses } =
  createSentencePlanTools({
    shots,
    plans,
    narration,
    path: new URL("../src/speech-text.json", import.meta.url),
  });
