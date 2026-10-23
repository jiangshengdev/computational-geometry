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
    unit: 65 + 10 * camera,
    ox: 395 - 25 * camera,
    oy: 235 + 15 * camera,
  };
}
export const Diagram = ({
  shot,
  progress,
}: {
  shot: Shot;
  progress: number;
}) => {
  const { factor, unit, ox, oy } = diagramState(shot, progress);
  const x = (value: number) => ox + unit * value;
  const y = (value: number) => oy - unit * value;
  const p = { x: factor / 2, y: (-2 * factor) / 3 };
  const q = { x: -factor / 3, y: factor / 6 };
  return (
    <svg
      width="830"
      height="640"
      viewBox="0 0 830 640"
      data-coordinate-diagram
      data-unit-x={unit}
      data-unit-y={unit}
      data-factor={factor}
    >
      <text
        x="415"
        y="35"
        textAnchor="middle"
        fontSize="22"
        fill="#526579"
        data-scale-note
      >
        {shot.page === "camera"
          ? "只调整视野 · 数学坐标不变"
          : "两轴等比例 · 坐标轴单位长度固定"}
      </text>
      {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((value) => (
        <line
          key={`x${value}`}
          x1={x(value)}
          x2={x(value)}
          y1="70"
          y2="590"
          stroke="#dce4ec"
          strokeDasharray="4 5"
        />
      ))}
      {[-4, -3, -2, -1, 0, 1, 2].map((value) => (
        <line
          key={`y${value}`}
          y1={y(value)}
          y2={y(value)}
          x1="55"
          x2="770"
          stroke="#dce4ec"
          strokeDasharray="4 5"
        />
      ))}
      <path
        d={`M55 ${oy} H780 M${ox} 590 V65`}
        fill="none"
        stroke="#526579"
        strokeWidth="2"
      />
      <path
        d={`M770 ${oy - 6} L780 ${oy} L770 ${oy + 6} M${ox - 6} 75 L${ox} 65 L${ox + 6} 75`}
        fill="none"
        stroke="#526579"
        strokeWidth="2"
      />
      {[-4, -2, 2, 4].map((value) => (
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
      {[-4, -2, 2].map((value) => (
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
      <SvgMathText x={795} y={oy + 8} fontSize={25}>
        {factor === 1 ? "x" : "X"}
      </SvgMathText>
      <SvgMathText x={ox + 15} y={72} fontSize={25}>
        {factor === 1 ? "y" : "Y"}
      </SvgMathText>
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
      <circle
        data-point="P"
        data-x={p.x}
        data-y={p.y}
        cx={x(p.x)}
        cy={y(p.y)}
        r="7"
        fill={objectColors.original}
      />
      <circle
        data-point="Q"
        data-x={q.x}
        data-y={q.y}
        cx={x(q.x)}
        cy={y(q.y)}
        r="7"
        fill={objectColors.coordinates}
      />
      <SvgMathText
        x={x(p.x) + 18}
        y={y(p.y) + 42}
        fill={objectColors.original}
        fontSize={27}
      >
        {factor === 6 ? "P′=(3,-4)" : factor === 1 ? "P=(1/2,-2/3)" : "P"}
      </SvgMathText>
      <SvgMathText
        x={x(q.x) - 20}
        y={y(q.y) - 38}
        align="right"
        fill={objectColors.coordinates}
        fontSize={27}
      >
        {factor === 6 ? "Q′=(-2,1)" : factor === 1 ? "Q=(-1/3,1/6)" : "Q"}
      </SvgMathText>
    </svg>
  );
};
