import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { synthesizeBatch } from "../../../shared/speech/synthesize-batch.ts";
import { configureSpeechConfig } from "../../../shared/speech/network.ts";
import { currentNarrationPlan, narrationSpeech } from "./narration-plan.ts";
await synthesizeBatch(
  sdk,
  narrationSpeech,
  () => {
    currentNarrationPlan();
  },
  { concurrency: 20, configureSpeechConfig },
);
