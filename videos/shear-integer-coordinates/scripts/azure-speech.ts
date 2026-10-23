import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export type WordBoundary = {
  text: string;
  startMs: number;
  durationMs: number;
  textOffset: number;
  wordLength: number;
};

export const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Explicit letter segments disambiguate new narration without changing the
// SSML fingerprints of previously approved plain-text narration.
const letterIpa: Record<string, string> = {
  A: "eɪ",
  B: "biː",
  C: "siː",
  M: "ɛm",
  P: "piː",
  Q: "kjuː",
  X: "ɛks",
  Y: "waɪ",
  Z: "ziː",
};

export function buildSpeechDocument(input: unknown, context = "speech") {
  const parts = typeof input === "string" ? [input] : input;
  if (!Array.isArray(parts) || parts.length === 0)
    throw new Error(`${context}: expected a string or nonempty segment array`);
  let text = "";
  const body = parts
    .map((part: unknown, index: number) => {
      const location = `${context}[${index}]`;
      if (typeof part === "string") {
        text += part;
        return escapeXml(part);
      }
      if (typeof part !== "object" || part === null || Array.isArray(part))
        throw new Error(`${location}: expected text or { text, pinyin }`);
      const segment = part as Record<string, unknown>;
      if (
        Object.keys(segment).length === 1 &&
        typeof segment.letter === "string"
      ) {
        const ipa = /^[A-Z]$/.test(segment.letter)
          ? letterIpa[segment.letter]
          : undefined;
        if (!ipa) throw new Error(`${location}: unsupported spoken letter`);
        text += segment.letter;
        return `<lang xml:lang="en-US"><phoneme alphabet="ipa" ph="${ipa}">${segment.letter}</phoneme></lang>`;
      }
      if (
        Object.keys(segment).length !== 2 ||
        typeof segment.text !== "string" ||
        !/^\p{Script=Han}+$/u.test(segment.text) ||
        typeof segment.pinyin !== "string" ||
        !/^[a-z]+[1-5]( [a-z]+[1-5])*$/.test(segment.pinyin)
      )
        throw new Error(
          `${location}: expected Han text and numbered pinyin (e.g. chong2 he2; v for ü)`,
        );
      const syllables = segment.pinyin.split(" ");
      if (syllables.length !== Array.from(segment.text).length)
        throw new Error(
          `${location}: each Han character requires one pinyin syllable`,
        );
      text += segment.text;
      const phones = syllables
        .map((syllable) => syllable.replace(/([1-5])$/, " $1"))
        .join(" ");
      return `<phoneme alphabet="sapi" ph="${phones}">${escapeXml(segment.text)}</phoneme>`;
    })
    .join("");
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN"><voice name="${voice}">${body}</voice></speak>`;
  if (/[,，]/.test(text))
    throw new Error(`${context}: speech must not contain commas`);
  return {
    text,
    ssml,
    fingerprint: createHash("sha256").update(ssml).digest("hex"),
  };
}

export async function synthesize(input: unknown, destination: string) {
  const { ssml } = buildSpeechDocument(input);
  const key = process.env.AZURE_SPEECH_KEY;
  const endpoint = process.env.AZURE_SPEECH_ENDPOINT;
  if (!key || !endpoint)
    throw new Error("Azure Speech key and endpoint are required");
  if (
    process.env.AZURE_SPEECH_VOICE &&
    process.env.AZURE_SPEECH_VOICE !== voice
  )
    throw new Error(`AZURE_SPEECH_VOICE must be ${voice}`);
  const url = new URL(endpoint);
  if (url.protocol !== "https:") throw new Error("Azure Speech requires HTTPS");
  const region = url.hostname.match(
    /^([a-z0-9]+)\.api\.cognitive\.microsoft\.com$/,
  );
  if (region) url.hostname = `${region[1]}.tts.speech.microsoft.com`;
  url.search = "";
  url.protocol = "wss:";
  url.pathname = "/cognitiveservices/websocket/v1";
  const config = sdk.SpeechConfig.fromEndpoint(url, key);
  config.speechSynthesisVoiceName = voice;
  config.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;
  config.setProperty(
    sdk.PropertyId.SpeechServiceResponse_RequestWordBoundary,
    "true",
  );
  const synthesizer = new sdk.SpeechSynthesizer(config, null);
  const boundaries: WordBoundary[] = [];
  synthesizer.wordBoundary = (_, event) => {
    // Azure offsets refer to the submitted SSML, including pronunciation tags.
    const prefix = ssml
      .slice(0, event.textOffset)
      .replace(/<[^>]*>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    boundaries.push({
      text: event.text,
      startMs: event.audioOffset / 10000,
      durationMs: event.duration / 10000,
      textOffset: prefix.length,
      wordLength: event.wordLength,
    });
  };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await new Promise<sdk.SpeechSynthesisResult>(
      (resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Azure synthesis timed out")),
          55000,
        );
        synthesizer.speakSsmlAsync(ssml, resolve, reject);
      },
    );
    if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted)
      throw new Error(`Azure synthesis failed: ${result.errorDetails}`);
    if (!boundaries.length)
      throw new Error("Azure returned no word boundaries");
    writeFileSync(destination, Buffer.from(result.audioData));
    return boundaries;
  } finally {
    clearTimeout(timeout);
    synthesizer.close();
  }
}
