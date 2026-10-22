export type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
};

// A chapter owns its captions: silence holds the previous phrase, a new chapter resets it.
export function captionAt(captions: readonly Caption[], milliseconds: number) {
  let current = "";
  for (const caption of captions) {
    if (caption.startMs > milliseconds) break;
    current = caption.text;
  }
  return current;
}
