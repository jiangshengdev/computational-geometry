import project from "../../shared/colors/project.json" with { type: "json" };
import palette from "../../shared/colors/tailwind-v3.json" with { type: "json" };

/** Shared color values; each teaching case owns its object-to-color mapping. */
export const colors = project.light;

export const tints = {
  input: palette.blue["50"],
  attention: palette.amber["50"],
  active: palette.amber["100"],
};

// Chapter-one inputs and chapter-two A/B/C/D follow the article ordering.
export const inputColors = [
  colors.blue,
  colors.orange,
  colors.violet,
  colors.emerald,
] as const;

export const sweepColors = {
  A: colors.blue,
  B: colors.orange,
  C: colors.violet,
  D: colors.emerald,
};

export const proofColors = {
  ...sweepColors,
  U: colors.blue,
  V: colors.orange,
  W: colors.violet,
};
