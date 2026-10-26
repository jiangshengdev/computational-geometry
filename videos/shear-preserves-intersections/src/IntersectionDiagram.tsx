import { useId } from "react";
import { SvgMathText } from "./MathText";

type Point = readonly [number, number];
const cross: Point[] = [
  [1, 1],
  [5, 3],
  [1, 3],
  [5, 1],
];
const overlap: Point[] = [
  [1, 1],
  [4, 4],
  [2, 2],
  [5, 5],
];

/** All inputs and their entire intersection use the same shear at every frame. */
export function IntersectionDiagram({
  mode,
  step,
  progress,
}: {
  mode: "cross" | "overlap";
  step: number;
  progress: number;
}) {
  const marker = useId().replace(/:/g, "");
  const returning = mode === "overlap" && step >= 3;
  const amount =
    step < 2
      ? 0
      : returning
        ? step === 3
          ? 1 - progress
          : 0
        : step === 2
          ? progress
          : 1;
  const project = ([x, y]: Point): Point => [
    44 + (x + 0.5 * amount * y) * 68,
    535 - y * 68,
  ];
  const points = (mode === "cross" ? cross : overlap).map(project);
  const prime = amount > 0 ? "′" : "";
  const segment = (a: Point, b: Point, color: string, width: number) => (
    <line
      x1={a[0]}
      y1={a[1]}
      x2={b[0]}
      y2={b[1]}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
  const label = (
    p: Point,
    name: string,
    dx: number,
    dy: number,
    color: string,
  ) => (
    <g key={name}>
      <circle cx={p[0]} cy={p[1]} r={5} fill={color} />
      <SvgMathText x={p[0] + dx} y={p[1] + dy} fontSize={28} fill={color}>
        {name + prime}
      </SvgMathText>
    </g>
  );
  return (
    <svg
      data-diagram
      viewBox="0 0 620 620"
      style={{ width: 620, height: 620, overflow: "visible" }}
    >
      <defs>
        <marker
          id={marker}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="4"
          orient="auto"
        >
          <path
            d="M0,0 L8,4 L0,8"
            fill="none"
            stroke="#65778a"
            strokeWidth="1.5"
          />
        </marker>
      </defs>
      {[1, 2, 3, 4, 5, 6, 7].map((v) => (
        <line
          key={`x${v}`}
          x1={44 + v * 68}
          y1={535}
          x2={44 + v * 68}
          y2={70}
          stroke="#dce4ec"
        />
      ))}
      {[1, 2, 3, 4, 5, 6].map((v) => (
        <line
          key={`y${v}`}
          x1={44}
          y1={535 - v * 68}
          x2={588}
          y2={535 - v * 68}
          stroke="#dce4ec"
        />
      ))}
      <line
        x1={44}
        y1={535}
        x2={596}
        y2={535}
        stroke="#65778a"
        strokeWidth={2}
        markerEnd={`url(#${marker})`}
      />
      <line
        x1={44}
        y1={535}
        x2={44}
        y2={60}
        stroke="#65778a"
        strokeWidth={2}
        markerEnd={`url(#${marker})`}
      />
      <SvgMathText x={584} y={577}>
        x
      </SvgMathText>
      <SvgMathText x={58} y={66}>
        y
      </SvgMathText>
      {segment(points[0], points[1], "#176d93", mode === "overlap" ? 12 : 4)}
      {segment(points[2], points[3], "#31765a", mode === "overlap" ? 7 : 4)}
      {mode === "overlap"
        ? segment(points[2], points[1], "#b45309", 3)
        : label(project([3, 2]), "P", 10, -26, "#b45309")}
      {label(points[0], "A", -29, 16, "#176d93")}
      {label(points[1], "B", 14, 9, "#176d93")}
      {label(points[2], "C", -30, -17, "#31765a")}
      {label(points[3], "D", 12, mode === "overlap" ? -15 : 30, "#31765a")}
    </svg>
  );
}
