import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";
// User-only entry; assistants must not execute video exports.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "SweepNeighbors",
  "out/sweep-neighbors-frames",
);
