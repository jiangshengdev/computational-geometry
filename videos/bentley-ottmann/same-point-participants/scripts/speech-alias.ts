import assert from "node:assert/strict";
import type { WordBoundary } from "../../../shared/speech/timing.ts";
export type SpeechAlias = {
  sourceOffset: number;
  spoken: string;
  letter: string;
};
export function aliasReferenceText(source: string, aliases: SpeechAlias[]) {
  let end = 0;
  for (const a of aliases) {
    assert(a.sourceOffset >= end && /^[A-Z]$/.test(a.letter));
    assert.equal(
      source.slice(a.sourceOffset, a.sourceOffset + a.spoken.length),
      a.spoken,
    );
    assert(/^[a-z]+$/.test(a.spoken));
    end = a.sourceOffset + a.spoken.length;
  }
  let result = source;
  for (const a of [...aliases].reverse())
    result =
      result.slice(0, a.sourceOffset) +
      a.letter +
      result.slice(a.sourceOffset + a.spoken.length);
  return result;
}
/** Normalize only explicit lexical aliases; never alter measured times or raw events. */
export function mapAliasWords(
  source: string,
  reference: string,
  aliases: SpeechAlias[],
  raw: WordBoundary[],
) {
  assert.equal(aliasReferenceText(source, aliases), reference);
  let cursor = 0,
    delta = 0;
  const seen = new Set<SpeechAlias>();
  const mapped = raw.map((w) => {
    const start = source.indexOf(w.text, cursor);
    assert(
      w.text &&
        start >= cursor &&
        /^[\p{P}\p{Z}\s]*$/u.test(source.slice(cursor, start)),
      "Unmapped synthesis event or lexical gap",
    );
    const end = start + w.text.length;
    const overlaps = aliases.filter(
      (a) => a.sourceOffset < end && a.sourceOffset + a.spoken.length > start,
    );
    const offset = start - delta;
    cursor = end;
    if (!overlaps.length)
      return { ...w, textOffset: offset, wordLength: w.text.length };
    assert.equal(overlaps.length, 1);
    const a = overlaps[0];
    assert(
      start === a.sourceOffset && w.text === a.spoken && !seen.has(a),
      "Alias spans an ambiguous word event",
    );
    seen.add(a);
    delta += a.spoken.length - a.letter.length;
    return {
      ...w,
      text: a.letter,
      textOffset: offset,
      wordLength: a.letter.length,
    };
  });
  assert.equal(seen.size, aliases.length, "Missing alias word event");
  assert(
    /^[\p{P}\p{Z}\s]*$/u.test(source.slice(cursor)),
    "Unmapped synthesis tail",
  );
  return mapped;
}
