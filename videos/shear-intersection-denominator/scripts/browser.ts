import { createRequire } from "node:module";
import { dirname, join, basename } from "node:path";
import { realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";

/** Shared by this episode's layout gate and user-only export entry. */
export function verifiedBrowser() {
  const require = createRequire(import.meta.url);
  const cliRequire = createRequire(require.resolve("@remotion/cli"));
  const renderer = dirname(cliRequire.resolve("@remotion/renderer"));
  const { TESTED_VERSION } = require(
    join(renderer, "browser/get-chrome-download-url.js"),
  );
  const requested = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (!requested)
    throw Error(
      "Set REMOTION_BROWSER_EXECUTABLE to an installed, version-matched Chrome Headless Shell. No browser will be downloaded.",
    );
  const browserExecutable = realpathSync(requested);
  if (basename(browserExecutable) !== "chrome-headless-shell")
    throw Error("Chrome Headless Shell is required");
  const actual = execFileSync(browserExecutable, ["--version"], {
    encoding: "utf8",
  }).trim();
  if (actual.match(/\d+\.\d+\.\d+\.\d+/)?.[0] !== TESTED_VERSION)
    throw Error(`Expected Headless Shell ${TESTED_VERSION}; got ${actual}`);
  console.log(
    `Verified Headless Shell ${TESTED_VERSION}: ${browserExecutable}`,
  );
  return browserExecutable;
}
