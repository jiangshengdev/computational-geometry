import { audioSha256 as audioHash } from "./audio.ts";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import type * as SpeechSdk from "microsoft-cognitiveservices-speech-sdk";
import {
  validateWords,
  type AudioTiming,
  type WordBoundary,
} from "./timing.ts";

type Assessment = {
  RecognitionStatus: string;
  NBest: {
    Words: {
      Word: string;
      Offset: number;
      Duration: number;
      PronunciationAssessment: { ErrorType: string };
    }[];
  }[];
};

export function createAlignmentTools(
  sdk: typeof SpeechSdk,
  { allowReviewedPronunciation }: { allowReviewedPronunciation: boolean },
) {
  // Preserve service word boundaries. Never interpolate, split, or invent durations.
  function assessmentWords(
    audio: AudioTiming,
    response: unknown,
  ): WordBoundary[] {
    const result = response as Assessment;
    const recognized = result?.NBest?.[0]?.Words;
    if (result?.RecognitionStatus !== "Success" || !recognized?.length)
      throw Error("Alignment did not recognize speech");
    let cursor = 0;
    const words = recognized.map((word) => {
      if (
        !["None", "Mispronunciation"].includes(
          word.PronunciationAssessment?.ErrorType,
        )
      )
        throw Error(
          `Alignment requires review: ${word.Word} (${word.PronunciationAssessment?.ErrorType})`,
        );
      const gap = audio.speech.slice(cursor).match(/^[\p{P}\p{Z}\s]*/u)![0];
      cursor += gap.length;
      if (!word.Word || !audio.speech.startsWith(word.Word, cursor))
        throw Error(`Alignment text mismatch at ${cursor}: ${word.Word}`);
      const boundary = {
        text: word.Word,
        textOffset: cursor,
        wordLength: word.Word.length,
        startMs: word.Offset / 10000,
        durationMs: word.Duration / 10000,
      };
      cursor += word.Word.length;
      return boundary;
    });
    validateWords({ ...audio, words });
    for (let i = 1; i < words.length; i++) {
      if (words[i].startMs < words[i - 1].startMs + words[i - 1].durationMs)
        throw Error("Overlapping alignment words");
    }
    const original = audio.alignment?.synthesisWords ?? audio.words;
    const selected = new Set(
      original.flatMap((word, index) =>
        (word.durationMs === 0 && /[\p{L}\p{N}]/u.test(word.text)) ||
        word.startMs + word.durationMs > audio.duration * 1000 + 1
          ? [index]
          : [],
      ),
    );
    const overlaps = (a: WordBoundary, b: WordBoundary) =>
      a.textOffset < b.textOffset + b.wordLength &&
      b.textOffset < a.textOffset + a.wordLength;
    const select = (word: WordBoundary) => {
      original.forEach((candidate, index) => {
        if (overlaps(word, candidate)) selected.add(index);
      });
    };
    // If the two measurements disagree at a shared boundary, measure its neighbor
    // too. Never trim a measured word or borrow an uncertain neighbor's time.
    for (;;) {
      const size = selected.size;
      const measured = words.filter((word) =>
        [...selected].some((index) => overlaps(word, original[index])),
      );
      // Different service tokenizations must stay whole, e.g. 横 + 坐标 vs 横坐标.
      for (const word of measured) select(word);
      if (selected.size !== size) continue;
      for (const word of measured) {
        const errorType =
          recognized[words.indexOf(word)].PronunciationAssessment.ErrorType;
        const reviewed = audio.alignment?.reviewedPronunciation?.some(
          (entry) =>
            entry.text === word.text && entry.textOffset === word.textOffset,
        );
        if (
          errorType !== "None" &&
          !(
            allowReviewedPronunciation &&
            errorType === "Mispronunciation" &&
            reviewed
          )
        )
          throw Error(`Alignment requires review for timing: ${word.text}`);
      }
      const repaired = [
        ...original.filter((_, index) => !selected.has(index)),
        ...measured,
      ].sort((a, b) => a.textOffset - b.textOffset);
      const spoken = repaired.filter((word) => /[\p{L}\p{N}]/u.test(word.text));
      for (let i = 1; i < spoken.length; i++) {
        const previous = spoken[i - 1],
          current = spoken[i];
        if (current.startMs >= previous.startMs + previous.durationMs) continue;
        select(previous);
        select(current);
        if (selected.size === size)
          throw Error(
            `Repaired timing overlaps adjacent word: ${current.text}`,
          );
      }
      if (selected.size !== size) continue;
      validateWords({ ...audio, words: repaired });
      return repaired;
    }
  }

  function verifyAlignment(audio: AudioTiming, path: string) {
    if (!audio.alignment) return;
    if (
      audio.alignment.method !== "azure-pronunciation-assessment" ||
      audio.alignment.audioSha256 !== audioHash(path)
    )
      throw Error("Alignment does not belong to this audio");
    if (
      JSON.stringify(audio.words) !==
      JSON.stringify(assessmentWords(audio, audio.alignment.response))
    )
      throw Error("Alignment words do not match the saved service response");
  }

  async function alignAudio(
    audio: AudioTiming,
    path: string,
  ): Promise<AudioTiming> {
    // Decode at the original sample rate; neither the MP3 nor its speed is changed.
    const wav = `${path}.wav`;
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-i",
      path,
      "-c:a",
      "pcm_s16le",
      wav,
    ]);
    const key = process.env.AZURE_SPEECH_KEY;
    const endpoint = process.env.AZURE_SPEECH_ENDPOINT;
    if (!key || !endpoint)
      throw Error("Azure Speech key and endpoint are required");
    const url = new URL(endpoint);
    if (url.protocol !== "https:") throw Error("Azure Speech requires HTTPS");
    const region = url.hostname.match(
      /^([a-z0-9]+)\.api\.cognitive\.microsoft\.com$/,
    );
    if (region) url.hostname = `${region[1]}.stt.speech.microsoft.com`;
    url.protocol = "wss:";
    url.pathname = "/speech/recognition/conversation/cognitiveservices/v1";
    url.search = "";
    if (audio.duration > 30)
      throw Error("Alignment requires review for audio over 30 seconds");
    const config = sdk.SpeechConfig.fromEndpoint(url, key);
    config.speechRecognitionLanguage = "zh-CN";
    config.outputFormat = sdk.OutputFormat.Detailed;
    config.requestWordLevelTimestamps();
    const input = sdk.AudioConfig.fromWavFileInput(readFileSync(wav));
    const recognizer = new sdk.SpeechRecognizer(config, input);
    new sdk.PronunciationAssessmentConfig(
      audio.speech,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Word,
      true,
    ).applyTo(recognizer);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await new Promise<SpeechSdk.SpeechRecognitionResult>(
        (resolve, reject) => {
          timeout = setTimeout(
            () => reject(Error("Azure alignment timed out")),
            55000,
          );
          recognizer.recognizeOnceAsync(resolve, () =>
            reject(Error("Azure alignment request failed")),
          );
        },
      );
      const raw = result.properties.getProperty(
        sdk.PropertyId.SpeechServiceResponse_JsonResult,
      );
      if (raw) writeFileSync(`${path}.assessment.json`, raw + "\n");
      if (result.reason !== sdk.ResultReason.RecognizedSpeech || !raw)
        throw Error(
          "Azure alignment did not recognize speech; inspect temporary diagnostics",
        );
      const response: unknown = JSON.parse(raw);
      return {
        ...audio,
        words: assessmentWords(audio, response),
        alignment: {
          method: "azure-pronunciation-assessment",
          audioSha256: audioHash(path),
          synthesisWords: audio.words,
          response,
        },
      };
    } finally {
      clearTimeout(timeout);
      recognizer.close();
      input.close();
    }
  }

  return { assessmentWords, verifyAlignment, alignAudio };
}
