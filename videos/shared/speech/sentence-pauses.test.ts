import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applySentencePauses,
  validateSentencePauses,
  type SentencePlan,
} from "./sentence-pauses.ts";

test("source sentences set 400ms; internal spoken phrases set 200ms regardless of punctuation", () => {
  const plan: SentencePlan = [
    { caption: "只看邻居，会漏掉吗？", speech: ["只看邻居。", "会漏掉吗？"] },
    { caption: "他说：“不会！！”", speech: ["他说：“不会！！”"] },
    { caption: "先想一想……", speech: ["先想一想……"] },
    { caption: "继续", speech: ["继续"] },
  ];
  const caption = plan.map((s) => s.caption).join("");
  const text = plan.flatMap((s) => s.speech).join("");
  const updated = applySentencePauses(caption, text, text, plan);
  assert.deepEqual(updated, [
    "只看邻居。",
    { breakMs: 200 },
    "会漏掉吗？",
    { breakMs: 400 },
    "他说：“不会！！”",
    { breakMs: 400 },
    "先想一想……",
    { breakMs: 400 },
    "继续",
    { breakMs: 400 },
  ]);
  assert.doesNotThrow(() =>
    validateSentencePauses(caption, updated, text, plan, "test"),
  );
  assert.deepEqual(applySentencePauses(caption, updated, text, plan), updated);
});

test("retained clause punctuation, parentheses and ellipses do not create unreviewed pauses", () => {
  const plan = [
    {
      caption: "想一想……（x=1.5）；再判断!",
      speech: ["想一想……（x=1.5）；再判断!"],
    },
  ];
  const text = plan[0].caption;
  assert.deepEqual(applySentencePauses(text, text, text, plan), [
    text,
    { breakMs: 400 },
  ]);
});

test("missing, wrong, duplicate and misplaced breaks fail before synthesis", () => {
  const plan = [{ caption: "一对？", speech: ["一对？"] }];
  for (const parts of [
    ["一对？"],
    ["一对？", { breakMs: 200 }],
    ["一对？", { breakMs: 400 }, { breakMs: 400 }],
    ["一对", { breakMs: 400 }, "？"],
  ])
    assert.throws(
      () => validateSentencePauses("一对？", parts, "一对？", plan, "S02"),
      /S02: sentence pauses mismatch/,
    );
  assert.throws(
    () =>
      validateSentencePauses("另一对？", ["一对？"], "一对？", plan, "test"),
    /original captions/,
  );
  assert.throws(
    () => validateSentencePauses("一对？", ["一对！"], "一对！", plan, "test"),
    /spoken text/,
  );
});

test("break regeneration preserves pronunciations, spelling, English words and all text", () => {
  const parts = [
    { text: "一对", pinyin: "yi2 dui4" },
    "？检查 ",
    { letter: "A" },
    " 与 ",
    { englishWord: "bee" },
    "。",
    { breakMs: 200 },
  ];
  const plan = [
    { caption: "一对？", speech: ["一对？"] },
    { caption: "检查 A 与 B。", speech: ["检查 A 与 bee。"] },
  ];
  const result = applySentencePauses(
    "一对？检查 A 与 B。",
    parts,
    "一对？检查 A 与 bee。",
    plan,
  );
  assert.deepEqual(result, [
    parts[0],
    "？",
    { breakMs: 400 },
    "检查 ",
    parts[2],
    " 与 ",
    parts[4],
    "。",
    { breakMs: 400 },
  ]);
  assert.throws(
    () =>
      applySentencePauses("一对", [parts[0]], "一对", [
        { caption: "一对", speech: ["一", "对"] },
      ]),
    /splits a pronunciation/,
  );
});
