import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";

// User-only export; assistant checks use --dry-run.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "VerticalSegments",
  "out/vertical-segments-frames",
);
