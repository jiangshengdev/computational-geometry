import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";
// User-only entry; keep the source audio at its original speed.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "SweepNeighbors",
  "out/sweep-neighbors-audio.wav",
  "audio",
);
