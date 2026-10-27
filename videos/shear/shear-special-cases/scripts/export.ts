import { fileURLToPath } from "node:url";
import { exportVideo } from "../../../shared/tools/export.ts";
await exportVideo(
  fileURLToPath(new URL("../", import.meta.url)),
  "ShearSpecialCases",
  "out/shear-special-cases-frames",
);
