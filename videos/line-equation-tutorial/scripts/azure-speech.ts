import { writeFileSync } from "node:fs";

export const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function synthesize(text: string, destination: string) {
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
    body: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN"><voice name="${voice}">${escapeXml(text)}</voice></speak>`,
    redirect: "error",
    signal: AbortSignal.timeout(55000),
  });
  if (!response.ok)
    throw new Error(`Azure synthesis failed: HTTP ${response.status}`);
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}
