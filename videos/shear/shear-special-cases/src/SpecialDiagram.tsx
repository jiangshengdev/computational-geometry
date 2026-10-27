import { useId } from "react";
import { SvgMathText } from "./MathText";
const blue = "#2563a6",
  orange = "#b45309",
  green = "#087f69";
type Point = readonly [number, number];
const x = (v: number) => 90 + 100 * v,
  y = (v: number) => 580 - 100 * v;
export function SpecialDiagram({
  kind,
  page,
  step,
  progress = 1,
}: {
  kind: string;
  page: string;
  step: number;
  progress?: number;
}) {
  const arrow = useId().replace(/:/g, "");
  const point = (p: Point, color: string, r = 7) => (
    <circle cx={x(p[0])} cy={y(p[1])} r={r} fill={color} />
  );
  const line = (
    a: Point,
    b: Point,
    color: string,
    width = 6,
    dash?: string,
  ) => (
    <line
      x1={x(a[0])}
      y1={y(a[1])}
      x2={x(b[0])}
      y2={y(b[1])}
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dash}
      strokeLinecap="round"
    />
  );
  const label = (p: Point, text: string, color = blue, dx = 18, dy = -22) => (
    <SvgMathText x={x(p[0]) + dx} y={y(p[1]) + dy} fill={color}>
      {text}
    </SvgMathText>
  );
  const shifted = (p: Point, t: number): Point => [p[0] + 0.5 * p[1] * t, p[1]];
  const a: Point = [1, 0.5],
    b: Point = [1, 2.5];
  const moving = kind === "vertical" && step >= 2 ? progress : 0;
  const showP = page === "question-order" && step >= 2;
  const showQ = page === "question-order" && step >= 3;
  const coincident = kind === "coincident" || kind === "point";
  const shiftPoint = coincident && step >= (kind === "point" ? 3 : 2);
  const ranges: Record<string, [Point, Point, Point, Point]> = {
    disjoint: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
    touch: [
      [0, 1],
      [2, 1],
      [2, 1],
      [3, 1],
    ],
    overlap: [
      [0, 1],
      [3, 1],
      [1, 1],
      [4, 1],
    ],
    crossing: [
      [0, 1],
      [3, 1],
      [1, 1],
      [4, 1],
    ],
  };
  const rangesForKind = ranges[kind];
  const crossingShift = kind === "crossing" && step >= 2 ? 1 : 0;
  const mapRange = (p: Point) => shifted(p, crossingShift);
  return (
    <svg
      data-special-diagram
      data-kind={kind}
      width={740}
      height={650}
      viewBox="0 0 740 650"
      style={{ overflow: "visible" }}
    >
      <defs>
        <marker
          id={arrow}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="#526579" />
        </marker>
      </defs>
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <g key={n}>
          <line x1={x(n)} x2={x(n)} y1={60} y2={610} stroke="#dce4ec" />
          <SvgMathText x={x(n)} y={625} align="center">
            {String(n)}
          </SvgMathText>
        </g>
      ))}
      {[1, 2, 3, 4, 5].map((n) => (
        <g key={n}>
          <line x1={60} x2={620} y1={y(n)} y2={y(n)} stroke="#dce4ec" />
          <SvgMathText x={57} y={y(n) + 10} align="center">
            {String(n)}
          </SvgMathText>
        </g>
      ))}
      <line
        x1={60}
        x2={625}
        y1={y(0)}
        y2={y(0)}
        stroke="#526579"
        strokeWidth={2}
        markerEnd={`url(#${arrow})`}
      />
      <line
        x1={x(0)}
        x2={x(0)}
        y1={610}
        y2={45}
        stroke="#526579"
        strokeWidth={2}
        markerEnd={`url(#${arrow})`}
      />
      <SvgMathText x={650} y={590}>
        X
      </SvgMathText>
      <SvgMathText x={120} y={45}>
        Y
      </SvgMathText>
      {step >= 1 && (kind === "points" || kind === "vertical") ? (
        <g>
          {kind === "vertical" ? (
            <>
              {line(a, b, "#94a3b8", 3, "8 7")}
              {line(shifted(a, moving), shifted(b, moving), blue)}
            </>
          ) : null}
          {point(a, blue)}
          {point(b, orange)}
          {label(a, "P", blue, -45, 10)}
          {label(b, "Q", orange, -45, 10)}
          {showP || moving > 0 ? (
            <g data-result>
              {point(shifted(a, showP ? 1 : moving), blue)}
              {label(shifted(a, showP ? 1 : moving), "P'", blue, 20, 20)}
            </g>
          ) : null}
          {showQ || moving > 0 ? (
            <g data-result>
              {point(shifted(b, showQ ? 1 : moving), orange)}
              {label(shifted(b, showQ ? 1 : moving), "Q'", orange, 20, -20)}
            </g>
          ) : null}
        </g>
      ) : null}
      {step >= 1 && coincident ? (
        <g>
          {point([1, 1], blue, 11)}
          {point([1, 1], orange, 5)}
          {label([1, 1], kind === "point" ? "两个端点" : "P=Q", blue, -30, -35)}
          {shiftPoint ? (
            <g data-result>
              {line([1, 1], [1.5, 1], "#94a3b8", 2, "4 4")}
              {point([1.5, 1], green, 9)}
              {label(
                [1.5, 1],
                kind === "point" ? "A'=B'" : "P'=Q'",
                green,
                15,
                45,
              )}
            </g>
          ) : null}
        </g>
      ) : null}
      {step >= 1 && kind === "parallel" ? (
        <g>
          {line([0, 1], [4, 1], blue)}
          {line([0, 2], [4, 2], orange)}
          {label([3, 1], "直线一", blue, 0, 45)}
          {label([3, 2], "直线二", orange, 0, -30)}
        </g>
      ) : null}
      {step >= 1 && rangesForKind ? (
        <g>
          {crossingShift ? (
            <>
              {line(rangesForKind[0], rangesForKind[1], "#94a3b8", 2, "6 6")}
              {line([1, 0], [3, 2], "#94a3b8", 2, "6 6")}
            </>
          ) : null}
          {line(
            mapRange(rangesForKind[0]),
            mapRange(rangesForKind[1]),
            blue,
            14,
          )}
          {line(
            mapRange(rangesForKind[2]),
            mapRange(rangesForKind[3]),
            orange,
            6,
          )}
          {[...rangesForKind].map((p, i) => (
            <g key={i}>{point(mapRange(p), i < 2 ? blue : orange, 6)}</g>
          ))}
          <SvgMathText x={130} y={100} fill={blue}>
            粗线：输入一
          </SvgMathText>
          <SvgMathText x={130} y={145} fill={orange}>
            细线：输入二
          </SvgMathText>
          {kind === "touch" ? point([2, 1], green, 9) : null}
          {kind === "overlap" || kind === "crossing" ? (
            <>
              {line(mapRange([1, 1]), mapRange([3, 1]), green, 3)}
              {label(mapRange([2, 1]), "公共区间", green, -60, 55)}
            </>
          ) : null}
          {kind === "crossing" ? (
            <>
              {line(mapRange([1, 0]), mapRange([3, 2]), "#7c3aed", 5)}
              {step >= 2 ? (
                <g data-result>
                  {point([2, 1], green, 9)}
                  {label([2, 1], "R", green, -35, -25)}
                  {point([2.5, 1], green, 7)}
                  {label([2.5, 1], "R'", green, 15, -25)}
                </g>
              ) : null}
            </>
          ) : null}
        </g>
      ) : null}
      {step >= 1 && kind === "point-lines" ? (
        <g>
          {line([0, 1], [4, 1], "#94a3b8", 3)}
          {line([1, 0], [1, 4], "#94a3b8", 3)}
          {line([0, 0], [4, 4], "#94a3b8", 3)}
          {point([1, 1], blue, 9)}
          {label([1, 1], "一个点", blue, 25, -35)}
        </g>
      ) : null}
    </svg>
  );
}
