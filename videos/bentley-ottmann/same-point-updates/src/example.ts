export type Name = "A" | "B" | "C" | "D" | "F";
/** Article identities and exact endpoint values; F belongs only to the A,F case. */
export const inputs: Record<
  Name,
  { start: [number, number]; end: [number, number] }
> = {
  A: { start: [0, 4], end: [4, 4] },
  B: { start: [4, 4], end: [8, 8] },
  C: { start: [1, 7], end: [9, -1] },
  D: { start: [2, 0], end: [7, 10] },
  F: { start: [4, 4], end: [6, 4] },
};
