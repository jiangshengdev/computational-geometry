import { inputColors } from "../../colors.ts";
export type InputId = 0 | 1 | 2 | 3;
export const inputs = [
  { id: 0, m: 1, b: -2, start: [-1, -3], end: [3, 1], color: inputColors[0] },
  { id: 1, m: -1, b: -2, start: [-1, -1], end: [3, -5], color: inputColors[1] },
  { id: 2, m: 1, b: 2, start: [-1, 1], end: [3, 5], color: inputColors[2] },
  { id: 3, m: -1, b: 2, start: [-1, 3], end: [3, -1], color: inputColors[3] },
] as const;
export const intersections = { P: [0, -2], Q: [0, 2], R: [2, 0] } as const;
export const orders = {
  before: [0, 1, 2, 3],
  afterP: [1, 0, 2, 3],
  afterQ: [1, 0, 3, 2],
  afterR: [1, 3, 0, 2],
} satisfies Record<string, InputId[]>;
export const strictlyFuture = (
  [u, v]: readonly number[],
  [t, h]: readonly number[],
) => u > t || (u === t && v > h);
