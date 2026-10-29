import { fileURLToPath } from "node:url";
import { shots } from "../src/storyboard.ts";
import { auditNarration } from "../../../shared/speech/audit-narration.ts";
import { alignAudio, buildSpeechDocument } from "./azure-speech.ts";
await auditNarration({
  root: fileURLToPath(new URL("../", import.meta.url)),
  shots,
  alignAudio,
  buildSpeechDocument,
});
