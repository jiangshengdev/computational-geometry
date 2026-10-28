import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";
// User-only export. Preserve original speech speed on this composition timeline.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "IntersectionGoals",
  "out/intersection-goals-audio.wav",
  "audio",
);
