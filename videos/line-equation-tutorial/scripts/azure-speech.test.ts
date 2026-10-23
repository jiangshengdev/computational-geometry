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

test("pronunciation applies only to its segment and preserves spoken text", () => {
  const result = buildSpeechDocument([
    "两个端点",
    { text: "重合", pinyin: "chong2 he2" },
    "。重要。",
  ]);
  assert.equal(result.text, "两个端点重合。重要。");
  assert.ok(
    result.ssml.includes(
      '<phoneme alphabet="sapi" ph="chong 2 he 2">重合</phoneme>。重要。',
    ),
  );
});

test("speech input rejects both comma forms before synthesis", () => {
  for (const comma of ["，", ","]) {
    assert.throws(
      () => buildSpeechDocument(["前文。", `后文${comma}结论。`], "189-1"),
      /189-1\[1\].*comma/,
    );
  }
});

test("plain text cannot introduce SSML, and silence remains empty", () => {
  assert.ok(
    buildSpeechDocument('<break/> & "').ssml.includes('&lt;break/&gt; &amp; "'),
  );
  assert.equal(buildSpeechDocument("").text, "");
  assert.ok(
    buildSpeechDocument([{ text: "女", pinyin: "nv3" }]).ssml.includes(
      'ph="nv 3"',
    ),
  );
  assert.ok(
    buildSpeechDocument([{ text: "的", pinyin: "de5" }]).ssml.includes(
      'ph="de 5"',
    ),
  );
});

test("invalid model output fails with the row and segment location", () => {
  for (const part of [
    null,
    [],
    { text: "重合", pinyin: "chong2" },
    { text: "重合", pinyin: "chóng hé" },
    { text: "重合", pinyin: "chong0 he2" },
    { text: "重合", pinyin: 'chong2 he2"/>' },
    { text: "重合", pinyin: "chong2 he2", rate: "fast" },
    { text: "<重>", pinyin: "chong2" },
  ]) {
    assert.throws(
      () => buildSpeechDocument(["前文", part], "194-6"),
      /194-6\[1\]/,
    );
  }
  for (const value of [null, undefined, 1, {}, []]) {
    assert.throws(() => buildSpeechDocument(value, "194-6"), /194-6/);
  }
});
