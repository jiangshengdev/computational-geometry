import assert from "node:assert/strict";
import test from "node:test";
import { buildSpeechDocument } from "./azure-speech.ts";

test("standalone letters use English IPA while words and Chinese annotations remain intact", () => {
  const input = [
    "A、的坐标等于、s、乘、y。why、Azure、SSML。<&>",
    { text: "重合", pinyin: "chong2 he2" },
  ];
  const result = buildSpeechDocument(input);
  assert.equal(result.text, input[0] + "重合");
  for (const [letter, ipa] of [
    ["A", "eɪ"],
    ["s", "ɛs"],
    ["y", "waɪ"],
  ]) {
    assert.ok(
      result.ssml.includes(
        `<lang xml:lang="en-US"><phoneme alphabet="ipa" ph="${ipa}">${letter}</phoneme></lang>`,
      ),
    );
  }
  assert.equal((result.ssml.match(/alphabet="ipa"/g) ?? []).length, 3);
  assert.ok(result.ssml.includes("why、Azure、SSML。&lt;&amp;&gt;"));
  assert.ok(
    result.ssml.includes(
      '<phoneme alphabet="sapi" ph="chong 2 he 2">重合</phoneme>',
    ),
  );
  assert.doesNotMatch(result.ssml, /<prosody|rate=/);
});

test("all 26 letter names support both cases and preserve their spelling", () => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const upper = buildSpeechDocument(alphabet.split("").join("、"));
  const text = alphabet.toLowerCase().split("").join("、");
  const lower = buildSpeechDocument(text);
  assert.equal(lower.text, text);
  for (const result of [upper, lower]) {
    assert.equal((result.ssml.match(/alphabet="ipa"/g) ?? []).length, 26);
    assert.equal((result.ssml.match(/<lang xml:lang="en-US">/g) ?? []).length, 26);
  }
  assert.equal(
    lower.ssml,
    upper.ssml.replace(/>([A-Z])<\/phoneme>/g, (_, letter: string) =>
      `>${letter.toLowerCase()}</phoneme>`,
    ),
  );
  assert.ok(lower.ssml.includes('ph="ɛks">x</phoneme>'));
});
