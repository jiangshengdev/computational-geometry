import { fileURLToPath } from "node:url";
import { checkShotLayouts } from "../../shared/checks/shot-layout.ts";
import { shots } from "../src/storyboard.ts";
await checkShotLayouts(fileURLToPath(new URL("../", import.meta.url)), shots);
