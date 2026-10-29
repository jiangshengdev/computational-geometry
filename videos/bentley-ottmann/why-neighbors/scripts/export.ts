import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";
// User-only entry. Assistants must not execute exports.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "WhyNeighbors",
  "out/why-neighbors-frames",
);
