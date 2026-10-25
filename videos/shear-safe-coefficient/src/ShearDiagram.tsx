import { SvgMathText } from "./MathText";
import type { Page } from "./storyboard";

// Both axes use 80 px per coordinate unit. Numerical examples are deliberately
// separate from the final coefficient; the diagram never amplifies that value.
export function ShearDiagram({
  kind,
  step,
}: {
  kind: NonNullable<Page["shearDiagram"]>;
  step: number;
}) {
  const x = (value: number) => 120 + 80 * value;
  const y = (value: number) => 330 - 80 * value;
  if (kind === "height")
    return (
      <svg data-height-diagram width={740} height={600} viewBox="0 0 740 600">
        <rect x={90} y={90} width={560} height={400} fill="#e7eef6" />
        <path
          d="M 90 90 H 650 M 90 490 H 650"
          stroke="#526579"
          strokeWidth={2}
        />
        <SvgMathText x={60} y={100} align="center">
          M
        </SvgMathText>
        <SvgMathText x={50} y={500} align="center">
          −M
        </SvgMathText>
        <g style={{ visibility: step >= 2 ? "visible" : "hidden" }}>
          <path
            d="M 170 170 L 570 410 M 170 410 L 570 170"
            stroke="#2563a6"
            strokeWidth={4}
          />
          {[
            [170, 170],
            [570, 410],
            [170, 410],
            [570, 170],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={6} fill="#2563a6" />
          ))}
          <circle cx={370} cy={290} r={8} fill="#b45309" />
          <SvgMathText x={370} y={345} align="center">
            实际交点
          </SvgMathText>
        </g>
        <g style={{ visibility: step >= 4 ? "visible" : "hidden" }}>
          <path
            d="M 660 90 H 680 V 490 H 660"
            stroke="#b45309"
            fill="none"
            strokeWidth={3}
          />
          <SvgMathText x={690} y={300} align="center">
            2M
          </SvgMathText>
        </g>
      </svg>
    );
  const equality = kind === "equality";
  const points = [
    { name: "P", x: 0, y: kind === "growth" ? 0 : 2, color: "#2563a6" },
    {
      name: "Q",
      x: equality ? 1 : 4,
      y: kind === "growth" || kind === "same" ? 2 : 0,
      color: "#b45309",
    },
  ];
  const originalGap = points[1].x - points[0].x;
  const after = points.map((point) => ({ ...point, x: point.x + point.y / 2 }));
  return (
    <svg
      data-shear-diagram
      data-kind={kind}
      width={740}
      height={600}
      viewBox="0 0 740 600"
    >
      <path
        d={`M ${x(-0.5)} ${y(0)} H ${x(6.5)} M ${x(0)} ${y(-0.5)} V ${y(3.5)}`}
        stroke="#526579"
        strokeWidth={2}
      />
      <polygon
        points={`${x(6.5)},${y(0)} ${x(6.5) - 12},${y(0) - 6} ${x(6.5) - 12},${y(0) + 6}`}
        fill="#526579"
      />
      <polygon
        points={`${x(0)},${y(3.5)} ${x(0) - 6},${y(3.5) + 12} ${x(0) + 6},${y(3.5) + 12}`}
        fill="#526579"
      />
      <SvgMathText x={x(6.5)} y={y(0) + 42} align="center">
        X
      </SvgMathText>
      <SvgMathText x={x(0) - 30} y={y(3.5)} align="center">
        Y
      </SvgMathText>
      {[0, 1, 2, 3, 4, 5, 6].map((tick) => (
        <g key={tick}>
          <path d={`M ${x(tick)} ${y(0)} v 8`} stroke="#526579" />
          <SvgMathText x={x(tick)} y={y(0) + 42} align="center">
            {String(tick)}
          </SvgMathText>
        </g>
      ))}
      <SvgMathText x={x(0) - 35} y={y(2) + 8} align="center">
        2
      </SvgMathText>
      <g style={{ visibility: step >= 1 ? "visible" : "hidden" }}>
        {points.map((point, index) => (
          <g key={point.name}>
            <circle cx={x(point.x)} cy={y(point.y)} r={8} fill={point.color} />
            <SvgMathText
              x={x(point.x)}
              y={y(point.y) - 35}
              align="center"
              fill={point.color}
            >
              {point.name}
            </SvgMathText>
            <g
              data-shear-result
              style={{ visibility: step >= 2 ? "visible" : "hidden" }}
            >
              <path
                d={`M ${x(point.x)} ${y(point.y)} H ${x(after[index].x)}`}
                stroke={point.color}
                strokeWidth={3}
              />
              <circle
                cx={x(after[index].x)}
                cy={y(point.y)}
                r={12}
                stroke={point.color}
                fill="none"
                strokeWidth={3}
              />
              <SvgMathText
                x={x(after[index].x)}
                y={y(point.y) + (point.y === 0 ? 95 : 55)}
                align="center"
                fill={point.color}
              >{`${point.name}′`}</SvgMathText>
            </g>
          </g>
        ))}
        <SvgMathText
          x={340}
          y={490}
          align="center"
        >{`原横向间隔：${originalGap}`}</SvgMathText>
      </g>
      <g
        data-shear-gap
        style={{ visibility: step >= 2 ? "visible" : "hidden" }}
      >
        <SvgMathText
          x={340}
          y={560}
          align="center"
        >{`新横向间隔：${after[1].x - after[0].x}`}</SvgMathText>
      </g>
    </svg>
  );
}
