import { fileURLToPath } from "node:url";
import { checkFormalAudio } from "../../../shared/speech/check-formal-audio.ts";
import { verifyRecordings } from "./measured-audio.ts";
export const checkAudio = (decode = true) =>
  checkFormalAudio(new URL("../", import.meta.url), verifyRecordings, decode);
if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(checkAudio()));
