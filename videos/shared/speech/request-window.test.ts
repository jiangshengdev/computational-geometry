import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { acquireSynthesisWindow } from "./request-window.ts";

test("F0 rolling quota survives batch changes and excludes concurrent owners", () => {
  const endpoint = `https://${randomUUID()}.invalid`;
  const first = acquireSynthesisWindow(endpoint);
  try {
    assert.throws(() => acquireSynthesisWindow(endpoint), { code: "EEXIST" });
    for (let index = 0; index < 20; index++) first.record(1000 + index * 100);
    assert.equal(first.delay(5000), 56000);
  } finally {
    first.release();
  }
  const second = acquireSynthesisWindow(endpoint);
  try {
    assert.equal(second.delay(60999), 1);
    assert.equal(second.delay(61000), 0);
    second.record(61000);
    assert.equal(second.delay(61000), 100);
    assert.equal(second.delay(121000), 0);
  } finally {
    second.release();
  }
});
