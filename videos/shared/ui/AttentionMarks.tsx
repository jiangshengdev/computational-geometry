import type { AttentionMark } from "../speech/teaching-cues";

export const sampleAttention = (progress: number) => ({
  opacity: Math.sin(Math.PI * progress) ** 2,
  radius: 16 + 5 * Math.sin(progress * Math.PI * 3) ** 2,
  diamondWidth: 2 + 3 * Math.sin(progress * Math.PI * 3) ** 2,
});

/** The sample's phrase-bounded rings and stroke reveal; geometry stays fixed. */
export function AttentionMarks({
  marks,
  progress,
  project = (p) => p,
  color = "#b45309",
  scale = 1,
}: {
  marks: AttentionMark[];
  progress: number;
  project?: (point: [number, number]) => [number, number];
  color?: string;
  /** Total diagram scale relative to the lesson's logical canvas. */
  scale?: number;
}) {
  return (
    <g
      data-attention-marks
      aria-hidden="true"
      fill="none"
      opacity={sampleAttention(progress).opacity}
    >
      {marks.map((mark, index) => {
        const [x, y] = project(mark.kind === "point" ? mark.at : mark.from);
        if (mark.kind === "point")
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={sampleAttention(progress).radius / scale}
              stroke={mark.color ?? color}
              strokeWidth={3 / scale}
            />
          );
        const [x2, y2] = project(mark.to);
        if (mark.kind === "rect")
          return (
            <rect
              key={index}
              x={Math.min(x, x2)}
              y={Math.min(y, y2)}
              width={Math.abs(x2 - x)}
              height={Math.abs(y2 - y)}
              rx={mark.radius}
              stroke={mark.color ?? color}
              strokeWidth={4 / scale}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - progress}
            />
          );
        return (
          <line
            key={index}
            x1={x}
            y1={y}
            x2={x2}
            y2={y2}
            stroke={mark.color ?? color}
            strokeWidth={12 / scale}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - progress}
          />
        );
      })}
    </g>
  );
}
