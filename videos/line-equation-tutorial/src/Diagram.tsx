import { SvgMathText } from "./MathText";
import type { Diagram as Kind } from "./scenes";
import { useCurrentFrame, interpolate } from "remotion";
import {
  createCoordinates,
  coordinateTicks,
  type CoordinateScale,
} from "./coordinates";
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
  const { x, y, xMax, yMax, notice } = createCoordinates({
    left: 120,
    bottom: 700,
    width: 660,
    height: 585,
    xMax: 6,
    yMax: 9,
    scale,
  });
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
      <svg width="850" height="730" viewBox="0 0 850 730">
        <SvgMathText
          x="425"
          y="200"
          textAnchor="middle"
          fontSize="38"
          fill="#65758a"
        >
          {general ? "每个坐标都在这个范围内" : "独立数轴练习"}
        </SvgMathText>
        <line
          x1="90"
          y1="380"
          x2="770"
          y2="380"
          stroke="#738399"
          strokeWidth="4"
        />
        {[-1, 0, 1].map((n) => (
          <g key={n}>
            <line
              x1={425 + n * 290}
              x2={425 + n * 290}
              y1="367"
              y2="393"
              stroke="#738399"
              strokeWidth="4"
            />
            <SvgMathText
              x={425 + n * 290}
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
              x1="135"
              x2="715"
              y1="310"
              y2="310"
              stroke={blue}
              strokeWidth="7"
            />
            <circle
              cx={coordinates ? 260 : 425 - 290 * spread}
              cy="380"
              r="12"
              fill={blue}
            />
            <circle
              cx={coordinates ? 600 : 425 + 290 * spread}
              cy="380"
              r="12"
              fill={orange}
            />
            {coordinates ? (
              <g fontSize="38" textAnchor="middle">
                <SvgMathText
                  outlined
                  textAnchor="middle"
                  x="260"
                  y="355"
                  fill={blue}
                >
                  {kind === "axis-y" ? "Y₁" : "X₂"}
                </SvgMathText>
                <SvgMathText
                  outlined
                  textAnchor="middle"
                  x="600"
                  y="355"
                  fill={orange}
                >
                  {kind === "axis-y" ? "Y₂" : "X₁"}
                </SvgMathText>
                <path
                  d="M260 460 V480 H600 V460"
                  fill="none"
                  stroke={orange}
                  strokeWidth="4"
                />
              </g>
            ) : null}
            <SvgMathText
              outlined
              x="425"
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
    <svg width="850" height="730" viewBox="0 0 850 730">
      {coordinateTicks(xMax).map((v) => (
        <g key={`x${v}`}>
          <line x1={x(v)} x2={x(v)} y1={y(yMax)} y2={y(0)} stroke="#dce4ec" />
          <SvgMathText x={x(v)} y={y(0) + 28} fontSize="22" fill="#738399">
            {v}
          </SvgMathText>
        </g>
      ))}
      {coordinateTicks(yMax)
        .filter((v) => v !== 0)
        .map((v) => (
          <g key={`y${v}`}>
            <line x1={x(0)} x2={x(xMax)} y1={y(v)} y2={y(v)} stroke="#dce4ec" />
            <SvgMathText
              x={x(0) - 30}
              y={y(v) + 8}
              fontSize="22"
              fill="#738399"
            >
              {v}
            </SvgMathText>
          </g>
        ))}
      <path
        d={`M ${x(0)} ${y(yMax) - 39} V ${y(0)} H ${x(xMax) + 44}`}
        stroke="#738399"
        strokeWidth="3"
        fill="none"
      />
      <SvgMathText x={x(xMax) + 44} y={y(0) - 10} fontSize="26" fill="#738399">
        X
      </SvgMathText>
      <SvgMathText x={x(0) + 15} y={y(yMax) - 39} fontSize="26" fill="#738399">
        Y
      </SvgMathText>
      {notice ? (
        <SvgMathText
          x={x(xMax)}
          y={y(yMax) - 20}
          textAnchor="end"
          fontSize="24"
          fill="#65758a"
        >
          {notice}
        </SvgMathText>
      ) : null}
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
