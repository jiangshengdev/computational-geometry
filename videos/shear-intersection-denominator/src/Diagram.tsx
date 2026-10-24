import { SvgMathText } from "./MathText";

const blue = "#2563eb",
  purple = "#7c3db5";
const unit = 300;
const project = (x: number, y: number) => ({
  x: 240 + unit * x,
  y: 540 - unit * y,
});
const ticks = [0, 1];
export function Diagram({ page, step }: { page: string; step: number }) {
  const first = page !== "lines" || step >= 1;
  const second = page !== "lines" || step >= 2;
  const solved = page === "verify" || (page === "ordinate" && step >= 4);
  const line = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
  ) => {
    const a = project(x1, y1),
      b = project(x2, y2);
    return (
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={color}
        strokeWidth={4}
      />
    );
  };
  return (
    <svg
      width={820}
      height={700}
      data-coordinate-diagram
      data-unit-x={unit}
      data-unit-y={unit}
    >
      <rect x={90} y={90} width={600} height={600} rx={8} fill="#eef3f8" />
      {[-0.5, 0, 0.5, 1, 1.5].map((t) => (
        <g key={t} stroke="#dce4ec">
          <line x1={project(t, 0).x} x2={project(t, 0).x} y1={90} y2={690} />
          <line y1={project(0, t).y} y2={project(0, t).y} x1={90} x2={690} />
        </g>
      ))}
      {line(-0.5, 0, 1.5, 0, "#8798aa")}
      {line(0, -0.5, 0, 1.5, "#8798aa")}
      <SvgMathText x={720} y={550}>
        X
      </SvgMathText>
      <SvgMathText x={240} y={68} align="center">
        Y
      </SvgMathText>
      {ticks.map((t) => (
        <g key={t}>
          <SvgMathText x={project(t, 0).x} y={590} align="center">
            {t}
          </SvgMathText>
          {t !== 0 ? (
            <SvgMathText x={210} y={project(0, t).y + 10} align="right">
              {t}
            </SvgMathText>
          ) : null}
        </g>
      ))}
      {first ? (
        <g>
          {line(-0.5, 1.5, 1.5, -0.5, blue)}
          {[
            [0, 1],
            [1, 0],
          ].map(([x, y]) => (
            <circle
              key={x}
              data-endpoint
              cx={project(x, y).x}
              cy={project(x, y).y}
              r={7}
              fill={blue}
            />
          ))}
          <SvgMathText x={105} y={145} fill={blue}>
            X+Y=1
          </SvgMathText>
        </g>
      ) : null}
      {second ? (
        <g>
          {line(-0.5, -0.5, 1.5, 1.5, purple)}
          {[
            [0, 0],
            [1, 1],
          ].map(([x, y]) => (
            <circle
              key={x}
              data-endpoint
              cx={project(x, y).x}
              cy={project(x, y).y}
              r={7}
              fill={purple}
            />
          ))}
          <SvgMathText x={540} y={145} fill={purple}>
            X−Y=0
          </SvgMathText>
        </g>
      ) : null}
      {first && second ? (
        <circle data-intersection cx={390} cy={390} r={8} fill="#b45309" />
      ) : null}
      {solved ? (
        <g data-answer-label>
          <path
            d="M390 540V390H240"
            fill="none"
            stroke="#b45309"
            strokeDasharray="8 6"
            strokeWidth={2}
          />
          <SvgMathText x={430} y={370} fill="#b45309">
            P=(1/2,1/2)
          </SvgMathText>
        </g>
      ) : null}
    </svg>
  );
}
