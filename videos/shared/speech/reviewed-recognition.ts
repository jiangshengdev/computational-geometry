import { speechComparisonText, type AudioTiming } from "./timing.ts";

export type AssessmentWord = {
  Word: string;
  Offset: number;
  Duration: number;
  PronunciationAssessment: { ErrorType: string };
  reviewedTextOffset?: number;
};

/** Reconcile only explicitly confirmed errors, using existing synthesis events.
 * The original response (including its error counts) is never modified.
 */
export function reviewedRecognitionWords(
  audio: AudioTiming,
  raw: AssessmentWord[],
): AssessmentWord[] {
  const reviews = audio.alignment?.reviewedRecognition ?? [];
  const replacements = new Map<
    number,
    { count: number; word: AssessmentWord }
  >();
  const used = new Set<number>();
  for (const review of reviews) {
    if (
      !review.decision.trim() ||
      review.audioSha256 !== audio.audioSha256 ||
      review.audioSha256 !== audio.alignment?.audioSha256 ||
      review.fingerprint !== audio.fingerprint
    )
      throw Error("Recognition review binding does not match audio and text");
    if (
      !Number.isInteger(review.firstWord) ||
      review.firstWord < 0 ||
      !review.expected.length ||
      !review.expected.some(
        (w) =>
          w.errorType === "Omission" &&
          speechComparisonText(w.text) === speechComparisonText(review.text),
      )
    )
      throw Error("Recognition review requires an exact omitted source word");
    for (const [offset, expected] of review.expected.entries()) {
      const index = review.firstWord + offset;
      const word = raw[index];
      if (
        used.has(index) ||
        !word ||
        word.Word !== expected.text ||
        word.PronunciationAssessment.ErrorType !== expected.errorType ||
        !["Omission", "Insertion"].includes(expected.errorType)
      )
        throw Error("Recognition review does not match original response");
      used.add(index);
    }
    const measured = (audio.alignment?.synthesisWords ?? audio.words).filter(
      (w) =>
        w.textOffset === review.textOffset &&
        w.wordLength === review.text.length &&
        speechComparisonText(w.text) === speechComparisonText(review.text),
    );
    const source = measured[0];
    if (
      measured.length !== 1 ||
      !source ||
      speechComparisonText(
        audio.speech.slice(
          review.textOffset,
          review.textOffset + review.text.length,
        ),
      ) !== speechComparisonText(review.text) ||
      !Number.isFinite(source.startMs) ||
      !Number.isFinite(source.durationMs) ||
      source.startMs < 0 ||
      source.durationMs <= 0 ||
      source.startMs + source.durationMs > audio.duration * 1000 + 1
    )
      throw Error(
        "Recognition review requires valid synthesis timing for the exact source word",
      );
    replacements.set(review.firstWord, {
      count: review.expected.length,
      word: {
        Word: source.text,
        Offset: source.startMs * 10000,
        Duration: source.durationMs * 10000,
        PronunciationAssessment: { ErrorType: "Omission" },
        reviewedTextOffset: review.textOffset,
      },
    });
  }
  const words: AssessmentWord[] = [];
  for (let index = 0; index < raw.length; index++) {
    const replacement = replacements.get(index);
    if (replacement) {
      words.push(replacement.word);
      index += replacement.count - 1;
    } else {
      const { Word, Offset, Duration, PronunciationAssessment } = raw[index];
      words.push({ Word, Offset, Duration, PronunciationAssessment });
    }
  }
  return words;
}
