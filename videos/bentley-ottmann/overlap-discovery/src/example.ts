import { colors } from "../../colors.ts";
export type Point = [number, number];
export const inputs = {
  F: { start: [0, 0] as Point, end: [2, 0] as Point, color: colors.blue },
  G: { start: [1, 0] as Point, end: [7, 0] as Point, color: colors.orange },
  H: { start: [-1, 5] as Point, end: [6, -2] as Point, color: colors.emerald },
  I: { start: [0, 0] as Point, end: [1, 0] as Point, color: colors.blue },
  J: { start: [3, 0] as Point, end: [7, 0] as Point, color: colors.orange },
  K: { start: [-1, 3] as Point, end: [6, -4] as Point, color: colors.emerald },
};
export type Name = keyof typeof inputs;
