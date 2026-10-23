import { SvgMathText } from "./MathText";
import { objectColors } from "./teaching-emphasis";

// Square grid cells: 1 horizontal unit and 100 vertical units share 200 px.
// Fixed throughout the episode; these are mathematical schematic coordinates.
const gridSpacing = 200;
const x = (value: number) => 170 + gridSpacing * value;
const y = (value: number) => 560 - gridSpacing * (value / 100);

export const Diagram = ({
  moving = false,
  progress = 0,
  targetX = 2,
}: {
  moving?: boolean;
  progress?: number;
  targetX?: number;
}) => {
  const a = moving ? targetX * progress : 0;
  return (
    <svg width="830" height="640" viewBox="0 0 830 640" data-coordinate-diagram>
      <text
        x="415"
        y="42"
        textAnchor="middle"
        fontSize="28"
        fill="#526579"
        data-scale-note
      >
        不等比例示意
      </text>
      {[0, 1, 2].map((value) => (
        <g key={value}>
          <line
            x1={x(value)}
            x2={x(value)}
            y1="95"
            y2={y(0)}
            stroke="#dce4ec"
            strokeDasharray="6 6"
          />
          <SvgMathText x={x(value)} y={606} align="center">
            {value}
          </SvgMathText>
        </g>
      ))}
      {[100, 200].map((value) => (
        <g key={value}>
          <line
            x1={x(0)}
            x2="755"
            y1={y(value)}
            y2={y(value)}
            stroke="#dce4ec"
            strokeDasharray="6 6"
          />
          <SvgMathText x={145} y={y(value) + 8} align="right">
            {value}
          </SvgMathText>
        </g>
      ))}
      <path
        d="M170 80 V560 H770"
        fill="none"
        stroke="#526579"
        strokeWidth="3"
      />
      <path
        d="M163 92 L170 80 L177 92 M758 553 L770 560 L758 567"
        fill="none"
        stroke="#526579"
        strokeWidth="3"
      />
      <SvgMathText x={788} y={570}>
        x
      </SvgMathText>
      <SvgMathText x={175} y={80}>
        y
      </SvgMathText>
      {moving && progress > 0 ? (
        <line
          x1={x(0)}
          x2={x(a)}
          y1={y(200)}
          y2={y(200)}
          stroke={objectColors.original}
          strokeWidth="4"
        />
      ) : null}
      <circle
        data-point="A"
        data-x={a}
        data-y="200"
        cx={x(a)}
        cy={y(200)}
        r="10"
        fill={objectColors.original}
      />
      <SvgMathText
        x={x(a)}
        y={y(200) + 80}
        align="center"
        fill={objectColors.original}
      >
        {moving && progress === 1
          ? `A′=(${targetX},200)`
          : progress === 0
            ? "A=(0,200)"
            : "A"}
      </SvgMathText>
      <circle
        data-point="B"
        data-x="1"
        data-y="0"
        cx={x(1)}
        cy={y(0)}
        r="10"
        fill={objectColors.coordinates}
      />
      <SvgMathText
        x={x(1)}
        y={y(0) - 28}
        align="center"
        fill={objectColors.coordinates}
      >
        {moving && progress === 1 ? "B′=(1,0)" : "B=(1,0)"}
      </SvgMathText>
    </svg>
  );
};
