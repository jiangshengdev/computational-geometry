import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { assessBatch } from "../../../shared/speech/assess-batch.ts";
import { configureAssessmentSpeechConfig } from "./assessment-network.ts";

await assessBatch(sdk, configureAssessmentSpeechConfig);
