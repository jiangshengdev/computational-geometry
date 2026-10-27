import { SvgMathText } from "./MathText";
import type { Page } from "./storyboard";
import { objectColors } from "./teaching-emphasis";

const blue = objectColors.original,
  orange = objectColors.movement,
  gray = "#76899b",
  purple = objectColors.coordinates;
const x = (v: number) => 330 + v * 100;
const y = (v: number) => 440 - v * 100;
type Position = [number, number];
const Line = ({
  a,
  b,
  color = gray,
  dashed = false,
  arrow = false,
}: {
  a: Position;
  b: Position;
  color?: string;
  dashed?: boolean;
  arrow?: boolean;
}) => {
  const dx = x(b[0]) - x(a[0]),
    dy = y(b[1]) - y(a[1]);
  const length = Math.hypot(dx, dy);
  const ux = dx / (length || 1),
    uy = dy / (length || 1);
  const tipX = x(b[0]),
    tipY = y(b[1]);
  return (
    <g>
      <line
        x1={x(a[0])}
        y1={y(a[1])}
        x2={tipX}
        y2={tipY}
        stroke={color}
        strokeWidth={3}
        strokeDasharray={dashed ? "9 7" : undefined}
      />
      {arrow && length > 14 ? (
        <polygon
          fill={color}
          points={`${tipX},${tipY} ${tipX - 13 * ux + 5 * uy},${tipY - 13 * uy - 5 * ux} ${tipX - 13 * ux - 5 * uy},${tipY - 13 * uy + 5 * ux}`}
        />
      ) : null}
    </g>
  );
};
const Point = ({
  at,
  label,
  color = blue,
  below = false,
  left = false,
  raised = false,
}: {
  at: Position;
  label: string;
  color?: string;
  below?: boolean;
  left?: boolean;
  raised?: boolean;
}) => (
  <g>
    <circle cx={x(at[0])} cy={y(at[1])} r={8} fill={color} />
    <SvgMathText
      x={x(at[0]) + (left ? -25 : 15)}
      y={y(at[1]) + (below ? 65 : raised ? -45 : left ? -5 : -25)}
      fill={color}
      align={left ? "right" : "left"}
    >
      {label}
    </SvgMathText>
  </g>
);
const NewAxes = ({ horizontalOnly = false }: { horizontalOnly?: boolean }) => (
  <>
    <Line a={[-2.4, 0]} b={[4.3, 0]} color={purple} dashed arrow />
    <SvgMathText x={x(4.35)} y={y(0) + 10} fill={purple} colorize>
      x, x′
    </SvgMathText>
    {!horizontalOnly ? (
      <>
        <Line a={[1, -2]} b={[-1.7, 3.4]} color={purple} arrow />
        <SvgMathText x={x(-1.9)} y={y(3.55)} fill={purple}>
          y′
        </SvgMathText>
        {[1, 2, 3].map((n) => (
          <g key={n}>
            <Line
              a={[-0.5 * n - 0.07, n]}
              b={[-0.5 * n + 0.07, n]}
              color={purple}
            />
            <SvgMathText
              x={x(-0.5 * n) - 18}
              y={y(n) + 9}
              fill={purple}
              fontSize={24}
              align="right"
            >
              {n}
            </SvgMathText>
          </g>
        ))}
      </>
    ) : null}
  </>
);

export const Diagram = ({
  kind,
  step,
  progress,
  walk = [1, 1],
}: {
  kind: Page["diagram"];
  step: number;
  progress: number;
  walk?: [number, number];
}) => {
  const negative = kind === "negative" || kind === "negative-question";
  const hasNewAxes =
    kind === "coordinates" ||
    kind === "horizontal-axis" ||
    kind === "vertical-axis";
  const at: Position = negative ? [-1, -1] : [2, 2];
  const moving =
    kind === "formula"
      ? 1
      : (kind === "positive" || kind === "negative") && step >= 4
        ? progress
        : 0;
  const newAt: Position = [at[0] + at[1] * 0.5 * moving, at[1]];
  return (
    <svg
      data-diagram
      width={830}
      height={750}
      viewBox="0 0 830 750"
      style={{ overflow: "visible" }}
    >
      {[-2, -1, 0, 1, 2, 3, 4].map((n) => (
        <g key={n} stroke="#e1e7ee" strokeWidth={1}>
          <line x1={x(n)} x2={x(n)} y1={y(-2)} y2={y(3)} />
          {n <= 3 ? <line y1={y(n)} y2={y(n)} x1={x(-2)} x2={x(4)} /> : null}
        </g>
      ))}
      <Line a={[-2.4, 0]} b={[4.3, 0]} arrow />
      <Line a={[0, -2.3]} b={[0, 3.4]} arrow />
      {!hasNewAxes ? (
        <SvgMathText x={x(4.4)} y={y(0) + 10}>
          x
        </SvgMathText>
      ) : null}
      <SvgMathText x={x(0)} y={y(3.65)} align="center">
        y
      </SvgMathText>
      {kind === "scan" ? (
        <>
          <Line a={[1, -1]} b={[1, 2.5]} color={blue} />
          <Line
            a={[step === 1 ? -1 + 2 * progress : 1, -1.7]}
            b={[step === 1 ? -1 + 2 * progress : 1, 3]}
            color={orange}
            dashed
          />
          <SvgMathText x={85} y={65} fontSize={28} fill={orange}>
            扫描线向右
          </SvgMathText>
          <Line a={[-1.5, 3.4]} b={[-0.7, 3.4]} color={orange} arrow />
          {step >= 3 ? (
            <>
              <Line
                a={[1 - 0.25 * progress, -1]}
                b={[1 + 0.625 * progress, 2.5]}
                color={orange}
              />
              <SvgMathText x={520} y={95} fontSize={28} fill={orange}>
                稍微推斜？
              </SvgMathText>
            </>
          ) : null}
        </>
      ) : kind === "read-original" ? (
        <>
          {step >= 2 ? (
            <Line
              a={[2, 2]}
              b={[2, step === 2 ? 2 - 2 * progress : 0]}
              dashed
              color={blue}
              arrow
            />
          ) : null}
          {step >= 4 ? (
            <Line
              a={[2, 2]}
              b={[2 - 2 * progress, 2]}
              dashed
              color={blue}
              arrow
            />
          ) : null}
          <Point at={[2, 2]} label="P（固定）" />
        </>
      ) : kind === "coordinates" ? (
        <>
          <NewAxes />
          {step >= 2 ? (
            <Line
              a={[2, 2]}
              b={[
                step === 2 ? 2 + progress : 3,
                step === 2 ? 2 - 2 * progress : 0,
              ]}
              color={purple}
              dashed
              arrow
            />
          ) : null}
          {step >= 4 ? (
            <Line
              a={[2, 2]}
              b={[2 - 3 * progress, 2]}
              color={purple}
              dashed
              arrow
            />
          ) : null}
          <Point at={[2, 2]} label="P（固定）" />
        </>
      ) : kind === "horizontal-axis" ? (
        <>
          <NewAxes horizontalOnly />
          {[-1, 1, 2].map((n) => (
            <circle key={n} cx={x(n)} cy={y(0)} r={8} fill={blue} />
          ))}
          <SvgMathText x={x(2)} y={y(0) - 35} fill={blue} align="center">
            (2,0)
          </SvgMathText>
        </>
      ) : kind === "vertical-axis" ? (
        <>
          <NewAxes />
          {step >= 2 ? (
            <Line
              a={[-1, 2]}
              b={[
                -1 + (step === 2 ? progress : 1),
                2 - 2 * (step === 2 ? progress : 1),
              ]}
              color={orange}
              arrow
            />
          ) : null}
          {step >= 3 ? (
            <Line
              a={[-1, 2]}
              b={[-1 + (step === 3 ? progress : 1), 2]}
              dashed
              color={blue}
              arrow
            />
          ) : null}
          {step >= 5 ? (
            <Line
              a={[-1, 2]}
              b={[-1, 2 - 2 * (step === 5 ? progress : 1)]}
              dashed
              color={blue}
              arrow
            />
          ) : null}
          {step >= 6 ? (
            <>
              <Line a={[0, 0]} b={[-walk[0], 0]} color={orange} arrow />
              {walk[1] > 0 ? (
                <Line a={[-1, 0]} b={[-1, 2 * walk[1]]} color={orange} arrow />
              ) : null}
            </>
          ) : null}
          <Point at={[-1, 2]} label="固定点" raised />
        </>
      ) : (
        <>
          <Line a={at} b={[at[0], 0]} dashed />
          <Line a={at} b={[0, at[1]]} dashed />
          <Point
            at={at}
            label={negative ? "Q (−1,−1)" : "P (2,2)"}
            left={negative}
          />
          {moving > 0 ? (
            <>
              <Line a={at} b={newAt} color={orange} arrow />
              <Line a={newAt} b={[newAt[0], 0]} color={orange} dashed />
              <Point
                at={newAt}
                label={
                  moving === 1
                    ? negative
                      ? "Q′ (−3/2,−1)"
                      : "P′ (3,2)"
                    : negative
                      ? "Q′"
                      : "P′"
                }
                color={orange}
                below
              />
            </>
          ) : null}
        </>
      )}
      {/* Paint tick labels after the geometry so lines cannot cover their halo. */}
      {[-2, -1, 1, 2, 3, 4].map((n) => (
        <SvgMathText
          key={`x${n}`}
          x={x(n)}
          y={y(0) + 37}
          fontSize={24}
          fill={gray}
          align="center"
        >
          {n}
        </SvgMathText>
      ))}
      {[-2, -1, 1, 2, 3].map((n) => (
        <SvgMathText
          key={`y${n}`}
          x={x(0) - 18}
          y={y(n) + 9}
          fontSize={24}
          fill={gray}
          align="right"
        >
          {n}
        </SvgMathText>
      ))}
      <SvgMathText x={x(0) - 18} y={y(0) + 37} fontSize={24} align="right">
        O
      </SvgMathText>
    </svg>
  );
};
