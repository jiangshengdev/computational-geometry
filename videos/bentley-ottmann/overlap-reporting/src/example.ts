import { colors } from "../../colors.ts";
export type Point = [number, number];
export const inputs = {
  A: { start: [0, 0], end: [6, 0], color: colors.blue },
  B: { start: [2, 0], end: [8, 0], color: colors.orange },
  C: { start: [3, 0], end: [4, 0], color: colors.violet },
  D: { start: [1, -4], end: [9, 4], color: colors.emerald },
  E: { start: [8, 0], end: [10, 0], color: colors.emerald },
  J_1: { start: [1, 0], end: [5, 0], color: colors.blue },
  J_2: { start: [1, 0], end: [5, 0], color: colors.orange },
  J_3: { start: [5, 0], end: [1, 0], color: colors.violet },
  Z: { start: [5, 0], end: [5, 0], color: colors.amber },
} satisfies Record<string, { start: Point; end: Point; color: string }>;
export type Name = keyof typeof inputs;
export const results = [
  { pair: "A,B", from: [2, 0], to: [6, 0], at: 2 },
  { pair: "A,C", from: [3, 0], to: [4, 0], at: 3 },
  { pair: "B,C", from: [3, 0], to: [4, 0], at: 3 },
  { pair: "A,D", from: [5, 0], to: [5, 0], at: 5 },
  { pair: "B,D", from: [5, 0], to: [5, 0], at: 5 },
  { pair: "A,Z", from: [5, 0], to: [5, 0], at: 5 },
  { pair: "B,Z", from: [5, 0], to: [5, 0], at: 5 },
  { pair: "D,Z", from: [5, 0], to: [5, 0], at: 5 },
] satisfies { pair: string; from: Point; to: Point; at: number }[];
