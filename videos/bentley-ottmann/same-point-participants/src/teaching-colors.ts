import { colors, sweepColors } from "../../colors.ts";
import type { ColorMark } from "../../../shared/math/semantic-colors.ts";
import { shots } from "./storyboard.ts";

export const objectColors: Record<string, string> = {
  ...sweepColors,
  Z_1: colors.blue,
  Z_2: colors.orange,
  U: colors.blue,
  V: colors.orange,
  W: colors.violet,
};
/** Explicit teaching ownership; neutral titles, references and subtitles opt out. */
const identities: Record<string, string[]> = {
  SP04: ["A"],
  SP05: ["B"],
  SP06: ["A", "B"],
  SP07: ["A"],
  SP08: ["A", "B"],
  SP10: ["C"],
  SP11: ["y_C"],
  SP12: ["B", "C"],
  SP15: ["D"],
  SP16: ["y_D"],
  SP17: ["A", "C", "B", "D"],
  SP22: ["B"],
  SP23: ["A"],
  SP24: ["C", "D"],
  SP27: ["U", "V", "W"],
  SP30: ["y_U", "y_W"],
  SP31: ["y_W", "y_V"],
  SP32: ["y_U", "y_V"],
  SP33: ["y_W"],
  SP41: ["A", "B", "C", "D"],
  SP42: ["B", "C", "D"],
  SP49: ["Z_1", "Z_2"],
  SP55: ["Z_1", "Z_2"],
  SP56: ["Z_1"],
  SP57: ["A", "Z_1"],
  SP58: ["B", "Z_1"],
  SP53: ["C", "Z_1", "Z_2"],
};
export const objectMarks: Record<string, ColorMark[]> = Object.fromEntries(
  shots.map((s) => [
    s.id,
    (identities[s.id] ?? []).map((term) => ({
      term,
      color: objectColors[term.replace("y_", "")],
    })),
  ]),
);
export function activeMarks(id: string, caption: number | null): ColorMark[] {
  const step = shots.find((s) => s.id === id);
  const term = caption === null ? undefined : step?.focus?.[caption];
  return term ? [{ term, color: colors.amber }] : [];
}
