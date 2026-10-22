import { SvgMathText } from "./MathText";
import type { Diagram as Kind } from "./scenes";
import { useCurrentFrame, interpolate } from "remotion";
import type { CoordinateScale } from "./coordinates";
import {
  CoordinateGrid,
  diagramViewport,
  tutorialCoordinates,
} from "./CoordinateGrid";
const blue = "#2563eb",
  orange = "#c66a24";
export const Diagram = ({
  kind,
  scale,
}: {
  kind: Kind;
  scale?: CoordinateScale;
}) => {
  const frame = useCurrentFrame();
  const coordinates = tutorialCoordinates(scale);
  const { x, y, xMax } = coordinates;
  if (kind === "none") return null;
  if (kind.startsWith("axis")) {
    const general = ["axis-general", "axis-x", "axis-y"].includes(kind),
      answer = kind !== "axis-question";
    const coordinates = kind === "axis-x" || kind === "axis-y";
    const spread =
      kind === "axis-answer"
        ? interpolate(frame, [0, 40], [0.3, 1], { extrapolateRight: "clamp" })
        : 1;
    return (
      <svg {...diagramViewport}>
        <SvgMathText
          x="315"
          y="200"
          textAnchor="middle"
          fontSize="38"
          fill="#65758a"
        >
          {general ? "每个坐标都在这个范围内" : "独立数轴练习"}
        </SvgMathText>
        <line
          x1="120"
          y1="380"
          x2="510"
          y2="380"
          stroke="#738399"
          strokeWidth="4"
        />
        {[-1, 0, 1].map((n) => (
          <g key={n}>
            <line
              x1={315 + n * 195}
              x2={315 + n * 195}
              y1="367"
              y2="393"
              stroke="#738399"
              strokeWidth="4"
            />
            <SvgMathText
              x={315 + n * 195}
              y="440"
              textAnchor="middle"
              fontSize="42"
              fill="#172c45"
            >
              {n === 0 ? "0" : general ? (n < 0 ? "−M" : "M") : n * 4}
            </SvgMathText>
          </g>
        ))}
        {answer ? (
          <>
            <line
              x1="120"
              x2="510"
              y1="310"
              y2="310"
              stroke={blue}
              strokeWidth="7"
            />
            <circle
              cx={coordinates ? 204 : 315 - 195 * spread}
              cy="380"
              r="12"
              fill={blue}
            />
            <circle
              cx={coordinates ? 432 : 315 + 195 * spread}
              cy="380"
              r="12"
              fill={orange}
            />
            {coordinates ? (
              <g fontSize="38" textAnchor="middle">
                <SvgMathText
                  outlined
                  textAnchor="middle"
                  x="204"
                  y="355"
                  fill={blue}
                >
                  {kind === "axis-y" ? "Y₁" : "X₂"}
                </SvgMathText>
                <SvgMathText
                  outlined
                  textAnchor="middle"
                  x="432"
                  y="355"
                  fill={orange}
                >
                  {kind === "axis-y" ? "Y₂" : "X₁"}
                </SvgMathText>
                <path
                  d="M204 460 V480 H432 V460"
                  fill="none"
                  stroke={orange}
                  strokeWidth="4"
                />
              </g>
            ) : null}
            <SvgMathText
              outlined
              x="315"
              y="540"
              textAnchor="middle"
              fontSize="34"
              fill={blue}
            >
              {general
                ? "距离不超过 2M"
                : kind === "axis-reverse"
                  ? "反向相减，距离不变"
                  : "两端相距最远"}
            </SvgMathText>
          </>
        ) : null}
      </svg>
    );
  }
  const vertical = kind === "vertical",
    horizontal = kind === "horizontal",
    coincident = kind === "coincident";
  const a = vertical ? [2, 1] : [1, 3],
    b = vertical ? [2, 4] : horizontal ? [4, 3] : [3, 7];
  const full = !["points-a", "points-ab", "points-more"].includes(kind);
  const point = (p: number[], label: string, color = blue) => (
    <g key={label}>
      <circle cx={x(p[0])} cy={y(p[1])} r="8" fill={color} />
      <SvgMathText
        outlined
        x={x(p[0]) + 18}
        y={y(p[1]) - 18}
        fontSize="30"
        fill={color}
      >
        {label}
      </SvgMathText>
    </g>
  );
  return (
    <svg {...diagramViewport}>
      <CoordinateGrid coordinates={coordinates} />
      {vertical ? (
        <line
          x1={x(2)}
          x2={x(2)}
          y1={y(0.3)}
          y2={y(9)}
          stroke={blue}
          strokeWidth="5"
        />
      ) : horizontal ? (
        <line
          x1={x(0)}
          x2={x(xMax)}
          y1={y(3)}
          y2={y(3)}
          stroke={blue}
          strokeWidth="5"
        />
      ) : coincident ? (
        <g stroke={blue} strokeWidth="4">
          <line x1={x(0)} x2={x(xMax)} y1={y(3)} y2={y(3)} />
          <line x1={x(1)} x2={x(1)} y1={y(0.3)} y2={y(9)} />
          <line x1={x(0)} x2={x(4)} y1={y(1)} y2={y(9)} />
        </g>
      ) : (
        <g opacity={kind === "faint" ? 0.15 : 1}>
          {full ? (
            <path
              d={`M ${x(0)} ${y(1)} L ${x(1)} ${y(3)} M ${x(3)} ${y(7)} L ${x(4)} ${y(9)}`}
              stroke={blue}
              strokeWidth="5"
              strokeDasharray="12 10"
            />
          ) : null}
          {full ? (
            <line
              x1={x(1)}
              y1={y(3)}
              x2={x(3)}
              y2={y(7)}
              stroke={blue}
              strokeWidth="6"
            />
          ) : null}
        </g>
      )}
      {kind === "intersection" ? (
        <>
          <line
            x1={x(0)}
            y1={y(7)}
            x2={x(4)}
            y2={y(2)}
            stroke={orange}
            strokeWidth="6"
          />
          <circle cx={x(24 / 13)} cy={y(61 / 13)} r="13" fill={orange} />
        </>
      ) : null}
      {kind === "delta" ? (
        <>
          <path
            d={`M ${x(1)} ${y(3)} H ${x(3)} V ${y(7)}`}
            fill="none"
            stroke={orange}
            strokeWidth="4"
            strokeDasharray="8 9"
          />
          <SvgMathText
            outlined
            x={x(1.4)}
            y={y(3) + 42}
            fontSize="30"
            fill={orange}
          >
            3−1=2
          </SvgMathText>
          <SvgMathText
            outlined
            x={x(3) + 24}
            y={y(5)}
            fontSize="30"
            fill={orange}
          >
            7−3=4
          </SvgMathText>
        </>
      ) : null}
      {kind !== "faint" && kind !== "intersection"
        ? point(a, vertical ? "(2, 1)" : "A = (1, 3)")
        : null}
      {!["faint", "points-a", "intersection", "coincident"].includes(kind)
        ? point(
            b,
            vertical ? "(2, 4)" : horizontal ? "B = (4, 3)" : "B = (3, 7)",
          )
        : null}
      {kind === "points-more"
        ? [
            point([0, 1], "(0, 1)"),
            point([2, 5], "(2, 5)"),
            point([0.5, 2], "(0.5, 2)"),
          ]
        : null}
      {kind === "check" ? (
        <>
          {point([2, 5], "(2, 5)")}
          {point([2, 6], "(2, 6)", orange)}
        </>
      ) : null}
    </svg>
  );
};
