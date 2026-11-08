import assert from "node:assert/strict";
import { shots } from "../src/storyboard.ts";

// Limit a repair request to explicit existing shots; shared batch tools still
// verify exact plan IDs and fingerprints before issuing any service request.
const selections = process.argv
  .slice(2)
  .filter((arg) => arg.startsWith("--shots="));
assert(selections.length <= 1, "Repeated --shots");
const requested = selections[0]?.slice(8).split(",");
if (requested) {
  assert(requested.length && new Set(requested).size === requested.length);
  assert(
    requested.every((id) => shots.some((shot) => shot.id === id)),
    "Unknown shot",
  );
  process.argv.splice(process.argv.indexOf(selections[0]), 1);
}
export const selectedShots = shots.filter(
  (shot) => !requested || requested.includes(shot.id),
);
export function selectedSource<T>(
  source: Record<string, T>,
): Record<string, T> {
  return Object.fromEntries(selectedShots.map(({ id }) => [id, source[id]]));
}
