/** Reviewed semantic sentences, each split into one or more spoken phrases.
 * Punctuation is text, not the authority for whether a sentence has ended.
 */
export type SentencePlan = { caption: string; speech: string[] }[];
type SpeechPart = string | Record<string, unknown>;
type Pause = { offset: number; breakMs: number };

function partsOf(input: unknown): SpeechPart[] {
  const parts = typeof input === "string" ? [input] : input;
  if (!Array.isArray(parts)) throw Error("Expected speech parts");
  return parts;
}

function textOf(part: SpeechPart): string {
  if (typeof part === "string") return part;
  if (typeof part.text === "string") return part.text;
  if (typeof part.letter === "string") return part.letter;
  if (typeof part.englishWord === "string") return part.englishWord;
  if (typeof part.breakMs === "number") return "";
  throw Error("Unknown speech part");
}

export function sentencePauses(
  caption: string,
  text: string,
  plan: SentencePlan,
): Pause[] {
  if (
    !Array.isArray(plan) ||
    !plan.length ||
    plan.some(
      (sentence) =>
        !sentence.caption?.trim() ||
        !Array.isArray(sentence.speech) ||
        !sentence.speech.length ||
        sentence.speech.some((phrase) => !/[\p{L}\p{N}]/u.test(phrase)),
    )
  )
    throw Error("Expected reviewed sentences with nonempty spoken phrases");
  if (plan.map((s) => s.caption).join("") !== caption)
    throw Error("Sentence plan no longer matches the original captions");
  if (plan.flatMap((s) => s.speech).join("") !== text)
    throw Error("Sentence plan no longer matches the spoken text");
  let offset = 0;
  return plan.flatMap((sentence) =>
    sentence.speech.map((phrase, index) => {
      offset += phrase.length;
      return {
        offset,
        breakMs: index === sentence.speech.length - 1 ? 400 : 200,
      };
    }),
  );
}

export function validateSentencePauses(
  caption: string,
  input: unknown,
  text: string,
  plan: SentencePlan,
  context: string,
) {
  const parts = partsOf(input);
  if (parts.map(textOf).join("") !== text)
    throw Error(`${context}: speech parts do not match text`);
  const expected = sentencePauses(caption, text, plan);
  let offset = 0;
  const actual: Pause[] = [];
  for (const part of parts) {
    if (typeof part !== "string" && "breakMs" in part)
      actual.push({ offset, breakMs: part.breakMs as number });
    else offset += textOf(part).length;
  }
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw Error(
      `${context}: sentence pauses mismatch; expected ${JSON.stringify(expected)}, actual ${JSON.stringify(actual)}`,
    );
  return expected;
}

/** Regenerate only explicit breaks; preserve every spoken character and annotation. */
export function applySentencePauses(
  caption: string,
  input: unknown,
  text: string,
  plan: SentencePlan,
): SpeechPart[] {
  const parts = partsOf(input);
  if (parts.map(textOf).join("") !== text)
    throw Error("Speech parts do not match text");
  const expected = sentencePauses(caption, text, plan);
  const result: SpeechPart[] = [];
  let offset = 0;
  let next = 0;
  for (const part of parts) {
    if (typeof part !== "string" && "breakMs" in part) continue;
    const value = textOf(part);
    const end = offset + value.length;
    let consumed = 0;
    while (next < expected.length && expected[next].offset <= end) {
      const boundary = expected[next];
      if (typeof part !== "string" && boundary.offset !== end)
        throw Error("Sentence boundary splits a pronunciation annotation");
      const length = boundary.offset - offset;
      result.push(
        typeof part === "string" ? value.slice(consumed, length) : part,
      );
      result.push({ breakMs: boundary.breakMs });
      consumed = length;
      next++;
    }
    if (consumed < value.length)
      result.push(typeof part === "string" ? value.slice(consumed) : part);
    offset = end;
  }
  validateSentencePauses(caption, result, text, plan, "generated");
  return result;
}
