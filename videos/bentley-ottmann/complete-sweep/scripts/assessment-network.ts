import {
  PropertyId,
  type SpeechConfig,
} from "microsoft-cognitiveservices-speech-sdk";
import { configureSpeechConfig } from "./speech-network.ts";

// This resource accepts token authentication for recognition. Tokens remain in
// memory and are refreshed before their documented ten-minute expiry.
let cached: { token: string; expiresAt: number } | undefined;
export async function configureAssessmentSpeechConfig(config: SpeechConfig) {
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
  config.setProperty(PropertyId.SpeechServiceConnection_Key, "");
  config.authorizationToken = cached.token;
}
