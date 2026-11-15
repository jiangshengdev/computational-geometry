import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";
// Author-only, complete original-speed timeline; no audio cropping or respeed.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "OverallCorrectness",
  "out/overall-correctness-audio.wav",
  "audio",
);
