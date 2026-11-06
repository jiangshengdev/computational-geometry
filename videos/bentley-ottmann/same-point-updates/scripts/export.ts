import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";

// User-only export; assistants may inspect dry-run parameters but never render.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "SamePointUpdates",
  "out/same-point-updates-frames",
);
