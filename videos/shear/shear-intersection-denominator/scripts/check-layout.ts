import { fileURLToPath } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkLayout } from "../../../shared/checks/layout.ts";
import { shots, pages } from "../src/storyboard.ts";
import { verifiedBrowser } from "./browser.ts";
const browserExecutable = verifiedBrowser();
const screenshotDirectory = process.argv.includes("--screenshots")
  ? mkdtempSync(join(tmpdir(), "shear-layout-"))
  : undefined;
let checked = 0;
// Bound each browser run without dropping any page, cue or boundary state.
for (const page of Object.keys(pages)) {
  console.log(`Checking production page: ${page}`);
  try {
    checked += await checkLayout({
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      browserExecutable,
      viewport: { width: 2400, height: 1600 },
      searchParams: { auditPage: page },
      screenshotDirectory,
      screenshotPages: shots
        .filter(
          (shot, index) =>
            shot.page === page && shots[index + 1]?.page !== page,
        )
        .map((shot) => shot.id),
    });
  } catch (error) {
    console.error(`FAIL ${page}:`, error);
    process.exitCode = 1;
  }
}
console.log(
  `Checked ${checked} production states across ${Object.keys(pages).length} teaching pages; ${process.exitCode ? "FAIL" : "PASS"}`,
);
