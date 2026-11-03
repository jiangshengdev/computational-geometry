import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import { colors, inputColors } from "../../colors.ts";
import { SvgMathText } from "./MathText";
import type { AttentionMark } from "../../../shared/speech/teaching-cues";
import { labelColor } from "./teaching-colors";

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

/** As in intersection-goals, inputs and their result have independent views. */
function VerticalBoundsPanels({
  segments,
  labels,
  target,
  progress,
}: {
  segments: Segment[];
  labels: Label[];
  target: string | null;
  progress: number;
}) {
  const panels = [
    {
      id: "s1",
      title: "输入 S_1",
      points: [
        { id: "a1", p: [2, 3] as Point, text: "A_1=(2,3)", dy: -30 },
        { id: "b1", p: [2, 0] as Point, text: "B_1=(2,0)", dy: 45 },
      ],
    },
    {
      id: "s2",
      title: "输入 S_2",
      points: [
        { id: "a2", p: [2, 1] as Point, text: "A_2=(2,1)", dy: 35 },
        { id: "a1", p: [2, 3] as Point, text: "B_2=(2,3)", dy: -30 },
      ],
    },
    {
      id: "result",
      title: "完整交集",
      points: labels
        .filter((v) => v.id === "l" || v.id === "r")
        .map((v) => ({
          ...v,
          text: v.id === "l" ? "L=(2,1)" : "R=(2,3)",
          dy: v.id === "l" ? 35 : -30,
        })),
    },
  ];
  return (
    <svg
      width={800}
      height={520}
      viewBox="0 0 800 520"
      data-intersection-diagram="vertical-bounds"
    >
      {panels.map((panel, index) => {
        // WebKit does not reliably translate foreignObject math with a parent g.
        // Keep labels, geometry and attention marks in the root SVG coordinates.
        const offset = index * 265;
        const project = ([x, y]: Point): Point => [
          offset + 40 + 60 * x,
          350 - 60 * y,
        ];
        const segment = segments.find((v) => v.id === panel.id);
        const point = panel.points.find((v) => v.id === target);
        const marks: AttentionMark[] =
          segment?.id === target
            ? [
                {
                  kind: "line",
                  from: segment.a,
                  to: segment.b,
                  color: segment.color,
                },
              ]
            : point
              ? [
                  {
                    kind: "point",
                    at: point.p,
                    color:
                      panel.id === "result" ? result : labelColor(point.text),
                  },
                ]
              : [];
        return (
          <g key={panel.id}>
            <SvgMathText x={offset + 140} y={65} fontSize={27} align="center">
              {panel.title}
            </SvgMathText>
            <path
              d={`M${offset + 20} 350 H${offset + 245} M${offset + 40} 425 V105`}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={2}
            />
            <path
              d={`M${offset + 245} 350 l-12 -6 v12 Z M${offset + 40} 105 l-6 12 h12 Z`}
              fill="#94a3b8"
            />
            <SvgMathText x={offset + 235} y={380} fontSize={24}>
              x
            </SvgMathText>
            <SvgMathText x={offset + 15} y={110} fontSize={24}>
              y
            </SvgMathText>
            <SvgMathText x={offset + 15} y={380} fontSize={24}>
              O
            </SvgMathText>
            {[1, 2, 3].map((v) => (
              <path
                key={v}
                d={`M${offset + 35} ${350 - 60 * v} h10`}
                stroke="#94a3b8"
              />
            ))}
            {[1, 2, 3].map((v) => (
              <path
                key={v}
                d={`M${offset + 40 + 60 * v} 345 v10`}
                stroke="#94a3b8"
              />
            ))}
            {segment ? (
              <line
                data-segment={segment.id}
                x1={project(segment.a)[0]}
                y1={project(segment.a)[1]}
                x2={project(segment.b)[0]}
                y2={project(segment.b)[1]}
                stroke={segment.color}
                strokeWidth={4}
              />
            ) : null}
            {panel.points.map((v) => {
              const [x, y] = project(v.p);
              const color = labelColor(v.text);
              return (
                <g key={v.id} data-point={v.id}>
                  <circle cx={x} cy={y} r={5} fill={color} />
                  <SvgMathText
                    x={x}
                    y={y + v.dy}
                    fontSize={25}
                    align="center"
                    fill={color}
                  >
                    {v.text}
                  </SvgMathText>
                </g>
              );
            })}
            <AttentionMarks
              marks={marks}
              project={project}
              progress={progress}
            />
          </g>
        );
      })}
    </svg>
  );
}

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
  const selected = (id: string, at: number) =>
    step > at || (step === at && reached.includes(id));
  const segments = c.segments.filter((v) =>
    v.id === "result" ? selected(v.id, v.at) : step >= v.at,
  );
  const labels = c.labels.filter((v) =>
    v.id === "l" || v.id === "r" ? selected(v.id, v.at) : step >= v.at,
  );
  if (kind === "vertical-bounds")
    return (
      <VerticalBoundsPanels
        segments={segments}
        labels={labels}
        target={target}
        progress={progress}
      />
    );
  if (kind === "select-bounds")
    return (
      <div style={{ display: "flex", flexDirection: "column", width: 800 }}>
        <CasePanel
          kind={kind}
          mode="inputs"
          segments={segments.filter((v) => v.id !== "result")}
          labels={labels.filter((v) => v.id !== "l" && v.id !== "r")}
          target={target}
          progress={progress}
        />
        <CasePanel
          kind={kind}
          mode="result"
          segments={segments.filter((v) => v.id === "result")}
          labels={labels
            .filter((v) => v.id === "l" || v.id === "r")
            .map((v) => ({ ...v, dx: 0, dy: -35 }))}
          target={target}
          progress={progress}
        />
      </div>
    );
  return (
    <CasePanel
      kind={kind}
      segments={segments}
      labels={labels}
      target={target}
      progress={progress}
    />
  );
}

/** Shared coordinate drawing; split views retain the same scale and cue targets. */
function CasePanel({
  kind,
  segments,
  labels,
  target,
  progress,
  mode,
}: {
  kind: string;
  segments: Segment[];
  labels: Label[];
  target: string | null;
  progress: number;
  mode?: "inputs" | "result";
}) {
  const baseline = mode ? 180 : 335;
  const height = mode ? 300 : 520;
  const axisTop = mode ? 70 : 40;
  const axisBottom = mode ? 270 : 470;
  const project = ([x, y]: Point): Point => [85 + 80 * x, baseline - 80 * y];
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
      height={height}
      viewBox={`0 0 800 ${height}`}
      data-intersection-diagram={kind}
    >
      {mode ? (
        <SvgMathText x={390} y={30} fontSize={27} align="center">
          {mode === "inputs" ? "输入范围" : "完整交集"}
        </SvgMathText>
      ) : null}
      <path
        d={`M45 ${baseline} H700 M85 ${axisBottom} V${axisTop}`}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={2}
      />
      <path
        d={`M700 ${baseline} l-14 -7 v14 Z M85 ${axisTop} l-7 14 h14 Z`}
        fill="#94a3b8"
      />
      <SvgMathText x={715} y={baseline + 10} fontSize={27}>
        x
      </SvgMathText>
      <SvgMathText x={60} y={axisTop + 8} fontSize={27}>
        y
      </SvgMathText>
      <SvgMathText x={25} y={baseline + 35} fontSize={27}>
        O
      </SvgMathText>
      {[1, 2, 3, 4, 5, 6].map((v) => (
        <path
          key={`x${v}`}
          d={`M${85 + 80 * v} ${baseline - 5} v10`}
          stroke="#94a3b8"
        />
      ))}
      {(mode ? [-1, 1] : [-1, 1, 2, 3]).map((v) => (
        <path
          key={`y${v}`}
          d={`M80 ${baseline - 80 * v} h10`}
          stroke="#94a3b8"
        />
      ))}
      {segments.map((v) => {
        const [x1, y1] = project(v.a),
          [x2, y2] = project(v.b);
        const width =
          mode === "inputs" && v.id === "s1" ? 8 : mode === "result" ? 6 : 4;
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
              <circle cx={x} cy={y} r={5} fill={labelColor(v.text)} />
            )}
            <SvgMathText
              x={x + (v.dx ?? 0)}
              y={y + (v.dy ?? 0)}
              fontSize={27}
              align="center"
              fill={labelColor(v.text)}
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
