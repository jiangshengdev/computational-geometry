import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { synthesizeBatch } from "../../../shared/speech/synthesize-batch.ts";
import { configureSpeechConfig } from "../../../shared/speech/network.ts";
import { currentNarrationPlan } from "./narration-plan.ts";
import speech from "../src/speech-text.json" with { type: "json" };
await synthesizeBatch(
  sdk,
  speech,
  () => {
    currentNarrationPlan();
  },
  { concurrency: 20, configureSpeechConfig },
);
