export type Name = "A" | "B" | "C" | "D" | "Z_1" | "Z_2";
export const inputs: Record<
  Name,
  { start: [number, number]; end: [number, number] }
> = {
  A: { start: [0, 4], end: [4, 4] },
  B: { start: [4, 4], end: [8, 8] },
  C: { start: [1, 7], end: [9, -1] },
  D: { start: [2, 0], end: [7, 10] },
  Z_1: { start: [4, 4], end: [4, 4] },
  Z_2: { start: [4, 4], end: [4, 4] },
};
