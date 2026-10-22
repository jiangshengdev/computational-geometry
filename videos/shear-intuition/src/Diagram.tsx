import type { Page } from "./storyboard";

const blue = "#176ba0",
  orange = "#c56821",
  gray = "#76899b";
const x = (value: number) => 330 + value * 100;
const y = (value: number) => 440 - value * 100;
const Line = ({
  a,
  b,
  color = gray,
  dashed = false,
}: {
  a: [number, number];
  b: [number, number];
  color?: string;
  dashed?: boolean;
}) => (
  <line
    x1={x(a[0])}
    y1={y(a[1])}
    x2={x(b[0])}
    y2={y(b[1])}
    stroke={color}
    strokeWidth={3}
    strokeDasharray={dashed ? "9 7" : undefined}
  />
);
const Point = ({
  at,
  label,
  color = blue,
  below = false,
}: {
  at: [number, number];
  label: string;
  color?: string;
  below?: boolean;
}) => (
  <g>
    <circle cx={x(at[0])} cy={y(at[1])} r={8} fill={color} />
    <text
      data-diagram-label
      x={x(at[0]) + 15}
      y={y(at[1]) + (below ? 42 : -22)}
      fill={color}
      fontSize={30}
    >
      {label}
    </text>
  </g>
);

const NewAxes = ({ horizontalOnly = false }: { horizontalOnly?: boolean }) => (
  <>
    <Line a={[-2.4, 0]} b={[4.3, 0]} color="#8056aa" dashed />
    <text
      data-diagram-label
      x={x(4.4)}
      y={y(0) + 52}
      fill="#8056aa"
      fontSize={30}
    >
      x′
    </text>
    {!horizontalOnly ? (
      <>
        <Line a={[1, -2]} b={[-1.7, 3.4]} color="#8056aa" />
        <text
          data-diagram-label
          x={x(-1.9)}
          y={y(3.55)}
          fill="#8056aa"
          fontSize={30}
        >
          y′
        </text>
        {[1, 2, 3].map((n) => (
          <g key={n}>
            <Line
              a={[-0.5 * n - 0.07, n]}
              b={[-0.5 * n + 0.07, n]}
              color="#8056aa"
            />
            <text
              x={x(-0.5 * n) - 40}
              y={y(n) + 9}
              fill="#8056aa"
              fontSize={24}
            >
              {n}
            </text>
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
}: {
  kind: Page["diagram"];
  step: number;
  progress: number;
}) => {
  const negative = kind === "negative" || kind === "negative-question";
  const at: [number, number] = negative ? [-1, -1] : [2, 2];
  const moving =
    kind === "formula"
      ? 1
      : (kind === "positive" || kind === "negative") && step >= 4
        ? progress
        : 0;
  const newAt: [number, number] = [at[0] + at[1] * 0.5 * moving, at[1]];
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
          <line y1={y(n)} y2={y(n)} x1={x(-2)} x2={x(4)} />
        </g>
      ))}
      <Line a={[-2.4, 0]} b={[4.3, 0]} />
      <Line a={[0, -2.3]} b={[0, 3.4]} />
      <text data-diagram-label x={x(4.4)} y={y(0) + 10} fontSize={30}>
        x
      </text>
      <text data-diagram-label x={x(0) - 12} y={y(3.65)} fontSize={30}>
        y
      </text>
      {[-2, -1, 1, 2, 3, 4].map((n) => (
        <text
          key={`x${n}`}
          x={x(n) - 8}
          y={y(0) + 33}
          fontSize={24}
          fill={gray}
        >
          {n}
        </text>
      ))}
      {[-2, -1, 1, 2, 3].map((n) => (
        <text
          key={`y${n}`}
          x={x(0) - 35}
          y={y(n) + 8}
          fontSize={24}
          fill={gray}
        >
          {n}
        </text>
      ))}
      <text x={x(0) - 27} y={y(0) + 32} fontSize={24}>
        O
      </text>
      {kind === "scan" ? (
        <>
          <Line a={[1, -1]} b={[1, 2.5]} color={blue} />
          <Line
            a={[-1 + 2 * progress, -1.7]}
            b={[-1 + 2 * progress, 3]}
            color={orange}
            dashed
          />
          <text data-diagram-label x={85} y={65} fontSize={28} fill={orange}>
            扫描线向右 →
          </text>
          {step >= 3 ? (
            <>
              <Line a={[0.75, -1]} b={[1.625, 2.5]} color={orange} />
              <text
                data-diagram-label
                x={520}
                y={95}
                fontSize={28}
                fill={orange}
              >
                稍微推斜？
              </text>
            </>
          ) : null}
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
              color="#8056aa"
              dashed
            />
          ) : null}
          {step >= 4 ? (
            <Line a={[2, 2]} b={[2 - 3 * progress, 2]} color="#8056aa" dashed />
          ) : null}
          <Point at={[2, 2]} label="P（固定）" />
        </>
      ) : kind === "horizontal-axis" ? (
        <>
          <NewAxes horizontalOnly />
          {[-1, 1, 2].map((n) => (
            <circle key={n} cx={x(n)} cy={y(0)} r={8} fill={blue} />
          ))}
          <text
            data-diagram-label
            x={x(2) - 50}
            y={y(0) - 35}
            fontSize={30}
            fill={blue}
          >
            (2, 0)
          </text>
        </>
      ) : kind === "vertical-axis" ? (
        <>
          <NewAxes />
          <Line
            a={[-1, 2]}
            b={[
              -1 + (step === 1 ? progress : 1),
              2 - 2 * (step === 1 ? progress : 1),
            ]}
            color={orange}
          />
          {step >= 2 ? (
            <Line
              a={[-1, 2]}
              b={[-1 + (step === 2 ? progress : 1), 2]}
              dashed
              color={blue}
            />
          ) : null}
          {step >= 4 ? (
            <Line
              a={[-1, 2]}
              b={[-1, 2 - 2 * (step === 4 ? progress : 1)]}
              dashed
              color={blue}
            />
          ) : null}
          {step >= 5 ? (
            <>
              <Line
                a={[0, 0]}
                b={[-Math.min(1, progress * 2), 0]}
                color={orange}
              />
              {progress > 0.5 ? (
                <Line
                  a={[-1, 0]}
                  b={[-1, Math.min(2, (progress - 0.5) * 4)]}
                  color={orange}
                />
              ) : null}
            </>
          ) : null}
          <Point at={[-1, 2]} label="固定点" />
        </>
      ) : (
        <>
          <Line a={at} b={[at[0], 0]} dashed />
          <Line a={at} b={[0, at[1]]} dashed />
          <Point at={at} label={negative ? "Q (−1, −1)" : "P (2, 2)"} />
          {moving > 0 ? (
            <>
              <Line a={at} b={newAt} color={orange} />
              <Line a={newAt} b={[newAt[0], 0]} color={orange} dashed />
              <Point
                at={newAt}
                label={
                  moving === 1
                    ? negative
                      ? "Q′ (−3/2, −1)"
                      : "P′ (3, 2)"
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
    </svg>
  );
};
