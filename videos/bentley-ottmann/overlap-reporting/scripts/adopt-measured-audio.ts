import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { adoptBatch } from "../../../shared/speech/adopt-batch.ts";
import { shots } from "../src/storyboard.ts";
import { verifyRecordings } from "./measured-audio.ts";

await adoptBatch({
  root: fileURLToPath(new URL("../", import.meta.url)),
  shots,
  verifyRecordings,
  format,
});
