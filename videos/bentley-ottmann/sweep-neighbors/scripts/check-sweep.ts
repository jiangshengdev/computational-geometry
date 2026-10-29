import assert from "node:assert/strict";
import {
  inputs,
  intersections,
  states,
  type InputId,
} from "../src/sweep-state.ts";
import { shots } from "../src/storyboard.ts";
// Independent geometric oracle for the teaching snapshots, not the production algorithm.
const ids = Object.keys(inputs) as InputId[];
const height = (id: InputId, x: number) => {
  const { from, to } = inputs[id];
  return from[1] + ((to[1] - from[1]) * (x - from[0])) / (to[0] - from[0]);
};
const orderAt = (x: number) =>
  ids
    .filter((id) => inputs[id].from[0] < x && x < inputs[id].to[0])
    .sort((a, b) => height(a, x) - height(b, x));
for (const [name, s] of Object.entries(states)) {
  if (s.records !== 3 || s.definition || s.x < 0) continue;
  const left = s.stage.includes("尚未换序");
  assert.deepEqual(
    s.order,
    orderAt(s.x + (left ? -0.1 : 0.1)),
    `${name}: geometric order`,
  );
  assert.deepEqual(s.before, orderAt(s.x - 0.1), `${name}: before order`);
  assert.equal(
    new Set(s.queue.map((e) => e.x)).size,
    s.queue.length,
    `${name}: duplicate event`,
  );
  assert.ok(
    s.queue.every((e, i) => e.x > s.x && (i === 0 || e.x > s.queue[i - 1].x)),
    `${name}: strictly future sorted queue`,
  );
  for (const id of s.reported)
    assert.ok(intersections[id].at[0] <= s.x, `${name}: early report`);
  for (const id of s.discovered) {
    const { at, pair } = intersections[id];
    for (const seg of pair) {
      assert.ok(inputs[seg].from[0] < at[0] && at[0] < inputs[seg].to[0]);
      assert.equal(height(seg, at[0]), at[1]);
    }
  }
}
let known = new Set<string>();
let reported = new Set<string>();
for (const shot of shots) {
  const s = states[shot.state];
  assert.ok(s, shot.id);
  for (const id of known)
    assert.ok(
      s.discovered.includes(id as keyof typeof intersections),
      `${shot.id}: lost discovered point`,
    );
  for (const id of reported)
    assert.ok(
      s.reported.includes(id as keyof typeof intersections),
      `${shot.id}: lost result`,
    );
  known = new Set(s.discovered);
  reported = new Set(s.reported);
}
assert.ok(
  states.rQueued.queue.some((e) => e.point === "P"),
  "Keep P while A/C are not adjacent",
);
assert.equal(
  states.rSwap.queue.filter((e) => e.point === "P").length,
  1,
  "No duplicate P after rediscovery",
);
assert.ok(
  !states.pSwap.queue.some((e) => e.point === "Q"),
  "Past Q does not re-enter queue",
);
assert.equal(height("C", 5), 3);
assert.ok(inputs.B.to[0] < 5, "Reject B/C extension candidate");
assert.deepEqual(states.aEnd.order, []);
assert.deepEqual(states.aEnd.queue, []);
assert.equal(states.aEnd.reported.length, 3);
console.log(
  "Sweep snapshots: geometry, event ordering, discovery/report boundaries, deduplication and completion PASS",
);
