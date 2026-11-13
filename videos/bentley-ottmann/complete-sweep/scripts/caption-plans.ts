import { createCaptionPlans } from "../../../shared/speech/caption-plans.ts";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };

// Bind complete written sentences to their reviewed spoken phrases. Natural
// subtitle punctuation is preserved independently of synthesis-only breaks.
export const { captionPlan, measuredCaptions } = createCaptionPlans(
  shots,
  narration,
  Object.fromEntries(
    Object.entries(sentences).map(([id, plan]) => [
      id,
      plan.map((sentence) => ({
        caption: sentence.caption,
        speech: sentence.speech.join(""),
      })),
    ]),
  ),
);
