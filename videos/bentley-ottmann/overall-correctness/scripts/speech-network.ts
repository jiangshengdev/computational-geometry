import { PropertyId } from "microsoft-cognitiveservices-speech-sdk";
import { createAssessmentSpeechConfig } from "../../../shared/speech/network.ts";
export { configureSpeechConfig } from "../../../shared/speech/network.ts";
export const configureAssessmentSpeechConfig = createAssessmentSpeechConfig(
  PropertyId.SpeechServiceConnection_Key,
);
