import assert from "node:assert/strict";
import { currentNarrationPlan } from "./narration-plan.ts";
assert(process.argv.slice(2).every((arg) => arg === "--dry-run"));
console.log(JSON.stringify(currentNarrationPlan(), null, 2));
