import assert from "node:assert/strict";
import test from "node:test";
import { buildSpeechDocument } from "./azure-speech.ts";

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
