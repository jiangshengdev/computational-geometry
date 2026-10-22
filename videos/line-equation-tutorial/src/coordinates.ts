/** Unequal axes are an authored teaching exception, never an automatic fallback. */
export type CoordinateScale =
  | { mode: "equal" }
  | { mode: "independent"; reason: string };

export const createCoordinates = ({
  left,
  bottom,
  width,
  height,
  xMax,
  yMax,
  scale = { mode: "equal" },
}: {
  left: number;
  bottom: number;
  width: number;
  height: number;
  xMax: number;
  yMax: number;
  scale?: CoordinateScale;
}) => {
  if (![width, height, xMax, yMax].every((n) => Number.isFinite(n) && n > 0))
    throw new Error("Coordinate extents must be finite and positive");
  if (scale.mode === "independent" && !scale.reason.trim())
    throw new Error("Independent axes require a teaching reason");
  const unit = Math.min(width / xMax, height / yMax);
  const xUnit = scale.mode === "equal" ? unit : width / xMax;
  const yUnit = scale.mode === "equal" ? unit : height / yMax;
  return {
    x: (value: number) => left + value * xUnit,
    y: (value: number) => bottom - value * yUnit,
    xMax: width / xUnit,
    yMax: height / yUnit,
    notice: scale.mode === "independent" ? "不等比例示意" : undefined,
  };
};

/** Bounded tick count even for explicitly authored extreme coordinate spans. */
export const coordinateTicks = (max: number) => {
  const magnitude = 10 ** Math.floor(Math.log10(max / 12));
  const step =
    [1, 2, 5, 10].find((factor) => factor * magnitude >= max / 12)! * magnitude;
  return Array.from({ length: Math.floor(max / step + 1e-10) + 1 }, (_, i) =>
    Number((i * step).toPrecision(12)),
  );
};
