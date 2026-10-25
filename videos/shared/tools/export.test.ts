import { test, mock } from "node:test";
import { strict as assert } from "node:assert";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("exports do not depend on preflight records and retain output protection", async () => {
  const root = mkdtempSync(join(tmpdir(), "video-export-test-"));
  const calls: string[][] = [];
  // No renderer or browser is executed by this test.
  const child = mock.module("node:child_process", {
    namedExports: {
      spawnSync: (command: string, args: string[]) => {
        assert.equal(command, "pnpm");
        calls.push(args);
        return { status: 0 };
      },
    },
  });
  const browser = mock.module("./browser.ts", {
    namedExports: { verifiedBrowser: () => "/verified/chrome-headless-shell" },
  });
  try {
    const { exportVideo } = await import("./export.ts");
    mkdirSync(join(root, "out"));
    for (const record of [
      undefined,
      "invalid",
      '{"status":"running"}',
      '{"status":"passed","fingerprint":"outdated"}',
    ]) {
      if (record !== undefined)
        writeFileSync(join(root, "out/export-preflight.json"), record);
      await exportVideo(root, "Example", "out/audio.wav", "audio");
    }
    await exportVideo(root, "Example", "out/frames");
    assert.equal(calls.length, 5);
    for (const args of calls) {
      assert.ok(args.includes("--overwrite=false"));
      assert.ok(
        args.includes("--browser-executable=/verified/chrome-headless-shell"),
      );
      assert.ok(args.some((arg) => /^--port=[1-9]\d*$/.test(arg)));
    }
    assert.ok(calls[0].includes("--codec=wav"));
    assert.ok(calls[0].includes("--hardware-acceleration=disable"));
    assert.ok(calls[4].includes("--sequence"));
    writeFileSync(join(root, "out/audio.wav"), "existing");
    await assert.rejects(
      exportVideo(root, "Example", "out/audio.wav", "audio"),
      /already exists/,
    );
    assert.equal(calls.length, 5);
    assert.deepEqual(readdirSync(join(root, "out")).sort(), [
      "audio.wav",
      "export-preflight.json",
    ]);
  } finally {
    child.restore();
    browser.restore();
    rmSync(root, { recursive: true });
  }
});
