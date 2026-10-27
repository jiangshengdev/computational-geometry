import { SvgMathText } from "./MathText";
// Equal units on both axes. The general drawing illustrates the first quadrant;
// signed coordinate changes are explained separately, not inferred from pixels.
export function SegmentDiagram({
  symbolic,
  step,
}: {
  symbolic: boolean;
  step: number;
}) {
  const x = (v: number) => 50 + v * 90;
  const y = (v: number) => 520 - v * 90;
  const line = (a: number[], b: number[], color: string, dash?: string) => (
    <line
      x1={x(a[0])}
      y1={y(a[1])}
      x2={x(b[0])}
      y2={y(b[1])}
      stroke={color}
      strokeWidth={3}
      strokeDasharray={dash}
    />
  );
  const point = (
    px: number,
    py: number,
    label: string,
    dx = 12,
    dy = -12,
    color = "#176d93",
  ) => (
    <g>
      <circle cx={x(px)} cy={y(py)} r={6} fill={color} />
      <SvgMathText x={x(px) + dx} y={y(py) + dy} fontSize={28} fill={color}>
        {label}
      </SvgMathText>
    </g>
  );
  return (
    <svg
      data-diagram
      viewBox="0 0 620 620"
      style={{
        width: 620,
        height: 620,
        flexShrink: 0,
        overflow: "visible",
      }}
    >
      <defs>
        <marker
          id="axis-arrow"
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
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={y(0)} x2={x(v)} y2={y(5)} stroke="#dce4ec" />
          {!symbolic && (
            <SvgMathText x={x(v)} y={y(0) + 42} align="center" fontSize={24}>
              {v}
            </SvgMathText>
          )}
        </g>
      ))}
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line x1={x(0)} y1={y(v)} x2={x(5.8)} y2={y(v)} stroke="#dce4ec" />
          {!symbolic && (
            <SvgMathText x={x(0) - 15} y={y(v) + 5} align="right" fontSize={24}>
              {v}
            </SvgMathText>
          )}
        </g>
      ))}
      <path
        d={`M${x(0)},${y(5.3)} V${y(0)} H${x(5.9)}`}
        fill="none"
        stroke="#65778a"
        strokeWidth={2}
        markerEnd="url(#axis-arrow)"
      />
      <line
        x1={x(0)}
        y1={y(0)}
        x2={x(0)}
        y2={y(5.3)}
        stroke="#65778a"
        strokeWidth={2}
        markerEnd="url(#axis-arrow)"
      />
      <SvgMathText x={x(5.9)} y={y(0) + 40}>
        x
      </SvgMathText>
      <SvgMathText x={x(0) + 12} y={y(5.3)}>
        y
      </SvgMathText>
      {line([1, 1], [5, 3], "#176d93")}
      {point(1, 1, "A", -28, 8)}
      {point(5, 3, "B")}
      {symbolic ? (
        <>
          {line([1, 1], [5, 1], "#65778a", "7 6")}
          {line([5, 1], [5, 3], "#65778a", "7 6")}
          {line([3, 1], [3, 2], "#b45309", "7 6")}
          {point(3, 2, "P", -26, -15, "#b45309")}
          {point(5, 1, "H", 12, 36)}
          {point(3, 1, "K", 0, 36)}
          {step >= 2 && (
            <>
              <path
                d={`M${x(3) - 14},${y(1)} v-14 h14 M${x(5) - 14},${y(1)} v-14 h14`}
                fill="none"
                stroke="#65778a"
                strokeWidth={2}
              />
            </>
          )}
        </>
      ) : (
        <>
          {step >= 2 && (
            <>
              {line([1, 1], [5, 1], "#65778a", "7 6")}
              {line([5, 1], [5, 3], "#65778a", "7 6")}
            </>
          )}
          {step >= 3 && point(3, 2, "M", 8, -15, "#b45309")}
          {step >= 4 && point(2, 1.5, "Q", -30, -18, "#b45309")}
        </>
      )}
    </svg>
  );
}
