import { audioSha256 as audioHash, verifyPcmSource } from "./audio.ts";
import { reviewedRecognitionWords } from "./reviewed-recognition.ts";
import {
  assessmentChunks,
  combineAssessments,
  type AssessmentResponse,
} from "./assessment-chunks.ts";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import type * as SpeechSdk from "microsoft-cognitiveservices-speech-sdk";
import {
  speechComparisonText,
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
  {
    allowReviewedPronunciation,
    deferPronunciationReview = false,
  }: {
    allowReviewedPronunciation: boolean;
    /** Use measured times while retaining pronunciation flags for later listening. */
    deferPronunciationReview?: boolean;
  },
) {
  // Preserve service word boundaries. Never interpolate, split, or invent durations.
  function assessmentWords(
    audio: AudioTiming,
    response: unknown,
  ): WordBoundary[] {
    const result = response as Assessment;
    const rawWords = result?.NBest?.[0]?.Words;
    if (result?.RecognitionStatus !== "Success" || !rawWords?.length)
      throw Error("Alignment did not recognize speech");
    const recognized = reviewedRecognitionWords(audio, rawWords);
    let cursor = 0;
    const words = recognized.map((word) => {
      if (
        word.reviewedTextOffset === undefined &&
        !["None", "Mispronunciation"].includes(
          word.PronunciationAssessment?.ErrorType,
        )
      )
        throw Error(
          `Alignment requires review: ${word.Word} (${word.PronunciationAssessment?.ErrorType})`,
        );
      const gap = audio.speech.slice(cursor).match(/^[\p{P}\p{Z}\s]*/u)![0];
      cursor += gap.length;
      if (
        word.reviewedTextOffset !== undefined &&
        cursor !== word.reviewedTextOffset
      )
        throw Error(
          "Recognition review source offset does not match response order",
        );
      if (
        !word.Word ||
        !speechComparisonText(audio.speech).startsWith(
          speechComparisonText(word.Word),
          cursor,
        )
      )
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
    // Check overlap below on the final selected measurements. Recognition
    // neighbors may differ from an approved synthesis event that we retain.
    const synthesisWords = audio.alignment?.synthesisWords ?? audio.words;
    // Some service events span SSML tags in their offsets/lengths. Locate the
    // returned word text in the unchanged source; retain all measured times and
    // keep the raw events in synthesisWords for verification. Never skip speech.
    const source = speechComparisonText(audio.speech);
    let sourceCursor = 0;
    const mappedSynthesis = synthesisWords.map((word) => {
      const offset = source.indexOf(
        speechComparisonText(word.text),
        sourceCursor,
      );
      if (
        !word.text ||
        offset < 0 ||
        !/^[\p{P}\p{Z}\s]*$/u.test(audio.speech.slice(sourceCursor, offset))
      )
        throw Error("Synthesis word does not match source text");
      sourceCursor = offset + word.text.length;
      return { ...word, textOffset: offset, wordLength: word.text.length };
    });
    // Accepted audition WAVs may have no saved synthesis boundaries. Measure
    // every word from recognition in that case, with the same review checks.
    const original = synthesisWords.length ? mappedSynthesis : words;
    const selected = new Set(
      original.flatMap((word, index) =>
        synthesisWords.length === 0 ||
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
          recognized[words.indexOf(word)].reviewedTextOffset === undefined &&
          !(
            errorType === "Mispronunciation" &&
            (deferPronunciationReview ||
              (allowReviewedPronunciation && reviewed))
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
    const requestAssessment = async (
      speech: string,
      inputPath: string,
      responsePath = `${inputPath}.assessment.json`,
    ): Promise<AssessmentResponse> => {
      const config = sdk.SpeechConfig.fromEndpoint(url, key);
      config.speechRecognitionLanguage = "zh-CN";
      config.outputFormat = sdk.OutputFormat.Detailed;
      config.requestWordLevelTimestamps();
      const input = sdk.AudioConfig.fromWavFileInput(readFileSync(inputPath));
      const recognizer = new sdk.SpeechRecognizer(config, input);
      new sdk.PronunciationAssessmentConfig(
        speech,
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
              240000,
            );
            recognizer.recognizeOnceAsync(resolve, () =>
              reject(Error("Azure alignment request failed")),
            );
          },
        );
        const raw = result.properties.getProperty(
          sdk.PropertyId.SpeechServiceResponse_JsonResult,
        );
        if (raw) writeFileSync(responsePath, raw + "\n");
        if (result.reason !== sdk.ResultReason.RecognizedSpeech || !raw)
          throw Error(
            "Azure alignment did not recognize speech; inspect temporary diagnostics",
          );
        return JSON.parse(raw) as AssessmentResponse;
      } finally {
        clearTimeout(timeout);
        recognizer.close();
        input.close();
      }
    };
    let response: AssessmentResponse;
    if (audio.duration > 30) {
      verifyPcmSource(wav);
      const pcm = execFileSync(
        "ffmpeg",
        [
          "-v",
          "error",
          "-i",
          wav,
          "-f",
          "s16le",
          "-c:a",
          "pcm_s16le",
          "pipe:1",
        ],
        { maxBuffer: 64 * 1024 * 1024 },
      );
      const parts = [];
      for (const [index, chunk] of assessmentChunks(audio, pcm).entries()) {
        const chunkPath = `${path}.assessment-chunk-${index}.wav`;
        execFileSync("ffmpeg", [
          "-v",
          "error",
          "-y",
          "-i",
          wav,
          "-af",
          `atrim=start_sample=${chunk.startSample}:end_sample=${chunk.endSample},asetpts=PTS-STARTPTS`,
          "-c:a",
          "pcm_s16le",
          chunkPath,
        ]);
        parts.push({
          ...chunk,
          response: await requestAssessment(chunk.speech, chunkPath),
        });
      }
      response = combineAssessments(parts);
    } else {
      response = await requestAssessment(
        audio.speech,
        wav,
        `${path}.assessment.json`,
      );
    }
    writeFileSync(
      `${path}.assessment.json`,
      JSON.stringify(response, null, 2) + "\n",
    );
    return {
      ...audio,
      words: assessmentWords(audio, response),
      alignment: {
        method: "azure-pronunciation-assessment",
        audioSha256: audioHash(path),
        synthesisWords: audio.alignment?.synthesisWords ?? audio.words,
        response,
        ...(deferPronunciationReview
          ? { pronunciationReview: "pending-listening" as const }
          : {}),
        ...(audio.alignment?.reviewedRecognition
          ? { reviewedRecognition: audio.alignment.reviewedRecognition }
          : {}),
      },
    };
  }

  return { assessmentWords, verifyAlignment, alignAudio };
}
