import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";
// User-only export. Assistants may inspect --dry-run, never execute a render.
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "IntersectionGoals",
  "out/intersection-goals-frames",
);
