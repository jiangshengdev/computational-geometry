import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { planBatch } from "../../../shared/speech/plan-batch.ts";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import speech from "../src/speech-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };

planBatch(
  sdk,
  shots.map((shot) => ({ id: shot.id, caption: shot.captions.join("") })),
  narration,
  speech,
  sentences,
);
