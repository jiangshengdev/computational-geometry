import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { assessBatch } from "../../../shared/speech/assess-batch.ts";
import { configureAssessmentSpeechConfig } from "./speech-network.ts";
await assessBatch(sdk, configureAssessmentSpeechConfig);
