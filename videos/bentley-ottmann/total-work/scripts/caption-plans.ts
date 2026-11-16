import assert from "node:assert/strict";
import { createCaptionPlans } from "../../../shared/speech/caption-plans.ts";
import { type CaptionPlan } from "../../../shared/speech/timing.ts";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };
type DisplaySentence = {
  caption: string;
  speech: string[];
  captionParts?: { caption: string; phrases: number }[];
};
// Display subdivisions follow measured spoken phrases inside the original
// semantic source. They never change the frozen speech or requested pauses.
const mappings: Record<string, CaptionPlan> = Object.fromEntries(
  Object.entries(sentences as Record<string, DisplaySentence[]>).map(
    ([id, plan]) => [
      id,
      plan.flatMap((sentence) => {
        const parts = sentence.captionParts ?? [
          { caption: sentence.caption, phrases: sentence.speech.length },
        ];
        assert.equal(
          parts.map((part) => part.caption).join(""),
          sentence.caption,
          `${id}: incomplete display text`,
        );
        let cursor = 0;
        const mapped = parts.map((part) => {
          assert(
            Number.isInteger(part.phrases) && part.phrases > 0,
            `${id}: invalid phrase mapping`,
          );
          const speech = sentence.speech
            .slice(cursor, cursor + part.phrases)
            .join("");
          cursor += part.phrases;
          return { caption: part.caption, speech };
        });
        assert.equal(
          cursor,
          sentence.speech.length,
          `${id}: incomplete spoken phrase coverage`,
        );
        return mapped;
      }),
    ],
  ),
);
export const { captionPlan, measuredCaptions } = createCaptionPlans(
  shots,
  narration,
  mappings,
);
