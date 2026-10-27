import assert from "node:assert/strict";
import test from "node:test";
import { buildSpeechDocument } from "./azure-speech.ts";

test("explicit and plain letters use the same spelling mode", () => {
  const plain = buildSpeechDocument("M");
  const explicit = buildSpeechDocument([{ letter: "M" }]);
  assert.equal(explicit.text, plain.text);
  assert.ok(
    explicit.ssml.includes(
      '<lang xml:lang="en-US"><say-as interpret-as="characters">M</say-as></lang>',
    ),
  );
  assert.ok(!plain.ssml.includes("phoneme"));
  assert.equal(explicit.fingerprint, plain.fingerprint);
  assert.throws(
    () => buildSpeechDocument([{ letter: "MM" }], "sample"),
    /sample\[0\]: unsupported spoken letter/,
  );
  assert.throws(
    () => buildSpeechDocument("一，二", "sample"),
    /sample: speech must not contain commas/,
  );
});
