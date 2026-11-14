import type {
  PropertyId,
  SpeechConfig,
} from "microsoft-cognitiveservices-speech-sdk";

// Runtime credentials and proxy settings remain in memory, never in evidence.
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

// SDK enums come from each episode's pinned installation, not a sibling project.
export function createAssessmentSpeechConfig(keyProperty: PropertyId) {
  let cached: { token: string; expiresAt: number } | undefined;
  return async (config: SpeechConfig) => {
    configureSpeechConfig(config);
    if (!cached || Date.now() >= cached.expiresAt) {
      const key = process.env.SPEECH_KEY;
      const endpoint = process.env.SPEECH_ENDPOINT;
      if (!key || !endpoint) throw Error("Speech credentials missing");
      const url = new URL("/sts/v1.0/issueToken", endpoint);
      if (url.protocol !== "https:") throw Error("Speech requires HTTPS");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "",
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok)
        throw Error(`Speech token request rejected: HTTP ${response.status}`);
      const token = await response.text();
      if (!token.trim()) throw Error("Speech token response was empty");
      cached = { token, expiresAt: Date.now() + 8 * 60_000 };
    }
    config.setProperty(keyProperty, "");
    config.authorizationToken = cached.token;
  };
}
