import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";

// User-only export of the same composition timeline at original speech speed.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "SamePointUpdates",
  "out/same-point-updates-audio.wav",
  "audio",
);
