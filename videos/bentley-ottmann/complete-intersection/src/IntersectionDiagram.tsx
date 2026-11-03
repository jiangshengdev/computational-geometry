import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import { colors, inputColors } from "../../colors.ts";
import { SvgMathText } from "./MathText";
import type { AttentionMark } from "../../../shared/speech/teaching-cues";

type Point = [number, number];
type Segment = {
  id: string;
  a: Point;
  b: Point;
  color: string;
  at: number;
  dash?: boolean;
};
type Label = {
  id: string;
  p: Point;
  text: string;
  at: number;
  dx?: number;
  dy?: number;
};
type Case = { segments: Segment[]; labels: Label[] };
const blue = inputColors[0],
  orange = inputColors[1],
  result = colors.violet;
const s = (id: string, a: Point, b: Point, color: string, at = 1): Segment => ({
  id,
  a,
  b,
  color,
  at,
});
const l = (
  id: string,
  p: Point,
  text: string,
  at = 1,
  dx = 0,
  dy = 35,
): Label => ({ id, p, text, at, dx, dy });
export const cases: Record<string, Case> = {
  inputs: {
    segments: [s("s1", [0, 0], [4, 0], blue), s("s2", [2, -1], [2, 1], orange)],
    labels: [
      l("a1", [0, 0], "A_1", 2, 0, -25),
      l("b1", [4, 0], "B_1", 2),
      l("a2", [2, -1], "A_2", 2),
      l("b2", [2, 1], "B_2", 2, 0, -25),
    ],
  },
  "point-cases": {
    segments: [
      s("ef", [0, 0], [4, 0], blue),
      { ...s("extension", [4, 0], [5.5, 0], blue, 2), dash: true },
    ],
    labels: [
      l("e", [0, 0], "E=(0,0)", 1, 50, 50),
      l("f", [4, 0], "F=(4,0)", 1, 0, 50),
      l("off", [2, 1], "T_1=(2,1)", 1, 0, -25),
      l("outside", [5, 0], "T_2=(5,0)", 2, 10, -30),
      l("third", [4, 0], "T_3=F", 3, 0, -85),
    ],
  },
  "axis-case": {
    segments: [s("s1", [0, 0], [4, 0], blue), s("s2", [2, -1], [2, 1], orange)],
    labels: [
      l("a1", [0, 0], "(0,0)", 1, 55, 50),
      l("b1", [4, 0], "(4,0)", 1, 0, 50),
      l("a2", [2, -1], "(2,-1)", 1),
      l("b2", [2, 1], "(2,1)", 1, 0, -25),
      l("p", [2, 0], "P=(2,0)", 3, 125, -35),
    ],
  },
  "outside-candidate": {
    segments: [
      s("s1", [0, 0], [4, 0], blue),
      s("s2", [5, -1], [5, 1], orange),
      { ...s("extension", [4, 0], [5.5, 0], blue, 2), dash: true },
    ],
    labels: [
      l("a1", [0, 0], "(0,0)", 1, 55, 50),
      l("b1", [4, 0], "(4,0)", 1, -30, 50),
      l("a2", [5, -1], "(5,-1)", 1),
      l("b2", [5, 1], "(5,1)", 1, 0, -25),
      l("p", [5, 0], "P=(5,0)", 2, 125, -12),
    ],
  },
  parallel: {
    segments: [s("s1", [0, 0], [4, 0], blue), s("s2", [0, 1], [4, 1], orange)],
    labels: [
      l("a1", [0, 0], "(0,0)", 1, 55, 50),
      l("b1", [4, 0], "(4,0)", 1, 0, 50),
      l("a2", [0, 1], "A_2=(0,1)", 1, 100, -30),
      l("b2", [4, 1], "(4,1)", 1, 0, -30),
    ],
  },
  "select-bounds": {
    segments: [
      s("s1", [0, 0], [4, 0], blue),
      s("s2", [2, 0], [6, 0], orange),
      s("result", [2, 0], [4, 0], result, 4),
    ],
    labels: [
      l("a1", [0, 0], "A_1=(0,0)", 1, 50, -40),
      l("b1", [4, 0], "B_1=(4,0)", 1, 0, -40),
      l("a2", [2, 0], "A_2=(2,0)", 1, 0, 50),
      l("b2", [6, 0], "B_2=(6,0)", 1, -30, 50),
      l("l", [2, 0], "L", 2, 0, -35),
      l("r", [4, 0], "R", 3, 0, 50),
    ],
  },
  "vertical-bounds": {
    segments: [
      s("s1", [2, 3], [2, 0], blue),
      s("s2", [2, 1], [2, 3], orange),
      s("result", [2, 1], [2, 3], result, 2),
    ],
    labels: [
      l("a1", [2, 3], "A_1=B_2=(2,3)", 1, 175, -5),
      l("b1", [2, 0], "B_1=(2,0)", 1, 140, 55),
      l("a2", [2, 1], "A_2=(2,1)", 1, 140, 10),
      l("l", [2, 1], "L", 2, -45, 10),
      l("r", [2, 3], "R", 2, -45, 10),
    ],
  },
};

/** 80 logical pixels per unit on both axes. Overlapping inputs stay in place. */
export function IntersectionDiagram({
  kind,
  step,
  target,
  progress,
  reached,
}: {
  kind: string;
  step: number;
  target: string | null;
  progress: number;
  reached: string[];
}) {
  const c = cases[kind];
  const project = ([x, y]: Point): Point => [85 + 80 * x, 335 - 80 * y];
  const selected = (id: string, at: number) =>
    step > at || (step === at && reached.includes(id));
  const segments = c.segments.filter((v) =>
    v.id === "result" ? selected(v.id, v.at) : step >= v.at,
  );
  const labels = c.labels.filter((v) =>
    v.id === "l" || v.id === "r" ? selected(v.id, v.at) : step >= v.at,
  );
  const segment = segments.find((v) => v.id === target);
  const point = labels.find((v) => v.id === target);
  const marks: AttentionMark[] = segment
    ? [{ kind: "line", from: segment.a, to: segment.b, color: segment.color }]
    : point
      ? [{ kind: "point", at: point.p, color: result }]
      : [];
  return (
    <svg
      width={800}
      height={520}
      viewBox="0 0 800 520"
      data-intersection-diagram={kind}
    >
      <path
        d="M45 335 H700 M85 470 V40"
        fill="none"
        stroke="#94a3b8"
        strokeWidth={2}
      />
      <path d="M700 335 l-14 -7 v14 Z M85 40 l-7 14 h14 Z" fill="#94a3b8" />
      <SvgMathText x={715} y={345} fontSize={27}>
        x
      </SvgMathText>
      <SvgMathText x={60} y={48} fontSize={27}>
        y
      </SvgMathText>
      <SvgMathText x={25} y={370} fontSize={27}>
        O
      </SvgMathText>
      {[1, 2, 3, 4, 5, 6].map((v) => (
        <path key={`x${v}`} d={`M${85 + 80 * v} 330 v10`} stroke="#94a3b8" />
      ))}
      {[-1, 1, 2, 3].map((v) => (
        <path key={`y${v}`} d={`M80 ${335 - 80 * v} h10`} stroke="#94a3b8" />
      ))}
      {segments.map((v) => {
        const [x1, y1] = project(v.a),
          [x2, y2] = project(v.b);
        // Nested strokes expose both input identities without shifting geometry.
        const shared = kind === "select-bounds" || kind === "vertical-bounds";
        const width = v.id === "result" ? 4 : shared && v.id === "s1" ? 10 : 4;
        return (
          <g key={v.id} data-segment={v.id}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={v.color}
              strokeWidth={width}
              strokeDasharray={v.dash ? "8 7" : undefined}
            />
            {!v.dash ? (
              <>
                <circle cx={x1} cy={y1} r={5} fill={v.color} />
                <circle cx={x2} cy={y2} r={5} fill={v.color} />
              </>
            ) : null}
          </g>
        );
      })}
      {labels.map((v) => {
        const [x, y] = project(v.p);
        return (
          <g key={v.id} data-point={v.id}>
            {kind === "point-cases" &&
            ["off", "outside", "third"].includes(v.id) ? (
              <path d={`M${x} ${y - 8} l8 8 l-8 8 l-8 -8 Z`} fill={orange} />
            ) : (
              <circle
                cx={x}
                cy={y}
                r={5}
                fill={v.id === "p" ? result : "#172c45"}
              />
            )}
            <SvgMathText
              x={x + (v.dx ?? 0)}
              y={y + (v.dy ?? 0)}
              fontSize={27}
              align="center"
            >
              {v.text}
            </SvgMathText>
          </g>
        );
      })}
      <AttentionMarks marks={marks} project={project} progress={progress} />
    </svg>
  );
}
