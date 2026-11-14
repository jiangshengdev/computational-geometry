import assert from "node:assert/strict";
import { currentNarrationPlan } from "./measured-audio.ts";
import { selectNarrationShots } from "../../../shared/speech/selection.ts";
import { shots } from "../src/storyboard.ts";
const { selectedShots } = selectNarrationShots(shots);
assert(
  process.argv.slice(2).every((arg) => arg === "--dry-run"),
  "Planning accepts only --dry-run",
);
console.log(
  JSON.stringify(currentNarrationPlan(selectedShots.map((s) => s.id)), null, 2),
);
