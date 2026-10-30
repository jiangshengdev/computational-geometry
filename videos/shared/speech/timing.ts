import { groupCaptionClauses, timedCaption } from "./captions.ts";
export { captionAt } from "./captions.ts";
export type WordBoundary = {
  text: string;
  startMs: number;
  durationMs: number;
  textOffset: number;
  wordLength: number;
};
export type AudioTiming = {
  audioFile?: string;
  outputFormat?: string;
  audioSha256?: string;
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
    pronunciationReview?: "pending-listening";
    reviewedRecognition?: {
      audioSha256: string;
      fingerprint: string;
      text: string;
      textOffset: number;
      firstWord: number;
      expected: { text: string; errorType: "Insertion" | "Omission" }[];
      decision: string;
    }[];
  };
};
export type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: null;
  confidence: null;
};

// Azure spells Latin letters in uppercase regardless of source casing.
// Fold only ASCII case for comparison; preserve source offsets and service data.
export const speechComparisonText = (text: string) =>
  text.replace(/[a-z]/g, (letter) => letter.toUpperCase());

export function validateWords(audio: AudioTiming) {
  if (!audio.words.length) throw Error("Missing word boundaries");
  const spoken = (text: string) =>
    speechComparisonText(text).replace(/[\p{P}\p{Z}\s]/gu, "");
  if (
    spoken(audio.words.map((word) => word.text).join("")) !==
    spoken(audio.speech)
  )
    throw Error("Word boundaries do not cover the complete speech");
  let previousSpoken: WordBoundary | undefined;
  for (const [i, word] of audio.words.entries()) {
    const previous = audio.words[i - 1];
    if (
      speechComparisonText(
        audio.speech.slice(word.textOffset, word.textOffset + word.wordLength),
      ) !== speechComparisonText(word.text) ||
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

export type CaptionPlan = { caption: string; speech: string }[];
export function validateCaptionClauses(
  display: string,
  speech: string,
  plan?: CaptionPlan,
) {
  if (plan) {
    if (
      !plan.length ||
      plan.some((part) => !part.caption.trim() || !part.speech.trim()) ||
      plan.map((part) => part.caption).join("") !== display ||
      plan.map((part) => part.speech).join("") !== speech
    )
      throw Error(
        "Caption plan must cover the complete display and speech in order",
      );
    let displayOffset = 0,
      speechOffset = 0;
    const visible = plan.map((part) => {
      const result = { text: part.caption, offset: displayOffset };
      displayOffset += part.caption.length;
      return result;
    });
    const audible = plan.map((part) => {
      const result = { text: part.speech, offset: speechOffset };
      speechOffset += part.speech.length;
      return result;
    });
    return { visible, audible };
  }
  const visible = clauses(display),
    audible = clauses(speech);
  if (visible.length !== audible.length)
    throw Error(`Caption / speech clause mismatch: ${display}`);
  return { visible, audible };
}

export function createCaptions(
  display: string,
  audio: AudioTiming,
  plan?: CaptionPlan,
): Caption[] {
  validateWords(audio);
  const { visible, audible } = validateCaptionClauses(
    display,
    audio.speech,
    plan,
  );
  return groupCaptionClauses(visible, audible).map(
    ({ text, speechStart: from, speechEnd: to }) => {
      const words = audio.words.filter(
        (w) =>
          w.durationMs > 0 &&
          w.textOffset < to &&
          w.textOffset + w.wordLength > from,
      );
      if (!words.length) throw Error(`No word timing: ${text}`);
      return timedCaption(text, words);
    },
  );
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
