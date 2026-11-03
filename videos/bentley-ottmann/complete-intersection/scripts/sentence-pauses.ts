import { createSentencePlanTools } from "../../../shared/speech/sentence-plan-tools.ts";
import { shots } from "../src/storyboard.ts";
import plans from "../src/sentence-plan.json" with { type: "json" };
import narration from "../src/narration-text.json" with { type: "json" };

export const narrationShots = shots.map((shot) => ({
  ...shot,
  caption: shot.captions.join(""),
  captionPlan: plans[shot.id as keyof typeof plans].map((sentence) => ({
    caption: sentence.caption,
    speech: sentence.speech.join(""),
  })),
}));

export const { checkSentencePlan, updateSentencePauses } =
  createSentencePlanTools({
    shots: narrationShots,
    plans,
    narration,
    path: new URL("../src/speech-text.json", import.meta.url),
  });

if (import.meta.main) updateSentencePauses(process.argv.includes("--write"));
