import { readFileSync, writeFileSync } from "node:fs";
import { shots } from "../src/storyboard.ts";
import plans from "../src/sentence-plan.json" with { type: "json" };
import narration from "../src/narration-text.json" with { type: "json" };
import {
  applySentencePauses,
  validateSentencePauses,
  type SentencePlan,
} from "../../../shared/speech/sentence-pauses.ts";

export function checkSentencePlan(input: unknown, text: string, id: string) {
  const shot = shots.find((s) => s.id === id);
  const plan = (plans as Record<string, SentencePlan>)[id];
  if (!shot || !plan || (narration as Record<string, string>)[id] !== text)
    throw Error(`${id}: missing sentence plan or stale narration text`);
  return validateSentencePauses(shot.caption, input, text, plan, id);
}

export function updateSentencePauses(write: boolean) {
  const path = new URL("../src/speech-text.json", import.meta.url);
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
