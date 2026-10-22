import { writeFileSync } from "node:fs";

export const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
  return {
    text,
    ssml: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN"><voice name="${voice}">${body}</voice></speak>`,
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
  url.pathname = "/cognitiveservices/v1";
  url.search = "";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-48khz-192kbitrate-mono-mp3",
    },
    body: ssml,
    redirect: "error",
    signal: AbortSignal.timeout(55000),
  });
  if (!response.ok)
    throw new Error(`Azure synthesis failed: HTTP ${response.status}`);
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}
