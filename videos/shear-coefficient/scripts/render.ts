// User-only export entry. The assistant must not execute this script.
import { fileURLToPath } from "node:url";
import { exportVideo } from "../../shared/tools/export.ts";

await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "ShearCoefficient",
  "out/shear-coefficient-frames",
);
