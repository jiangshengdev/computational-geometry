import { spawnSync } from "node:child_process";

export function runPreflight(root: string, browser: string) {
  for (const [script, ...options] of [
    ["check-content.ts", "--decode"],
    ["check-layout.ts"],
  ]) {
    const checked = spawnSync(
      process.execPath,
      [`scripts/${script}`, ...options],
      {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, REMOTION_BROWSER_EXECUTABLE: browser },
      },
    );
    if (checked.error) throw checked.error;
    if (checked.status !== 0)
      throw Error(`${script} failed; preflight stopped`);
  }
  console.log("Preflight passed. Review the results before continuing.");
}
