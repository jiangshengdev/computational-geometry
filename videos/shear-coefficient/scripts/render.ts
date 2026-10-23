// User-only export entry. The assistant must not execute this script.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const browser =
  process.env.CHROME_EXECUTABLE ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!existsSync(browser))
  throw Error("Set CHROME_EXECUTABLE to an existing Chrome executable");
for (const [script, ...args] of [
  ["check-content.ts", "--decode"],
  ["check-layout.ts"],
]) {
  const checked = spawnSync(
    process.execPath,
    [`${root}scripts/${script}`, ...args],
    { cwd: root, stdio: "inherit" },
  );
  if (checked.error) throw checked.error;
  if (checked.status !== 0) process.exit(checked.status ?? 1);
}
const server = createServer();
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string")
  throw Error("Cannot allocate export port");
await new Promise<void>((resolve, reject) =>
  server.close((error) => (error ? reject(error) : resolve())),
);
const child = spawn(
  "pnpm",
  [
    "--config.verify-deps-before-run=false",
    "exec",
    "remotion",
    "render",
    "src/index.ts",
    "ShearCoefficient",
    "out/shear-coefficient.mp4",
    `--browser-executable=${browser}`,
    `--port=${address.port}`,
  ],
  { cwd: root, stdio: "inherit" },
);
child.on("error", (error) => {
  throw error;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
