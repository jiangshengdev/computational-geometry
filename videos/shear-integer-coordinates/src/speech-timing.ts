export type WordBoundary = {
  text: string;
  startMs: number;
  durationMs: number;
  textOffset: number;
  wordLength: number;
};
export type AudioTiming = {
  duration: number;
  words: WordBoundary[];
  speech: string;
  voice: string;
  fingerprint: string;
  alignment?: {
    method: "azure-pronunciation-assessment";
    audioSha256: string;
    synthesisWords: WordBoundary[];
    response: unknown;
    // Whole-sentence listening approval for these words in audioSha256 only.
    reviewedPronunciation?: { text: string; textOffset: number }[];
  };
};
export type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: null;
  confidence: null;
};

export function validateWords(audio: AudioTiming) {
  if (!audio.words.length) throw Error("Missing word boundaries");
  const spoken = (text: string) => text.replace(/[\p{P}\p{Z}\s]/gu, "");
  if (
    spoken(audio.words.map((word) => word.text).join("")) !==
    spoken(audio.speech)
  )
    throw Error("Word boundaries do not cover the complete speech");
  let previousSpoken: WordBoundary | undefined;
  for (const [i, word] of audio.words.entries()) {
    const previous = audio.words[i - 1];
    if (
      audio.speech.slice(word.textOffset, word.textOffset + word.wordLength) !==
        word.text ||
      !Number.isFinite(word.startMs) ||
      !Number.isFinite(word.durationMs) ||
      word.startMs < 0 ||
      word.durationMs < 0 ||
      (spoken(word.text).length > 0 && word.durationMs === 0) ||
      word.startMs + word.durationMs > audio.duration * 1000 + 1 ||
      (previous &&
        (word.textOffset < previous.textOffset + previous.wordLength ||
          (word.durationMs > 0 &&
            previousSpoken &&
            word.startMs < previousSpoken.startMs)))
    ) {
      throw Error(
        `Invalid word timing: ${JSON.stringify({ word, previous, expected: audio.speech.slice(word.textOffset, word.textOffset + word.wordLength), duration: audio.duration })}`,
      );
    }
    if (word.durationMs > 0) previousSpoken = word;
  }
}

const clauses = (text: string) =>
  Array.from(text.matchAll(/[^，。！？；：]+[，。！？；：]?/g), (m) => ({
    text: m[0],
    offset: m.index,
  }));

export function validateCaptionClauses(display: string, speech: string) {
  const visible = clauses(display),
    audible = clauses(speech);
  if (visible.length !== audible.length)
    throw Error(`Caption / speech clause mismatch: ${display}`);
  return { visible, audible };
}

export function createCaptions(display: string, audio: AudioTiming): Caption[] {
  validateWords(audio);
  const { visible, audible } = validateCaptionClauses(display, audio.speech);
  const result: Caption[] = [];
  for (let i = 0; i < visible.length; i++) {
    let text = visible[i].text;
    const from = audible[i].offset;
    // Match the reference tutorial: keep short opening clauses with the phrase
    // they introduce, without crossing sentence endings or long caption lines.
    while (
      !/[。！？；]$/.test(text) &&
      text.length < 10 &&
      i + 1 < visible.length &&
      text.length + visible[i + 1].text.length <= 32
    ) {
      text += visible[++i].text;
    }
    const to = audible[i].offset + audible[i].text.length;
    const words = audio.words.filter(
      (w) =>
        w.durationMs > 0 &&
        w.textOffset < to &&
        w.textOffset + w.wordLength > from,
    );
    if (!words.length) throw Error(`No word timing: ${text}`);
    const last = words[words.length - 1];
    result.push({
      text,
      startMs: words[0].startMs,
      endMs: last.startMs + last.durationMs,
      timestampMs: null,
      confidence: null,
    });
  }
  return result;
}

export function phraseTime(
  audio: AudioTiming,
  phrase: string,
  edge: "start" | "end",
) {
  validateWords(audio);
  const offset = audio.speech.indexOf(phrase);
  if (offset < 0 || audio.speech.indexOf(phrase, offset + 1) !== -1)
    throw Error(`Missing or ambiguous speech anchor: ${phrase}`);
  const words = audio.words.filter(
    (w) =>
      w.textOffset < offset + phrase.length &&
      w.textOffset + w.wordLength > offset,
  );
  if (!words.length) throw Error(`Missing timing for anchor: ${phrase}`);
  const word = edge === "start" ? words[0] : words[words.length - 1];
  return word.startMs + (edge === "end" ? word.durationMs : 0);
}

// Silence holds the last phrase. A different teaching page resets it.
export function captionAt(
  captions: Caption[],
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
