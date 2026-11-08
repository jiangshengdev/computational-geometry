import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";

// User-only export of the same complete, original-speed timeline.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "OverlapDiscovery",
  "out/overlap-discovery-audio.wav",
  "audio",
);
