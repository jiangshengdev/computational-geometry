import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";
// User-only export of the same composition timeline at original speech speed.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "SamePointParticipants",
  "out/same-point-participants-audio.wav",
  "audio",
);
