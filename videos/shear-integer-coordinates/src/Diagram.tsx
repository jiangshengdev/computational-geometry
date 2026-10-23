import { useId } from "react";
import { SvgMathText } from "./MathText";
import { objectColors } from "./teaching-emphasis";
import type { Shot } from "./storyboard";

// Geometry changes points; the later camera changes their common projection.
export function diagramState(shot: Shot, progress: number) {
  const factor =
    shot.page === "camera" || (shot.page === "scaling" && shot.step >= 4)
      ? 6
      : shot.page === "scaling" && shot.motion
        ? 1 + 5 * progress
        : 1;
  const camera = shot.page === "camera" ? (shot.motion ? progress : 1) : 0;
  return {
    factor,
    unit: 250 / (1 + 3 * camera),
    ox: 415,
    oy: 380,
  };
}
export const Diagram = ({
  shot,
  progress,
}: {
  shot: Shot;
  progress: number;
}) => {
  const clipId = useId();
  const { factor, unit, ox, oy } = diagramState(shot, progress);
  const x = (value: number) => ox + unit * value;
  const y = (value: number) => oy - unit * value;
  const p = { x: factor / 2, y: (-2 * factor) / 3 };
  const q = { x: -factor / 3, y: factor / 6 };
  const ticks = Array.from({ length: 9 }, (_, i) => i - 4).filter(
    (value) => Math.abs(value * unit) <= 270,
  );
  const labeledTicks = ticks.filter(
    (value) => value !== 0 && (unit >= 80 || value % 2 === 0),
  );
  const endpoints = [
    {
      id: "P",
      point: p,
      color: objectColors.original,
      label: factor === 6 ? "P′=(3,-4)" : factor === 1 ? "P=(1/2,-2/3)" : "P",
    },
    {
      id: "Q",
      point: q,
      color: objectColors.coordinates,
      label: factor === 6 ? "Q′=(-2,1)" : factor === 1 ? "Q=(-1/3,1/6)" : "Q",
    },
  ].map((endpoint) => {
    const dx = unit * endpoint.point.x;
    const dy = -unit * endpoint.point.y;
    const outside = Math.max(Math.abs(dx), Math.abs(dy)) > 285;
    const edge = 285 / Math.max(Math.abs(dx), Math.abs(dy));
    return {
      ...endpoint,
      outside,
      sx: outside ? ox + dx * edge : ox + dx,
      sy: outside ? oy + dy * edge : oy + dy,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    };
  });
  return (
    <svg
      width="830"
      height="740"
      viewBox="0 0 830 740"
      data-coordinate-diagram
      data-unit-x={unit}
      data-unit-y={unit}
      data-factor={factor}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="115" y="80" width="600" height="600" />
        </clipPath>
      </defs>
      <text
        x="415"
        y="35"
        textAnchor="middle"
        fontSize="22"
        fill="#526579"
        data-scale-note
      >
        {shot.page === "camera"
          ? "拉远视野 · 淡色保留原始图形"
          : factor > 1
            ? "单位长度固定 · 淡色保留原始图形"
            : "两轴等比例 · 每单位长度固定"}
      </text>
      <rect
        x="115"
        y="80"
        width="600"
        height="600"
        fill="none"
        stroke="#dce4ec"
      />
      {ticks.map((value) => (
        <line
          key={`x${value}`}
          x1={x(value)}
          x2={x(value)}
          y1="80"
          y2="680"
          stroke="#dce4ec"
          strokeDasharray="4 5"
        />
      ))}
      {ticks.map((value) => (
        <line
          key={`y${value}`}
          y1={y(value)}
          y2={y(value)}
          x1="115"
          x2="715"
          stroke="#dce4ec"
          strokeDasharray="4 5"
        />
      ))}
      <path
        d={`M115 ${oy} H735 M${ox} 680 V60`}
        fill="none"
        stroke="#526579"
        strokeWidth="2"
      />
      <path
        d={`M725 ${oy - 6} L735 ${oy} L725 ${oy + 6} M${ox - 6} 70 L${ox} 60 L${ox + 6} 70`}
        fill="none"
        stroke="#526579"
        strokeWidth="2"
      />
      {labeledTicks.map((value) => (
        <SvgMathText
          key={value}
          x={x(value)}
          y={oy + 31}
          align="center"
          fontSize={23}
        >
          {value}
        </SvgMathText>
      ))}
      {labeledTicks.map((value) => (
        <SvgMathText
          key={value}
          x={ox - 12}
          y={y(value) + 5}
          align="right"
          fontSize={23}
        >
          {value}
        </SvgMathText>
      ))}
      <SvgMathText x={ox - 12} y={oy + 30} align="right" fontSize={23}>
        0
      </SvgMathText>
      <SvgMathText x={750} y={oy + 8} fontSize={25}>
        {factor === 1 ? "x" : "X"}
      </SvgMathText>
      <SvgMathText x={ox + 24} y={84} fontSize={25}>
        {factor === 1 ? "y" : "Y"}
      </SvgMathText>
      <g clipPath={`url(#${clipId})`} data-clipped-geometry>
        {factor > 1 ? (
          <g data-original-geometry opacity={0.4}>
            <line
              x1={x(1 / 2)}
              y1={y(-2 / 3)}
              x2={x(-1 / 3)}
              y2={y(1 / 6)}
              stroke="#526579"
              strokeWidth="4"
            />
            <circle
              data-original-point="P"
              cx={x(1 / 2)}
              cy={y(-2 / 3)}
              r="7"
              fill={objectColors.original}
            />
            <circle
              data-original-point="Q"
              cx={x(-1 / 3)}
              cy={y(1 / 6)}
              r="7"
              fill={objectColors.coordinates}
            />
          </g>
        ) : null}
        {factor > 1 ? (
          <>
            <line
              x1={ox}
              y1={oy}
              x2={x(p.x)}
              y2={y(p.y)}
              stroke={objectColors.original}
              strokeDasharray="5 7"
              opacity={0.45}
            />
            <line
              x1={ox}
              y1={oy}
              x2={x(q.x)}
              y2={y(q.y)}
              stroke={objectColors.coordinates}
              strokeDasharray="5 7"
              opacity={0.45}
            />
          </>
        ) : null}
        <line
          data-segment
          x1={x(p.x)}
          y1={y(p.y)}
          x2={x(q.x)}
          y2={y(q.y)}
          stroke="#526579"
          strokeWidth="4"
        />
        {endpoints.map(({ id, point, color, outside }) => (
          <circle
            key={id}
            data-point={id}
            data-x={point.x}
            data-y={point.y}
            data-outside={outside}
            cx={x(point.x)}
            cy={y(point.y)}
            r="7"
            fill={color}
            visibility={outside ? "hidden" : "visible"}
          />
        ))}
      </g>
      {endpoints.map(({ id, color, label, outside, sx, sy, angle }) => (
        <g key={id}>
          {outside ? (
            <path
              data-offscreen={id}
              d="M-24 0 H0 M-10 -7 L0 0 L-10 7"
              transform={`translate(${sx} ${sy}) rotate(${angle})`}
              fill="none"
              stroke={color}
              strokeWidth="3"
            />
          ) : null}
          <SvgMathText
            x={
              outside
                ? id === "P"
                  ? 500
                  : 220
                : id === "P"
                  ? Math.min(sx + 18, 580)
                  : Math.max(sx - 20, 250)
            }
            y={
              outside
                ? 725
                : id === "P"
                  ? Math.min(sy + 42, 720)
                  : Math.max(sy - 38, 120)
            }
            align={!outside && id === "Q" ? "right" : "left"}
            fill={color}
            fontSize={27}
          >
            {outside ? `${id}${factor === 6 ? "′" : ""} 超出视野` : label}
          </SvgMathText>
        </g>
      ))}
    </svg>
  );
};
