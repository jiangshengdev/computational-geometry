import { fileURLToPath } from "node:url";
import { checkLayout } from "../../shared/checks/layout.ts";
import { shots } from "../src/storyboard.ts";

await checkLayout({
  viewport: { width: 2400, height: 1600 },
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  screenshotPages: shots
    .filter((shot, index) => shots[index + 1]?.page !== shot.page)
    .map((shot) => shot.id),
});
