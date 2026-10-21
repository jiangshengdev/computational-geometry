import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
// Use an existing browser only, and a fresh OS-assigned port. Never install tools.
const browser =
  process.env.CHROME_EXECUTABLE ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!existsSync(browser))
  throw Error("Set CHROME_EXECUTABLE to an existing Chrome executable.");
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
  output = "out/line-equation-tutorial.mp4",
  ...options
] = process.argv.slice(2);
if (!["render", "still", "compositions"].includes(command))
  throw Error("Unsupported rendering command");
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
