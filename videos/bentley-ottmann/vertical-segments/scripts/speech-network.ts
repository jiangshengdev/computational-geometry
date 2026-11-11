import type { SpeechConfig } from "microsoft-cognitiveservices-speech-sdk";

// Use the inherited Cloud proxy; keep credentials out of output and files.
export function configureSpeechConfig(config: SpeechConfig) {
  const proxy = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
  if (!proxy) return;
  const url = new URL(proxy);
  config.setProxy(
    url.hostname,
    Number(url.port || 80),
    decodeURIComponent(url.username),
    decodeURIComponent(url.password),
  );
}
