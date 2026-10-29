import { fileURLToPath } from "node:url";
import { shots } from "../src/lesson.ts";
import { writeCaptions } from "../../../shared/speech/write-captions.ts";
writeCaptions(fileURLToPath(new URL("../", import.meta.url)), shots);
