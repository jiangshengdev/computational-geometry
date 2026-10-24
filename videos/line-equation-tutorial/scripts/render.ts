import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { verifiedBrowser } from "../../shared/tools/browser.ts";
// Use an existing browser only, and a fresh OS-assigned port. Never install tools.
const browser = verifiedBrowser(import.meta.url);
const server = createServer();
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string")
  throw Error("Cannot allocate rendering port");
await new Promise<void>((resolve, reject) =>
  server.close((error) => (error ? reject(error) : resolve())),
);
const [
  command = "render",
  composition = "LineEquationTutorial",
  output = "out/line-equation-tutorial-frames",
  ...options
] = process.argv.slice(2);
if (!["render", "still", "compositions"].includes(command))
  throw Error("Unsupported rendering command");
if (command === "render" && existsSync(output))
  throw Error("Preserve existing PNG output; use a new directory");
// A failed page blocks export; the audit itself continues through all pages.
if (command === "render" || command === "still") {
  const check = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./check-layout.ts", import.meta.url))],
    {
      stdio: "inherit",
    },
  );
  if (check.error) throw check.error;
  if (check.status !== 0) process.exit(check.status ?? 1);
}
const args = [
  "--config.verify-deps-before-run=false",
  "exec",
  "remotion",
  command,
  "src/index.ts",
  composition,
  output,
  `--browser-executable=${browser}`,
  `--port=${address.port}`,
  ...options,
  "--chrome-mode=headless-shell",
  ...(command === "render"
    ? ["--sequence", "--image-format=png", "--muted", "--overwrite=false"]
    : []),
];
const child = spawn("pnpm", args, {
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  stdio: "inherit",
});
child.on("error", (error) => {
  throw error;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
