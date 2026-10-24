import type { WordBoundary, Caption } from "./timing.ts";
export type Clause = { text: string; offset: number };
export function groupCaptionClauses(visible: Clause[], audible: Clause[]) {
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
    )
      text += visible[++index].text;
    phrases.push({
      text,
      speechStart,
      speechEnd: audible[index].offset + audible[index].text.length,
    });
  }
  return phrases;
}

export function timedCaption(text: string, words: WordBoundary[]): Caption {
  const first = words[0],
    last = words[words.length - 1];
  return {
    text,
    startMs: first.startMs,
    endMs: last.startMs + last.durationMs,
    timestampMs: null,
    confidence: null,
  };
}

// The owning chapter/page passes its own cues, so silence cannot leak across it.
export function captionAt(
  captions: readonly { text: string; startMs: number }[],
  milliseconds: number,
  previous = "",
) {
  let current = previous;
  for (const caption of captions) {
    if (caption.startMs > milliseconds) break;
    current = caption.text;
  }
  return current;
}
