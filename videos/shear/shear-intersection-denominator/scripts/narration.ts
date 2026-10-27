import { fileURLToPath } from "node:url";
import { shots } from "../src/storyboard.ts";
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
  shots,
  buildSpeechDocument,
  synthesize,
  voice,
  alignAudio,
  verifyAlignment,
  requireTimingFile: false,
  validateClauses: true,
});
