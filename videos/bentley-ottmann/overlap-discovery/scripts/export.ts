import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";

// User-only export; assistants may inspect --dry-run, never render.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "OverlapDiscovery",
  "out/overlap-discovery-frames",
);
