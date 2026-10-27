import { fileURLToPath } from "node:url";
import { shots } from "../src/storyboard.ts";
import { buildSpeechDocument, synthesize, voice } from "./azure-speech.ts";
import { alignAudio, verifyAlignment } from "./azure-alignment.ts";
import { runNarration } from "../../../shared/speech/narration.ts";

await runNarration({
  root: fileURLToPath(new URL("../", import.meta.url)),
  shots,
  buildSpeechDocument,
  synthesize,
  voice,
  alignAudio,
  verifyAlignment,
  requireTimingFile: true,
  validateClauses: false,
});
