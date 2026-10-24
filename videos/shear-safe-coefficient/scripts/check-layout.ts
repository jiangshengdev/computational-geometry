import { fileURLToPath } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkLayout } from "../../shared/checks/layout.ts";
import { verifiedBrowser } from "../../shared/tools/browser.ts";
import { shots } from "../src/storyboard.ts";
const browserExecutable = verifiedBrowser(import.meta.url);
const screenshotDirectory = process.argv.includes("--screenshots")
  ? mkdtempSync(join(tmpdir(), "shear232-layout-"))
  : undefined;
const requested = process.argv
  .find((arg) => arg.startsWith("--shots="))
  ?.slice(8)
  .split(",");
if (requested?.some((id) => !shots.some((shot) => shot.id === id)))
  throw Error("Unknown shot");
let checked = 0;
for (const shot of shots.filter(
  (shot) => !requested || requested.includes(shot.id),
)) {
  try {
    checked += await checkLayout({
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      browserExecutable,
      searchParams: { auditShot: shot.id },
      screenshotDirectory,
      screenshotPages: [shot.id],
      viewport: { width: 2400, height: 1600 },
    });
  } catch (error) {
    console.error(`FAIL ${shot.id}:`, error);
    process.exitCode = 1;
  }
}
console.log(
  `Checked ${checked} production states; ${process.exitCode ? "FAIL" : "PASS"}`,
);
