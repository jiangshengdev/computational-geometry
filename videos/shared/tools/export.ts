// User-only timeline export. The assistant may run --dry-run, never render.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { verifiedBrowser } from "./browser.ts";
import { requirePreflight } from "./preflight.ts";

export async function exportVideo(
  root: string,
  composition: string,
  destination: string,
  mode: "png" | "audio" = "png",
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
    ...(mode === "png"
      ? ["--sequence", "--image-format=png", "--muted", "--scale=2"]
      : [
          "--codec=wav",
          "--audio-codec=pcm-16",
          "--sample-rate=48000",
          "--hardware-acceleration=disable",
        ]),
    "--chrome-mode=headless-shell",
    `--browser-executable=${browser}`,
    "--overwrite=false",
  ];
  if (process.argv.includes("--dry-run")) {
    console.log(
      JSON.stringify(
        {
          stage: mode === "png" ? "PNG frames only" : "Timeline PCM WAV only",
          command: "pnpm",
          args,
        },
        null,
        2,
      ),
    );
  } else {
    if (process.argv.length > 2) throw Error("Only --dry-run is supported");
    if (existsSync(output))
      throw Error(
        "Output already exists; preserve and inspect it before starting another export.",
      );
    requirePreflight(root, browser);
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
      throw Error(
        "Timeline export failed; retain diagnostics and existing outputs",
      );
    console.log(
      mode === "png"
        ? "PNG sequence saved. Inspect frame count, numbering, dimensions and content before encoding video or adding audio."
        : "Timeline WAV saved. Inspect PCM format, stereo channels, duration and timeline identity before muxing.",
    );
  }
}
