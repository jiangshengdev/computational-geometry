import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkLayout } from "./layout.ts";
import { verifiedBrowser } from "../tools/browser.ts";
import { resolve } from "node:path";
export async function checkShotLayouts(root: string, shots: { id: string }[]) {
  const browserExecutable = verifiedBrowser(resolve(root, "package.json"));
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
        cwd: root,
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
}
