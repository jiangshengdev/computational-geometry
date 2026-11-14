import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { synthesizeBatch } from "../../../shared/speech/synthesize-batch.ts";
import { currentNarrationPlan } from "./measured-audio.ts";
import { configureSpeechConfig } from "./speech-network.ts";
import speech from "../src/speech-text.json" with { type: "json" };
import { selectNarrationShots } from "../../../shared/speech/selection.ts";
import { shots } from "../src/storyboard.ts";
const { selectedShots, selectedSource } = selectNarrationShots(shots);

await synthesizeBatch(
  sdk,
  selectedSource(speech),
  () => {
    currentNarrationPlan(selectedShots.map((s) => s.id));
  },
  { concurrency: 20, configureSpeechConfig },
);
