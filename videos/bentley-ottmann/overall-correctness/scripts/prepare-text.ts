import { writeFileSync } from "node:fs";
import { shots } from "../src/storyboard.ts";
import plans from "../src/sentence-plan.json" with { type: "json" };
import { sentencePauses } from "../../../shared/speech/sentence-pauses.ts";
const narration = Object.fromEntries(
  shots.map((shot) => {
    const plan = plans[shot.id as keyof typeof plans];
    const text = plan.flatMap((sentence) => sentence.speech).join("");
    sentencePauses(shot.captions.join(""), text, plan);
    return [shot.id, text];
  }),
);
writeFileSync(
  new URL("../src/narration-text.json", import.meta.url),
  JSON.stringify(narration, null, 2) + "\n",
);
console.log(
  "Derived plain narration from sentence-plan; changed text requires independent review before freezing.",
);
