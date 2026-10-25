import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPreflight } from "./preflight.ts";

test("standalone preflight runs complete checks and reports failures without records", () => {
  const root = mkdtempSync(join(tmpdir(), "video-preflight-test-"));
  const put = (path: string, value: string) =>
    writeFileSync(join(root, path), value);
  const checker = (name: string) =>
    `import {appendFileSync} from "node:fs"; appendFileSync("checks.log", ${JSON.stringify(name + "\n")});`;
  try {
    mkdirSync(join(root, "scripts"));
    put("package.json", '{"type":"module"}');
    put(
      "scripts/check-content.ts",
      checker("content") +
        'if (!process.argv.includes("--decode")) process.exit(2);',
    );
    put("scripts/check-layout.ts", checker("layout"));
    runPreflight(root, "/unused-test-browser");
    assert.equal(
      readFileSync(join(root, "checks.log"), "utf8"),
      "content\nlayout\n",
    );
    assert.deepEqual(readdirSync(root).sort(), [
      "checks.log",
      "package.json",
      "scripts",
    ]);
    put("scripts/check-content.ts", "process.exit(1);");
    assert.throws(
      () => runPreflight(root, "/unused-test-browser"),
      /check-content.ts failed/,
    );
    assert.equal(
      readFileSync(join(root, "checks.log"), "utf8"),
      "content\nlayout\n",
    );
    put("scripts/check-content.ts", checker("content"));
    put("scripts/check-layout.ts", 'process.kill(process.pid, "SIGTERM");');
    assert.throws(
      () => runPreflight(root, "/unused-test-browser"),
      /check-layout.ts failed/,
    );
    assert.deepEqual(readdirSync(root).sort(), [
      "checks.log",
      "package.json",
      "scripts",
    ]);
  } finally {
    rmSync(root, { recursive: true });
  }
});
