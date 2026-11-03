import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";
// User-only export. Preserve original speech speed on this composition timeline.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "CompleteIntersection",
  "out/complete-intersection-audio.wav",
  "audio",
);
