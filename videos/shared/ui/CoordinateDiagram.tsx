import { useId, type ReactNode } from "react";
import { AttentionMarks } from "./AttentionMarks";
import type { AttentionMark } from "../speech/teaching-cues";

export type DiagramSegment = {
  start: [number, number];
  end: [number, number];
  color: string;
  pointInput?: boolean;
  dashed?: boolean;
};
/** A fixed equal-unit viewport: input coordinates never move to separate identities. */
export function CoordinateDiagram({
  segments,
  labels = [],
  active = -1,
  xAxisEnd = 338,
  label,
  attention,
}: {
  segments: DiagramSegment[];
  labels?: {
    point: [number, number];
    text: string;
    above?: boolean;
    offsetY?: number;
  }[];
  active?: number | number[];
  xAxisEnd?: number;
  label: (x: number, y: number, text: string) => ReactNode;
  attention?: { marks: AttentionMark[]; progress: number };
}) {
  const id = useId().replace(/:/g, "");
  const x = (value: number) => 52 + 40 * value;
  const y = (value: number) => 160 - 40 * value;
  return (
    <svg
      width={360}
      height={260}
      viewBox="0 0 360 260"
      aria-label="等比例坐标图"
    >
      <defs>
        <marker
          id={id}
          markerWidth={7}
          markerHeight={7}
          refX={6}
          refY={3.5}
          orient="auto"
        >
          <path d="M0 0 L7 3.5 L0 7 Z" fill="#94a3b8" />
        </marker>
      </defs>
      <path
        d={`M12 160 H${xAxisEnd}`}
        stroke="#94a3b8"
        strokeWidth={1.5}
        fill="none"
        markerEnd={`url(#${id})`}
      />
      <path
        d="M52 235 V18"
        stroke="#94a3b8"
        strokeWidth={1.5}
        fill="none"
        markerEnd={`url(#${id})`}
      />
      {label(xAxisEnd - 4, 187, "x")}
      {label(70, 30, "y")}
      {segments.map((segment, index) => (
        <g key={index} stroke={segment.color} fill={segment.color}>
          {segment.pointInput ? (
            <path
              d={`M${x(segment.start[0])} ${y(segment.start[1]) - 8} l8 8 l-8 8 l-8 -8 Z`}
              strokeWidth={2}
            />
          ) : (
            <>
              <line
                x1={x(segment.start[0])}
                y1={y(segment.start[1])}
                x2={x(segment.end[0])}
                y2={y(segment.end[1])}
                strokeWidth={5}
                strokeDasharray={segment.dashed ? "5 5" : undefined}
              />
              {!segment.dashed && (
                <>
                  <circle
                    cx={x(segment.start[0])}
                    cy={y(segment.start[1])}
                    r={5}
                  />
                  <circle cx={x(segment.end[0])} cy={y(segment.end[1])} r={5} />
                </>
              )}
            </>
          )}
          {(Array.isArray(active)
            ? active.includes(index)
            : active === index) &&
            (segment.start[0] === segment.end[0] &&
            segment.start[1] === segment.end[1] ? (
              <circle
                cx={x(segment.start[0])}
                cy={y(segment.start[1])}
                r={13}
                fill="none"
                strokeWidth={3}
                opacity={1}
              />
            ) : (
              <line
                x1={x(segment.start[0])}
                y1={y(segment.start[1])}
                x2={x(segment.end[0])}
                y2={y(segment.end[1])}
                strokeWidth={12}
                opacity={0.4}
              />
            ))}
        </g>
      ))}
      {attention && (
        <AttentionMarks {...attention} project={([px, py]) => [x(px), y(py)]} />
      )}
      {labels.map(({ point, text, above, offsetY }, index) => (
        <g key={index}>
          {label(
            x(point[0]),
            y(point[1]) + (offsetY ?? (above ? -25 : 37)),
            text,
          )}
        </g>
      ))}
    </svg>
  );
}
