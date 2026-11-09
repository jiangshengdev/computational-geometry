import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";

// User-only export of the complete original-speed timeline.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "SameColumnReasons",
  "out/same-column-reasons-audio.wav",
  "audio",
);
