// User-only PNG sequence export. The assistant may run --dry-run, never render.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { verifiedBrowser } from "./browser.ts";

export async function exportVideo(
  root: string,
  composition: string,
  destination: string,
) {
  const browser = verifiedBrowser(resolve(root, "package.json"));
  const output = resolve(root, destination);
  const args = [
    "--config.verify-deps-before-run=false",
    "exec",
    "remotion",
    "render",
    "src/index.ts",
    composition,
    output,
    "--sequence",
    "--image-format=png",
    "--muted",
    "--scale=2",
    "--chrome-mode=headless-shell",
    `--browser-executable=${browser}`,
    "--overwrite=false",
  ];
  if (process.argv.includes("--dry-run")) {
    console.log(
      JSON.stringify(
        { stage: "PNG frames only", command: "pnpm", args },
        null,
        2,
      ),
    );
  } else {
    if (process.argv.length > 2) throw Error("Only --dry-run is supported");
    if (existsSync(output))
      throw Error(
        "Frame output already exists; preserve and inspect it before starting another export.",
      );
    for (const [script, ...options] of [
      ["check-content.ts", "--decode"],
      ["check-layout.ts"],
    ]) {
      const checked = spawnSync(
        process.execPath,
        [`scripts/${script}`, ...options],
        { cwd: root, stdio: "inherit" },
      );
      if (checked.error) throw checked.error;
      if (checked.status !== 0) throw Error(`${script} failed; export stopped`);
    }
    const allocator = createServer();
    await new Promise<void>((resolve) =>
      allocator.listen(0, "127.0.0.1", resolve),
    );
    const address = allocator.address();
    if (!address || typeof address === "string")
      throw Error("Cannot allocate export port");
    await new Promise<void>((resolve, reject) =>
      allocator.close((error) => (error ? reject(error) : resolve())),
    );
    const rendered = spawnSync("pnpm", [...args, `--port=${address.port}`], {
      cwd: root,
      stdio: "inherit",
    });
    if (rendered.error) throw rendered.error;
    if (rendered.status !== 0)
      throw Error("PNG sequence export failed; retain diagnostics and frames");
    console.log(
      "PNG sequence saved. Inspect frame count, numbering, dimensions and content before encoding video or adding audio.",
    );
  }
}
