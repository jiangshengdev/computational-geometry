import { test } from "node:test";
import assert from "node:assert/strict";
import { aliasReferenceText, mapAliasWords } from "./speech-alias.ts";
const source = "输入 bee 满足。",
  reference = "输入 B 满足。",
  aliases = [{ sourceOffset: 3, spoken: "bee", letter: "B" }];
const words = [
  { text: "输入", startMs: 10, durationMs: 200, textOffset: 0, wordLength: 2 },
  {
    text: "bee",
    startMs: 210,
    durationMs: 300,
    textOffset: 999,
    wordLength: 3,
  },
  { text: "满足", startMs: 510, durationMs: 400, textOffset: 7, wordLength: 2 },
];
test("alias keeps canonical B and exact measured times without mutating raw events", () => {
  const before = structuredClone(words);
  assert.equal(aliasReferenceText(source, aliases), reference);
  const mapped = mapAliasWords(source, reference, aliases, words);
  assert.deepEqual(
    mapped.map((w) => [w.text, w.textOffset, w.wordLength]),
    [
      ["输入", 0, 2],
      ["B", 3, 1],
      ["满足", 5, 2],
    ],
  );
  assert.deepEqual(
    mapped.map((w) => [w.startMs, w.durationMs]),
    words.map((w) => [w.startMs, w.durationMs]),
  );
  assert.deepEqual(words, before);
});
test("missing or merged alias events and mismatched references fail closed", () => {
  assert.throws(() =>
    mapAliasWords(
      source,
      reference,
      aliases,
      words.filter((w) => w.text !== "bee"),
    ),
  );
  assert.throws(() =>
    mapAliasWords(source, reference, aliases, [
      { ...words[0], text: "输入 bee" },
      words[2],
    ]),
  );
  assert.throws(() => mapAliasWords(source, source, aliases, words));
});
