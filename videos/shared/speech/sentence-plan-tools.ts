import { readFileSync, writeFileSync } from "node:fs";
import {
  applySentencePauses,
  validateSentencePauses,
  type SentencePlan,
} from "./sentence-pauses.ts";

export function createSentencePlanTools({
  shots,
  plans,
  narration,
  path,
}: {
  shots: { id: string; caption: string }[];
  plans: Record<string, SentencePlan>;
  narration: Record<string, string>;
  path: URL;
}) {
  function checkSentencePlan(input: unknown, text: string, id: string) {
    const shot = shots.find((s) => s.id === id);
    const plan = (plans as Record<string, SentencePlan>)[id];
    if (!shot || !plan || (narration as Record<string, string>)[id] !== text)
      throw Error(`${id}: missing sentence plan or stale narration text`);
    return validateSentencePauses(shot.caption, input, text, plan, id);
  }

  function updateSentencePauses(write: boolean) {
    const speech = JSON.parse(readFileSync(path, "utf8"));
    const expectedIds = shots
      .map((s) => s.id)
      .sort()
      .join(",");
    for (const data of [speech, plans, narration]) {
      if (Object.keys(data).sort().join(",") !== expectedIds)
        throw Error(
          "Sentence plan, narration and speech IDs must match storyboard",
        );
    }
    const changed: string[] = [];
    let count = 0;
    for (const shot of shots) {
      const text = (narration as Record<string, string>)[shot.id];
      if (write) {
        const updated = applySentencePauses(
          shot.caption,
          speech[shot.id],
          text,
          (plans as Record<string, SentencePlan>)[shot.id],
        );
        if (JSON.stringify(updated) !== JSON.stringify(speech[shot.id])) {
          speech[shot.id] = updated;
          changed.push(shot.id);
        }
      }
      count += checkSentencePlan(speech[shot.id], text, shot.id).length;
    }
    if (write && changed.length)
      writeFileSync(path, JSON.stringify(speech, null, 2) + "\n");
    console.log(
      `Sentence pauses: ${shots.length} shots, ${count} boundaries PASS; updated: ${changed.join(",") || "none"}`,
    );
  }
  return { checkSentencePlan, updateSentencePauses };
}
