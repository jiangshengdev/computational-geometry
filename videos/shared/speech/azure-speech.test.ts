import { test } from "node:test";
import assert from "node:assert/strict";
import type * as SDK from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "./azure-speech.ts";

test("explicit letter IPA preserves reference text and leaves default spelling unchanged", () => {
  const { buildSpeechDocument } = createSpeechTools({} as typeof SDK, {
    voice: "test",
    commas: "document",
    fingerprint: true,
  });
  const original = buildSpeechDocument("在 p 对应位置。U");
  const adopted = buildSpeechDocument([
    "在 ",
    { letter: "p", ipa: "piː" },
    " 对应位置。U",
  ]);
  assert.equal(adopted.text, original.text);
  assert.equal(
    adopted.ssml,
    original.ssml.replace(
      '<lang xml:lang="en-US"><say-as interpret-as="characters">P</say-as></lang>',
      '<lang xml:lang="en-US"><phoneme alphabet="ipa" ph="piː">p</phoneme></lang>',
    ),
  );
  assert.notEqual(adopted.fingerprint, original.fingerprint);
  for (const invalid of [
    { letter: "pp", ipa: "piː" },
    { letter: "p", ipa: "" },
    { letter: "p", ipa: '"/><break/>' },
    { letter: "p", ipa: "piː", rate: 1 },
  ])
    assert.throws(() => buildSpeechDocument([invalid]));
});

test("explicit English words retain word pronunciation without changing letter spelling", () => {
  const { buildSpeechDocument } = createSpeechTools({} as typeof SDK, {
    voice: "test",
    commas: "document",
    fingerprint: true,
  });
  const original = buildSpeechDocument("检查 Q。A");
  const adopted = buildSpeechDocument(["检查 ", { englishWord: "cue" }, "。A"]);
  assert.equal(adopted.text, "检查 cue。A");
  assert.equal(
    adopted.ssml,
    original.ssml.replace(
      '<lang xml:lang="en-US"><say-as interpret-as="characters">Q</say-as></lang>',
      '<lang xml:lang="en-US">cue</lang>',
    ),
  );
  assert.notEqual(adopted.fingerprint, original.fingerprint);
  for (const englishWord of ["", "two words", "<break/>", 1])
    assert.throws(() => buildSpeechDocument([{ englishWord }]), /englishWord/);
});

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
