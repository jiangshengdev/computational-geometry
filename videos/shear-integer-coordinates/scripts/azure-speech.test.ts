import assert from "node:assert/strict";
import test from "node:test";
import { buildSpeechDocument } from "./azure-speech.ts";

test("explicit letters use approved IPA while ordinary strings retain their SSML", () => {
  const plain = buildSpeechDocument("M");
  const explicit = buildSpeechDocument([{ letter: "M" }]);
  assert.equal(explicit.text, plain.text);
  assert.ok(
    explicit.ssml.includes(
      '<lang xml:lang="en-US"><phoneme alphabet="ipa" ph="ɛm">M</phoneme></lang>',
    ),
  );
  assert.ok(!plain.ssml.includes("phoneme"));
  assert.notEqual(explicit.fingerprint, plain.fingerprint);
  assert.throws(
    () => buildSpeechDocument([{ letter: "D" }], "sample"),
    /sample\[0\]: unsupported spoken letter/,
  );
  assert.throws(
    () => buildSpeechDocument("一，二", "sample"),
    /sample: speech must not contain commas/,
  );
});
