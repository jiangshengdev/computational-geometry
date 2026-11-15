import { fileURLToPath } from "node:url";
import { rows } from "../src/timeline.ts";
import { checkShotLayouts } from "../../../shared/checks/shot-layout.ts";
await checkShotLayouts(fileURLToPath(new URL("../", import.meta.url)), rows);
