import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Reuse the installed video toolchain without adding a second dependency tree.
const require = createRequire(
  new URL("./intersection-goals/package.json", import.meta.url),
);
const { build } =
  require("esbuild") as typeof import("./intersection-goals/node_modules/esbuild");
const temporary = await mkdtemp(join(tmpdir(), "bo-highlight-tests-"));
try {
  const output = join(temporary, "highlight.test.cjs");
  await build({
    absWorkingDir: fileURLToPath(new URL("./", import.meta.url)),
    entryPoints: ["highlight.test.tsx"],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "cjs",
    loader: { ".woff": "file", ".woff2": "file", ".ttf": "file" },
    // TypeScript's paths point at declarations; bundling needs runtime modules.
    tsconfigRaw: { compilerOptions: { jsx: "react-jsx" } },
    nodePaths: [
      fileURLToPath(
        new URL("./intersection-goals/node_modules", import.meta.url),
      ),
    ],
  });
  const result = spawnSync(process.execPath, ["--test", output], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
