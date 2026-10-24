import { fileURLToPath } from "node:url";
import { checkLayout } from "../../shared/checks/layout.ts";

await checkLayout({
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  reportAll: true,
  inspectPageErrors: false,
});
