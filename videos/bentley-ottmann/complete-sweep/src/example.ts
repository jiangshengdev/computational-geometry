/** Chapter-eight teaching data. All comparisons use exact scan coordinates. */
export const N = 15116544n;
export type Point = readonly [number, number];
export type Input = "A" | "B" | "C" | "D" | "V" | "H" | "Z";
export type Group = "G" | "D" | "V" | "H";
export const inputs: Record<Input, readonly [Point, Point]> = {
  A: [
    [0, 0],
    [2, 0],
  ],
  B: [
    [1, 0],
    [4, 0],
  ],
  C: [
    [6, 0],
    [8, 0],
  ],
  D: [
    [-1, 4],
    [7, -4],
  ],
  V: [
    [3, -1],
    [3, 2],
  ],
  H: [
    [2, 3],
    [7, -2],
  ],
  Z: [
    [3, 2],
    [3, 2],
  ],
};
export const names = Object.keys(inputs) as Input[];
export const scan = ([x, y]: Point) =>
  [BigInt(x) * N + BigInt(y), BigInt(y)] as const;
export const restore = ([x, y]: readonly [bigint, bigint]) =>
  [x - y, y] as const;
export const xy = ([x, y]: Point) => `(${x},${y})`;
export const scanLabel = ([x, y]: Point) =>
  `(${x}${y === 0 ? "" : y === 1 ? "+s" : y === -1 ? "-s" : `${y > 0 ? "+" : ""}${y}s`},${y})`;
export type EndpointIdentity = { input: Input; role: "头" | "尾" | "点" };
/** Head/tail mean earlier/later in the exact sheared scan, not visual up/down. */
export function endpointIdentities(point: Point): EndpointIdentity[] {
  const same = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];
  return names.flatMap((input): EndpointIdentity[] => {
    const [a, b] = inputs[input];
    if (same(a, b)) return same(point, a) ? [{ input, role: "点" }] : [];
    const [head, tail] = scan(a)[0] < scan(b)[0] ? [a, b] : [b, a];
    return same(point, head)
      ? [{ input, role: "头" }]
      : same(point, tail)
        ? [{ input, role: "尾" }]
        : [];
  });
}
export const eventIdentities = (n: number) => endpointIdentities(points[n - 1]);
export const eventLabel = (n: number) => {
  const identities = eventIdentities(n);
  return identities.length
    ? identities.map(({ input, role }) => `${input}${role}`).join("＋")
    : "新增交点 P";
};
export const groupOf = (name: Input): Group =>
  ["A", "B", "C"].includes(name) ? "G" : (name as Group);
export function covers(name: Input, x: bigint) {
  const [a, b] = inputs[name].map((p) => scan(p)[0]);
  return a <= x && x <= b;
}
export function height(group: Group, x: bigint): readonly [bigint, bigint] {
  if (group === "G") return [0n, 1n];
  if (group === "V") return [x - 3n * N, 1n];
  return [(group === "D" ? 3n : 5n) * N - x, N - 1n];
}
export const slopeRank: Record<Group, number> = { D: -1, H: -1, G: 0, V: 1 };
export function onPoint(name: Input, p: Point) {
  const [[ax, ay], [bx, by]] = inputs[name];
  return (
    (p[0] - ax) * (by - ay) === (p[1] - ay) * (bx - ax) &&
    Math.min(ax, bx) <= p[0] &&
    p[0] <= Math.max(ax, bx) &&
    Math.min(ay, by) <= p[1] &&
    p[1] <= Math.max(ay, by)
  );
}
export const points: Point[] = [
  [-1, 4],
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 3],
  [3, -1],
  [3, 0],
  [3, 2],
  [4, 0],
  [6, 0],
  [7, -4],
  [7, -2],
  [8, 0],
];
export const results = [
  {
    pair: ["A", "B"],
    ends: [
      [1, 0],
      [2, 0],
    ],
    event: 3,
  },
  {
    pair: ["B", "D"],
    ends: [
      [3, 0],
      [3, 0],
    ],
    event: 7,
  },
  {
    pair: ["B", "V"],
    ends: [
      [3, 0],
      [3, 0],
    ],
    event: 7,
  },
  {
    pair: ["D", "V"],
    ends: [
      [3, 0],
      [3, 0],
    ],
    event: 7,
  },
  {
    pair: ["V", "H"],
    ends: [
      [3, 2],
      [3, 2],
    ],
    event: 8,
  },
  {
    pair: ["V", "Z"],
    ends: [
      [3, 2],
      [3, 2],
    ],
    event: 8,
  },
  {
    pair: ["H", "Z"],
    ends: [
      [3, 2],
      [3, 2],
    ],
    event: 8,
  },
] satisfies { pair: Input[]; ends: Point[]; event: number }[];
export const initialQueue = points.map((_, i) => i + 1).filter((n) => n !== 7);
export const events = points.map((point, i) => {
  const n = i + 1,
    x = scan(point)[0];
  const participants = names.filter((name) => onPoint(name, point));
  const active = names.filter(
    (name) =>
      name !== "Z" &&
      scan(inputs[name][0])[0] <= x &&
      x < scan(inputs[name][1])[0],
  );
  const order = [...new Set(active.map(groupOf))].sort((a, b) => {
    const [an, ad] = height(a, x),
      [bn, bd] = height(b, x),
      diff = an * bd - bn * ad;
    return diff < 0n ? -1 : diff > 0n ? 1 : slopeRank[a] - slopeRank[b];
  });
  const members = active.filter((name) => groupOf(name) === "G");
  const right = members.length
    ? Math.max(...members.map((name) => inputs[name][1][0]))
    : null;
  const queue = (n >= 3 ? points.map((_, j) => j + 1) : initialQueue).filter(
    (j) => j > n,
  );
  return {
    n,
    point,
    scan: scan(point),
    participants,
    active,
    order,
    members,
    right,
    queue,
    results: results.filter((r) => r.event <= n),
  };
});
export const emptyState = {
  order: [] as Group[],
  members: [] as Input[],
  right: null as number | null,
  results: [] as typeof results,
  queue: initialQueue,
};
export const groupLabel = (g: Group, members: Input[]) =>
  g === "G" ? `G[${members.join(",")}]` : g;
