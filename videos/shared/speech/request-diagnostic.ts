export function failureDiagnostic(error: unknown) {
  let message = error instanceof Error ? error.message : String(error);
  for (const value of [
    process.env.SPEECH_KEY,
    process.env.SPEECH_ENDPOINT,
    process.env.HOME,
  ]) {
    if (value) {
      message = message.split(value).join("[REDACTED]");
      message = message.split(encodeURIComponent(value)).join("[REDACTED]");
    }
  }
  return message
    .replace(/(?:https?|wss?):\/\/[^\s"'<>]+/gi, "[REDACTED_URL]")
    .replace(/(Bearer\s+)\S+/gi, "$1[REDACTED]")
    .slice(0, 4000);
}
