// User-only PNG export; --dry-run is read-only.
import { fileURLToPath } from "node:url";
import { exportVideo } from "../../shared/tools/export.ts";
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "ShearIntersectionDenominator",
  "out/shear-intersection-denominator-frames",
);
