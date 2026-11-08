import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { synthesizeBatch } from "../../../shared/speech/synthesize-batch.ts";
import { updateSentencePauses } from "./sentence-plan.ts";
import speech from "../src/speech-text.json" with { type: "json" };

await synthesizeBatch(sdk, speech, () => updateSentencePauses(false), {
  concurrency: Object.keys(speech).length,
});
