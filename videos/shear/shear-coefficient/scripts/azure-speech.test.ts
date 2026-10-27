import assert from "node:assert/strict";
import test from "node:test";
import { buildSpeechDocument } from "./azure-speech.ts";

test("coefficient speech retains document-level comma validation and excludes letter objects", () => {
  assert.throws(
    () => buildSpeechDocument(["一，", "二"], "sample"),
    /sample: speech must not contain commas/,
  );
  assert.throws(
    () => buildSpeechDocument([{ letter: "M" }], "sample"),
    /sample\[0\]: expected Han text and numbered pinyin/,
  );
  assert.equal(buildSpeechDocument("M").text, "M");
});
