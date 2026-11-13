import assert from "node:assert/strict";
import {
  inputs,
  names,
  N,
  scan,
  restore,
  events,
  results,
  initialQueue,
  onPoint,
  covers,
  height,
  groupLabel,
  endpointIdentities,
  eventLabel,
  type Point,
  type Input,
} from "../src/example.ts";
import {
  rows,
  visualAt,
  motionCue,
  fps,
  audio,
  audioLeadFrames,
} from "../src/timeline.ts";
import { checkAudio } from "./check-audio.ts";
import { pageList } from "../src/storyboard.ts";
assert.equal(N, 256n * 9n ** 5n);
// Independently derive all 21 complete intersections directly from original endpoints.
const actual = new Map<string, string>();
const pairKey = (a: string, b: string) => [a, b].sort().join("/");
const pointKey = (p: readonly number[]) => p.join(",");
const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];
const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
for (let i = 0; i < names.length; i++)
  for (let j = i + 1; j < names.length; j++) {
    const a = names[i],
      b = names[j],
      [p, p2] = inputs[a],
      [q, q2] = inputs[b],
      r = subtract(p2, p),
      s = subtract(q2, q),
      den = cross(r, s);
    let ends: Point[] = [];
    if (den !== 0) {
      const t = cross(subtract(q, p), s) / den,
        u = cross(subtract(q, p), r) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const hit: Point = [p[0] + t * r[0], p[1] + t * r[1]];
        ends = [hit, hit];
      }
    } else {
      const contained = [p, p2, q, q2]
        .filter((v) => onPoint(a, v) && onPoint(b, v))
        .sort((u, v) => u[0] - v[0] || u[1] - v[1]);
      if (contained.length) ends = [contained[0], contained.at(-1)!];
    }
    if (ends.length) actual.set(pairKey(a, b), ends.map(pointKey).join(":"));
  }
assert.deepEqual(
  new Map(
    results.map((r) => [
      pairKey(...(r.pair as [Input, Input])),
      r.ends.map(pointKey).join(":"),
    ]),
  ),
  actual,
);
const endpointKeys = new Set(
  names.flatMap((name) => inputs[name].map((p) => scan(p).join(","))),
);
assert.equal(endpointKeys.size, 12);
assert.deepEqual(
  events.map((e) => eventLabel(e.n)),
  [
    "D头",
    "A头",
    "B头",
    "A尾",
    "H头",
    "V头",
    "新增交点 P",
    "V尾＋Z点",
    "B尾",
    "C头",
    "D尾",
    "H尾",
    "C尾",
  ],
);
for (const name of names.filter((name) => name !== "Z")) {
  const ends = inputs[name].toSorted((a, b) =>
    scan(a)[0] < scan(b)[0] ? -1 : 1,
  );
  assert(scan(ends[0])[0] < scan(ends[1])[0]);
  assert(
    endpointIdentities(ends[0]).some(
      (i) => i.input === name && i.role === "头",
    ),
  );
  assert(
    endpointIdentities(ends[1]).some(
      (i) => i.input === name && i.role === "尾",
    ),
  );
}
assert.deepEqual(endpointIdentities(inputs.Z[0]), [
  { input: "V", role: "尾" },
  { input: "Z", role: "点" },
]);
assert.equal(scan(inputs.V[1])[0] - scan(inputs.V[0])[0], 3n);
assert.deepEqual(
  initialQueue.map((n) => events[n - 1].scan.join(",")).sort(),
  [...endpointKeys].sort(),
);
const expected = [
  ["D", null, 0, 11],
  ["G[A],D", 2, 0, 10],
  ["G[A,B],D", 4, 1, 10],
  ["G[B],D", 4, 1, 9],
  ["G[B],D,H", 4, 1, 8],
  ["V,G[B],D,H", 4, 1, 7],
  ["D,G[B],V,H", 4, 4, 6],
  ["D,G[B],H", 4, 7, 5],
  ["D,H", null, 7, 4],
  ["D,H,G[C]", 8, 7, 3],
  ["H,G[C]", 8, 7, 2],
  ["G[C]", 8, 7, 1],
  ["", null, 7, 0],
];
const participants = [
  "D",
  "A",
  "AB",
  "AB",
  "H",
  "V",
  "BDV",
  "VHZ",
  "B",
  "C",
  "D",
  "H",
  "C",
];
for (const [i, e] of events.entries()) {
  assert.deepEqual(
    [
      e.order.map((g) => groupLabel(g, e.members)).join(","),
      e.right,
      e.results.length,
      e.queue.length,
    ],
    expected[i],
  );
  assert.equal(e.participants.join(""), participants[i]);
  if (i) assert(events[i - 1].scan[0] < e.scan[0]);
  assert.deepEqual(restore(e.scan), [
    BigInt(e.point[0]) * N,
    BigInt(e.point[1]),
  ]);
  const previous = i ? events[i - 1].queue : initialQueue;
  assert.equal(previous[0], e.n);
  assert.deepEqual(
    e.queue,
    i === 2
      ? [...previous.slice(1), 7].sort((a, b) => a - b)
      : previous.slice(1),
  );
}
assert(!covers("A", 3n * N));
assert(covers("B", 3n * N));
assert(covers("D", 3n * N));
assert(!covers("B", 5n * N));
assert(!covers("C", 5n * N));
assert.equal(height("D", 3n * N)[0], 0n);
assert.equal(height("V", 3n * N)[0], 0n);
assert.equal(height("H", 3n * N + 2n)[0], 2n * (N - 1n));
assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
for (const row of rows) {
  assert(row.captions.length > 0);
  assert.equal(visualAt(row, 0).visibleStep, row.step);
  assert.equal(
    visualAt(row, row.durationInFrames - 1).caption,
    row.captions.at(-1)!.text,
  );
  assert(
    !row.captions.some(
      (c) => c.text.includes("\\frac") || /\d+\/\d+/.test(c.text),
    ),
    "Captions must use single-line fractions",
  );
  assert(motionCue(row).start >= audioLeadFrames);
  assert(motionCue(row).end > motionCue(row).start);
  assert(motionCue(row).end <= row.audioEndFrame);
  // The coverage extension and transformed candidate are explained after the
  // opening sentence. Every operation must finish within its measured narration.
  if (!["CS33", "CS38", "CS64", "CS74"].includes(row.id))
    assert(motionCue(row).end <= row.captions[0].end);
  assert.equal(row.speechFrames, Math.ceil(audio[row.id].duration * fps));
  assert.equal(row.audioEndFrame, audioLeadFrames + row.speechFrames);
  assert(row.durationInFrames - row.audioEndFrame >= row.pauseAfter * fps);
  for (const c of row.captions) {
    assert.equal(visualAt(row, c.start).caption, c.text);
    assert.equal(visualAt(row, c.end - 1).caption, c.text);
  }
}
for (const p of pageList) {
  const audienceText = [
    p.title,
    p.basis,
    ...p.steps.flatMap((s) => [s.text, ...s.captions]),
  ].join("\n");
  assert(
    !/E_\{?\d|[一二三四五六七八九十]+号位置|图中编号/.test(audienceText),
    "Audience must not need internal event numbers",
  );
  const last = rows.filter((r) => r.page === p.id).at(-1)!;
  assert.equal(last.step, p.steps.length);
  assert(last.pauseAfter >= 2);
  assert(
    last.durationInFrames - Math.max(last.audioEndFrame, motionCue(last).end) >=
      2 * fps,
  );
}
const registration = rows.find((r) => r.id === "CS41")!;
assert(!visualAt(registration, 0).queue.includes(7));
assert(
  visualAt(registration, registration.captions[0].end - 1).queue.includes(7),
);
const handoff = rows.find((r) => r.id === "CS45")!;
assert.deepEqual(
  visualAt(handoff, handoff.durationInFrames - 1).queue,
  [5, 6, 7, 8, 9, 10, 11, 12, 13],
);
// Check stage handoffs from the actual display state, not only the event model.
for (const [endId, startId] of [
  ["CS45", "CS46"],
  ["CS76", "CS77"],
]) {
  const endRow = rows.find((r) => r.id === endId)!;
  const nextRow = rows.find((r) => r.id === startId)!;
  const end = visualAt(endRow, endRow.durationInFrames - 1);
  const next = visualAt(nextRow, 0);
  assert.deepEqual(next.results, end.results);
  assert.deepEqual(next.order, end.order);
  assert.deepEqual(next.members, end.members);
  assert.equal(next.right, end.right);
  assert.deepEqual(next.queue, end.queue.slice(1));
}
const lastEvent = rows.find((r) => r.id === "CS94")!;
assert.deepEqual(visualAt(lastEvent, 0).order, []);
assert.deepEqual(visualAt(lastEvent, 0).queue, []);
assert.equal(visualAt(lastEvent, 0).results.length, 7);
const audioReport = checkAudio(process.argv.includes("--decode"));
console.log(
  JSON.stringify({
    result: "PASS",
    inputPairs: 21,
    events: 13,
    steps: rows.length,
    audio: audioReport,
    checks:
      "measured caption boundaries, complete original WAV lifetimes, semantic cues and retained page holds",
    serviceRequests: 0,
  }),
);
