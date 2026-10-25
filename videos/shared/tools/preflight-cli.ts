import { resolve } from "node:path";
import { verifiedBrowser } from "./browser.ts";
import { runPreflight } from "./preflight.ts";

if (process.argv.length !== 2)
  throw Error("Preflight accepts no partial-check options");
const root = process.cwd();
runPreflight(root, verifiedBrowser(resolve(root, "package.json")));
