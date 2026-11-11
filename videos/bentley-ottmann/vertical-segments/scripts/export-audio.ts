import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";

// User-only export of the complete original-speed timeline.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "VerticalSegments",
  "out/vertical-segments-audio.wav",
  "audio",
);
