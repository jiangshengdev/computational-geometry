import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Load the caller's installed toolchain; lint from the shared source root so
// ESLint's outside-base-directory exclusion cannot silently skip these files.
const require = createRequire(resolve("package.json"));
const { ESLint } = require("eslint");
const { config } = require("@remotion/eslint-config-flat");
const eslint = new ESLint({
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  overrideConfigFile: true,
  overrideConfig: config,
});
const results = await eslint.lintFiles(["**/*.ts", "**/*.tsx"]);
const formatter = await eslint.loadFormatter("stylish");
process.stdout.write(formatter.format(results));
if (results.some((result: { errorCount: number }) => result.errorCount))
  process.exitCode = 1;
