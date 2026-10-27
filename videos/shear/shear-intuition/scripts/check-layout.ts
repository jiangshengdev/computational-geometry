import { fileURLToPath } from "node:url";
import { checkLayout } from "../../../shared/checks/layout.ts";

await checkLayout({
  browserExecutable: verifiedBrowser(import.meta.url),
  viewport: { width: 2400, height: 1600 },
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  screenshotPages: [
    "204-08",
    "205-01b",
    "205-05",
    "206-06",
    "206-11",
    "206-15",
    "207-01",
    "207-05a",
  ],
});
import { verifiedBrowser } from "../../../shared/tools/browser.ts";
