/** Actual coordinate calculation. All x numerators share N; never use s_vis here. */
export const N = 262144n;
export type Point = readonly [bigint, bigint];
export const transform = ([x, y]: Point): Point => [N * x + y, y];
export const restore = ([xNumerator, y]: Point): Point => [xNumerator - y, y];
export const inputs = {
  V: [
    [0n, 0n],
    [0n, 3n],
  ],
  A: [
    [-1n, 1n],
    [1n, 1n],
  ],
  B: [
    [-1n, 2n],
    [1n, 2n],
  ],
  W: [
    [0n, 1n],
    [0n, 2n],
  ],
  Z1: [
    [0n, 1n],
    [0n, 1n],
  ],
  Z2: [
    [0n, 1n],
    [0n, 1n],
  ],
} satisfies Record<string, [Point, Point]>;
export const actualEvents = [
  { name: "A 开始", point: transform(inputs.A[0]), order: ["A"] },
  { name: "B 开始", point: transform(inputs.B[0]), order: ["A", "B"] },
  { name: "V 开始", point: transform(inputs.V[0]), order: ["V", "A", "B"] },
  { name: "P′", point: transform([0n, 1n]), order: ["A", "V", "B"] },
  { name: "Q′", point: transform([0n, 2n]), order: ["A", "B", "V"] },
  { name: "V 结束", point: transform(inputs.V[1]), order: ["A", "B"] },
  { name: "A 结束", point: transform(inputs.A[1]), order: ["B"] },
  { name: "B 结束", point: transform(inputs.B[1]), order: [] },
];
export function coveredBy(name: keyof typeof inputs, xNumerator: bigint) {
  const ends = inputs[name].map((p) => transform(p)[0]);
  return xNumerator >= ends[0] && xNumerator <= ends[1];
}
