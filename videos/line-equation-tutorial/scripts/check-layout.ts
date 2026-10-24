import { fileURLToPath } from "node:url";
import { checkLayout } from "../../shared/checks/layout.ts";

await checkLayout({
  browserExecutable: verifiedBrowser(import.meta.url),
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  reportAll: true,
  inspectPageErrors: false,
});
import { verifiedBrowser } from "../../shared/tools/browser.ts";
