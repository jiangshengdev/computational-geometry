import { createCaptionPlans } from "../../../shared/speech/caption-plans.ts";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
export const { captionPlan, measuredCaptions } = createCaptionPlans(
  shots,
  narration,
);
