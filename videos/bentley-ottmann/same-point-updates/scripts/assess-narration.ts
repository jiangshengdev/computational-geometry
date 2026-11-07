import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { assessBatch } from "../../../shared/speech/assess-batch.ts";

await assessBatch(sdk);
