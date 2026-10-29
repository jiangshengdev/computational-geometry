import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";
// User-only entry. Preserve the original audio speed.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "WhyNeighbors",
  "out/why-neighbors-audio.wav",
  "audio",
);
