import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { synthesizeBatch } from "../../../shared/speech/synthesize-batch.ts";
import { updateSentencePauses } from "./sentence-plan.ts";
import speech from "../src/speech-text.json" with { type: "json" };
import { selectedSource } from "./selection.ts";
await synthesizeBatch(
  sdk,
  selectedSource(speech),
  () => updateSentencePauses(false),
  {
    concurrency: 20,
  },
);
