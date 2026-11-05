import assert from "node:assert/strict";
import plans from "../src/caption-plan.json" with { type: "json" };
import { shots } from "../src/storyboard.ts";
import {
  validateCaptionClauses,
  wordsInTextRange,
  type AudioTiming,
} from "../../../shared/speech/timing.ts";
import { timedCaption } from "../../../shared/speech/captions.ts";

/** Keep this episode's semantic source/target on each measured subtitle clause. */
export function measuredCaptions(timing: Record<string, AudioTiming>) {
  assert.deepEqual(
    Object.keys(plans).sort(),
    shots.map((shot) => shot.id).sort(),
  );
  return Object.fromEntries(
    shots.map((shot) => {
      const plan = plans[shot.id as keyof typeof plans];
      const recording = timing[shot.id];
      validateCaptionClauses(shot.captions.join(""), recording.speech, plan);
      let offset = 0;
      return [
        shot.id,
        plan.map((part) => {
          assert(
            Number.isInteger(part.source) &&
              part.source >= 0 &&
              part.source < shot.captions.length,
          );
          const words = wordsInTextRange(
            recording,
            offset,
            offset + part.speech.length,
          ).filter((word) => word.durationMs > 0);
          offset += part.speech.length;
          if (!words.length) throw Error(`${shot.id}: missing measured phrase`);
          return {
            ...timedCaption(part.caption, words),
            source: part.source,
            target:
              (part as { target?: string }).target ??
              shot.targets?.[part.source] ??
              null,
          };
        }),
      ];
    }),
  );
}
