import type { WordBoundary } from "./azure-speech.ts";

// Spoken formulas contain sentence breaks absent from the displayed notation.
const spokenExpressions = [
  "横坐标为二、纵坐标为六的点。在这条直线上吗？",
  "A、乘、X。加、B、乘、Y。等于、C。",
  "A、乘一。加、B、乘三。等于、C。",
];

function clauses(text: string, spoken = false) {
  let masked = text;
  if (spoken)
    for (const expression of spokenExpressions)
      masked = masked.replace(
        expression,
        expression.slice(0, -1).replace(/。/g, "\u0000") + expression.slice(-1),
      );
  let offset = 0;
  return (masked.match(/[^，。！？；：]+[，。！？；：]?/g) ?? []).map(
    (part) => {
      const result = { text: text.slice(offset, offset + part.length), offset };
      offset += part.length;
      return result;
    },
  );
}

export function captionPhrases(display: string, spoken: string) {
  const visible = clauses(display);
  const audible = clauses(spoken, true);
  if (visible.length !== audible.length)
    throw new Error("Caption / speech clause mismatch");
  const phrases: { text: string; speechStart: number; speechEnd: number }[] =
    [];
  for (let index = 0; index < visible.length; index++) {
    let text = visible[index].text;
    const speechStart = audible[index].offset;
    while (
      !/[。！？；]$/.test(text) &&
      text.length < 10 &&
      index + 1 < visible.length &&
      text.length + visible[index + 1].text.length <= 32
    ) {
      text += visible[++index].text;
    }
    phrases.push({
      text,
      speechStart,
      speechEnd: audible[index].offset + audible[index].text.length,
    });
  }
  if (phrases.map((p) => p.text).join("") !== display)
    throw new Error("Caption text was lost");
  return phrases;
}

export function createCaptions(
  display: string,
  spoken: string,
  words: WordBoundary[],
) {
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    if (
      spoken.slice(word.textOffset, word.textOffset + word.wordLength) !==
        word.text ||
      !Number.isFinite(word.startMs) ||
      !Number.isFinite(word.durationMs) ||
      word.startMs < 0 ||
      word.durationMs < 0 ||
      (index > 0 && word.textOffset < words[index - 1].textOffset)
    ) {
      throw new Error("Word timings do not match the speech text");
    }
  }
  return captionPhrases(display, spoken).map((phrase) => {
    const matching = words.filter(
      (word) =>
        word.textOffset >= phrase.speechStart &&
        word.textOffset < phrase.speechEnd,
    );
    if (!matching.length)
      throw new Error(`Missing word timing: ${phrase.text}`);
    const first = matching[0],
      last = matching[matching.length - 1];
    return {
      text: phrase.text,
      startMs: first.startMs,
      endMs: last.startMs + last.durationMs,
      timestampMs: null,
      confidence: null,
    };
  });
}
