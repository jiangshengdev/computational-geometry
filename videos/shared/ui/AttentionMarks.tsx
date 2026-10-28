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
}: {
  marks: AttentionMark[];
  progress: number;
  project?: (point: [number, number]) => [number, number];
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
              r={sampleAttention(progress).radius}
              stroke={mark.color ?? "#b45309"}
              strokeWidth={3}
            />
          );
        const [x2, y2] = project(mark.to);
        return (
          <line
            key={index}
            x1={x}
            y1={y}
            x2={x2}
            y2={y2}
            stroke={mark.color ?? "#b45309"}
            strokeWidth={12}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - progress}
          />
        );
      })}
    </g>
  );
}
