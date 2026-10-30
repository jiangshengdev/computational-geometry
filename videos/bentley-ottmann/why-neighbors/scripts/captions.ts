import { fileURLToPath } from "node:url";
import { narrationShots } from "./sentence-pauses.ts";
import { writeCaptions } from "../../../shared/speech/write-captions.ts";
writeCaptions(fileURLToPath(new URL("../", import.meta.url)), narrationShots);
