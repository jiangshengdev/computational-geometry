import { fileURLToPath } from "node:url";
import { shots } from "../src/storyboard.ts";
import { checkShotLayouts } from "../../../shared/checks/shot-layout.ts";
await checkShotLayouts(fileURLToPath(new URL("../", import.meta.url)), shots);
