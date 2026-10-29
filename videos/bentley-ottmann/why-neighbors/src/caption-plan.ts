import sentences from "./sentence-plan.json" with { type: "json" };
import type { SentencePlan } from "../../../shared/speech/sentence-pauses.ts";
import {
  validateCaptionClauses,
  type CaptionPlan,
} from "../../../shared/speech/timing.ts";

// Number of spoken phrases explaining each displayed clause, reviewed against
// the formulas. Other sentences already have a one-to-one clause correspondence.
const counts: Record<string, Record<number, number[]>> = {
  N06: { 1: [2, 1] },
  N07: { 1: [4, 1, 1] },
  N08: { 0: [1, 5], 1: [6, 5] },
  N09: { 0: [2, 3, 1], 1: [3] },
  N10: { 1: [1, 1, 3] },
  N11: { 0: [2, 2, 1], 1: [1, 2, 1] },
  N15: { 1: [2] },
  N17: { 0: [2, 1] },
  N18: { 0: [3] },
};
export const captionPlans: Record<string, CaptionPlan> = Object.fromEntries(
  Object.entries(sentences as Record<string, SentencePlan>).map(
    ([id, plan]) => {
      const parts = plan.flatMap((sentence, index) => {
        // N23's introductory colon belongs to the following spoken phrase.
        const clauses =
          id === "N23" && index === 0
            ? [
                "还要避免循环解释：不能先假设所有交点都已处理，",
                "再用它证明不会漏。",
              ]
            : sentence.caption.match(/[^，。！？；：]+[，。！？；：]?/g)!;
        const sizes = counts[id]?.[index] ?? clauses.map(() => 1);
        if (
          sizes.length !== clauses.length ||
          sizes.reduce((a, b) => a + b, 0) !== sentence.speech.length
        )
          throw Error(
            id + ": caption mapping no longer matches reviewed narration",
          );
        let offset = 0;
        return clauses.map((caption, i) => {
          const speech = sentence.speech
            .slice(offset, offset + sizes[i])
            .join("");
          offset += sizes[i];
          return { caption, speech };
        });
      });
      validateCaptionClauses(
        plan.map((s) => s.caption).join(""),
        plan.flatMap((s) => s.speech).join(""),
        parts,
      );
      return [id, parts];
    },
  ),
);
