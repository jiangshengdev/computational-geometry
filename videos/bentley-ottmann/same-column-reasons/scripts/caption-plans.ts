import { createCaptionPlans } from "../../../shared/speech/caption-plans.ts";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
export const { captionPlan, measuredCaptions } = createCaptionPlans(
  shots,
  narration,
  {
    SR01: [2, 1, 1, 1, 1],
    SR24: [1, 1, 2, 1, 1, 1, 1, 1],
    SR36: [2, 1, 2, 1, 1, 1, 1],
    SR38: [2, 1, 1, 1, 1],
    SR41: [2, 1, 1, 1, 1, 1, 1],
  },
);
