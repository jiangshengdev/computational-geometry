import assert from "node:assert/strict";

export function selectNarrationShots<S extends { id: string }>(
  shots: S[],
  argv = process.argv,
) {
  // Limit a repair request to explicit existing shots; shared batch tools still
  // verify exact plan IDs and fingerprints before issuing any service request.
  const selections = argv.slice(2).filter((arg) => arg.startsWith("--shots="));
  assert(selections.length <= 1, "Repeated --shots");
  const requested = selections[0]?.slice(8).split(",");
  if (requested) {
    assert(requested.length && new Set(requested).size === requested.length);
    assert(
      requested.every((id) => shots.some((shot) => shot.id === id)),
      "Unknown shot",
    );
    argv.splice(argv.indexOf(selections[0]), 1);
  }
  const selectedShots = shots.filter(
    (shot) => !requested || requested.includes(shot.id),
  );
  function selectedSource<T>(source: Record<string, T>): Record<string, T> {
    return Object.fromEntries(selectedShots.map(({ id }) => [id, source[id]]));
  }

  return { selectedShots, selectedSource };
}
