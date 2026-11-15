import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";
// Author-only export. Assistant verification uses --dry-run exclusively.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "OverallCorrectness",
  "out/overall-correctness-frames",
);
