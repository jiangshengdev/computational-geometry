import { fileURLToPath } from "node:url";
import { narrationShots } from "./sentence-pauses.ts";
import { alignAudio, buildSpeechDocument } from "./azure-speech.ts";
import { auditNarration } from "../../../shared/speech/audit-narration.ts";

await auditNarration({
  root: fileURLToPath(new URL("../", import.meta.url)),
  shots: narrationShots,
  alignAudio,
  buildSpeechDocument,
});
