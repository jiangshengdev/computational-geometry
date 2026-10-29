import { createSentencePlanTools } from "../../../shared/speech/sentence-plan-tools.ts";
import { shots } from "../src/lesson.ts";
import plans from "../src/sentence-plan.json" with { type: "json" };
import narration from "../src/narration-text.json" with { type: "json" };
export const { checkSentencePlan, updateSentencePauses } =
  createSentencePlanTools({
    shots,
    plans,
    narration,
    path: new URL("../src/speech-text.json", import.meta.url),
  });
