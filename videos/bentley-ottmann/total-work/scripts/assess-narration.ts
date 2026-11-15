import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { assessBatch } from "../../../shared/speech/assess-batch.ts";
import { createAssessmentSpeechConfig } from "../../../shared/speech/network.ts";
await assessBatch(
  sdk,
  createAssessmentSpeechConfig(sdk.PropertyId.SpeechServiceConnection_Key),
);
