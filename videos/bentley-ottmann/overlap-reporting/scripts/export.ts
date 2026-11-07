import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";

// User-only export. Assistants can inspect --dry-run but never render.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "OverlapReporting",
  "out/overlap-reporting-frames",
);
