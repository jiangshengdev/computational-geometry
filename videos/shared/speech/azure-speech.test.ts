import { test } from "node:test";
import assert from "node:assert/strict";
import type * as SDK from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "./azure-speech.ts";

test("local pauses preserve text and letter spelling while binding the SSML fingerprint", () => {
  const { buildSpeechDocument } = createSpeechTools({} as typeof SDK, {
    voice: "test",
    commas: "document",
    fingerprint: true,
  });
  const original = buildSpeechDocument("记作 S。它");
  const paused = buildSpeechDocument([
    "记作 ",
    { breakMs: 20 },
    "S",
    { breakMs: 20 },
    "。它",
  ]);
  assert.equal(paused.text, original.text);
  assert.notEqual(paused.fingerprint, original.fingerprint);
  assert.equal(
    paused.ssml,
    original.ssml.replace(
      '<lang xml:lang="en-US"><say-as interpret-as="characters">S</say-as></lang>',
      '<break time="20ms"/><lang xml:lang="en-US"><say-as interpret-as="characters">S</say-as></lang><break time="20ms"/>',
    ),
  );
  for (const breakMs of [-1, 0.5, 5001, NaN, "20", '20"/>'])
    assert.throws(() => buildSpeechDocument(["S", { breakMs }]), /breakMs/);
  assert.throws(
    () => buildSpeechDocument([{ breakMs: 20, text: "S" }]),
    /expected Han/,
  );
});
