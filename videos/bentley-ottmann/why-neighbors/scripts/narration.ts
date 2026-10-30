import { fileURLToPath } from "node:url";
import { narrationShots } from "./sentence-pauses.ts";
import {
  buildSpeechDocument,
  synthesize,
  voice,
  alignAudio,
  verifyAlignment,
} from "./azure-speech.ts";
import { runNarration } from "../../../shared/speech/narration.ts";
await runNarration({
  root: fileURLToPath(new URL("../", import.meta.url)),
  shots: narrationShots,
  buildSpeechDocument,
  synthesize,
  voice,
  alignAudio,
  verifyAlignment,
  requireTimingFile: false,
  validateClauses: true,
  concurrency: 1,
});
