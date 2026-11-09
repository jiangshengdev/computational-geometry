import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { planBatch } from "../../../shared/speech/plan-batch.ts";
import { selectedShots, selectedSource } from "./selection.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import speech from "../src/speech-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };
planBatch(
  sdk,
  selectedShots.map((s) => ({ id: s.id, caption: s.captions.join("") })),
  selectedSource(narration),
  selectedSource(speech),
  selectedSource(sentences),
);
