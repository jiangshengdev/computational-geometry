import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requirePreflight, runPreflight } from "./preflight.ts";

test("preflight gates export on complete checks and unchanged inputs", () => {
  const base = mkdtempSync(join(tmpdir(), "video-preflight-test-"));
  const root = join(base, "episode");
  const browser = join(base, "browser");
  const put = (path: string, value: string) =>
    writeFileSync(join(root, path), value);
  try {
    for (const dir of ["src", "scripts", "public", "out", "node_modules/.pnpm"])
      mkdirSync(join(root, dir), { recursive: true });
    mkdirSync(join(base, "shared"));
    writeFileSync(browser, "browser version 1");
    put("package.json", '{"type":"module"}');
    put("src/scene.ts", "export const scene = 1;");
    put("public/audio.wav", "audio 1");
    put("node_modules/.pnpm/lock.yaml", "dependencies: 1");
    const check =
      'import {appendFileSync} from "node:fs"; appendFileSync("out/checks.log", "checked\\n");';
    put("scripts/check-content.ts", check);
    put("scripts/check-layout.ts", check);
    assert.throws(() => requirePreflight(root, browser), /No completed/);
    put("out/export-preflight.json", "invalid json");
    assert.throws(() => requirePreflight(root, browser), /No completed/);
    runPreflight(root, browser);
    requirePreflight(root, browser);
    put("out/rendered.png", "new output");
    requirePreflight(root, browser);
    assert.equal(
      readFileSync(join(root, "out/checks.log"), "utf8"),
      "checked\nchecked\n",
    );
    for (const [path, value] of [
      ["src/scene.ts", "export const scene = 2;"],
      ["public/audio.wav", "audio 2"],
      ["remotion.config.ts", "export {};"],
      ["node_modules/.pnpm/lock.yaml", "dependencies: 2"],
    ]) {
      put(path, value);
      assert.throws(
        () => requirePreflight(root, browser),
        /inputs have changed/,
      );
      runPreflight(root, browser);
    }
    writeFileSync(join(base, "shared/check.ts"), "changed shared checker");
    assert.throws(() => requirePreflight(root, browser), /inputs have changed/);
    runPreflight(root, browser);
    writeFileSync(browser, "browser version 2");
    assert.throws(() => requirePreflight(root, browser), /inputs have changed/);
    runPreflight(root, browser);
    // Failure must invalidate even a previous successful record.
    put("scripts/check-layout.ts", "process.exit(1);");
    assert.throws(() => runPreflight(root, browser), /failed/);
    assert.throws(() => requirePreflight(root, browser), /No completed/);
    // Interrupted checks must never publish a success record.
    put("scripts/check-layout.ts", 'process.kill(process.pid, "SIGTERM");');
    assert.throws(() => runPreflight(root, browser), /failed/);
    assert.throws(() => requirePreflight(root, browser), /No completed/);
    put(
      "scripts/check-layout.ts",
      'import {writeFileSync} from "node:fs"; writeFileSync("src/scene.ts", "changed during check");',
    );
    assert.throws(() => runPreflight(root, browser), /Inputs changed during/);
    assert.throws(() => requirePreflight(root, browser), /No completed/);
  } finally {
    rmSync(base, { recursive: true });
  }
});
