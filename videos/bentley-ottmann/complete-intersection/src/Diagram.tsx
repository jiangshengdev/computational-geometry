import { colors } from "../../colors.ts";
import {
  CoordinateDiagram,
  type DiagramSegment,
} from "../../../shared/ui/CoordinateDiagram";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import {
  point,
  stroke,
  type AttentionMark,
} from "../../../shared/speech/teaching-cues";
import { SvgMathText } from "./MathText";

type Point = [number, number];
type Label = {
  at: Point;
  text: string;
  dy?: number;
  dx?: number;
  color?: string;
};
type Case = {
  segments: DiagramSegment[];
  labels: Label[];
  targets: Record<string, AttentionMark[]>;
  result?: { from: Point; to: Point; showAt: number; revealAt?: number };
  coincident?: boolean;
  caption?: string;
};

const project = ([x, y]: Point): Point => [52 + 40 * x, 160 - 40 * y];
const segment = (
  start: Point,
  end: Point,
  color: string,
  pointInput = false,
): DiagramSegment => ({ start, end, color, pointInput });
const endpoint = (at: Point, text: string, color: string, dy = -17): Label => ({
  at,
  text,
  color,
  dy,
});
const tag = (
  x: number,
  y: number,
  text: string,
  color = colors.text,
  size = 14,
) => (
  <SvgMathText
    x={x}
    y={y}
    fontSize={size}
    fill={color}
    align="center"
  >{`$${text}$`}</SvgMathText>
);

/** Reading-preview cues only. Their progress is not a measured narration time. */
export function Diagram({
  scene,
  focus,
  progress,
  step,
}: {
  scene: string;
  focus?: string;
  progress: number;
  step: number;
}) {
  const phase = focus ? Math.max(0, Math.min(1, progress)) : 1;
  const data = getCase(scene, focus, phase);
  if (!data) return null;
  const branchLabel: Record<string, string> = {
    collinear: "等式成立：共线分支",
    parallel: "另一分支：不同的平行线",
    "overlap-empty": "边界顺序：后面 → 空",
    "overlap-touch": "另一情形：同点 → 点交集",
    "overlap-full": "另一情形：前面 → 完整区间",
  };
  const marks = focus ? (data.targets[focus] ?? []) : [];
  const activeIndex = Math.min(
    marks.length - 1,
    Math.floor(phase * marks.length),
  );
  const selected = marks[activeIndex];
  const cueProgress = phase === 1 ? 1 : phase * marks.length - activeIndex;
  const result =
    data.result &&
    step >= data.result.showAt &&
    phase >= (data.result.revealAt ?? 0)
      ? data.result
      : undefined;
  return (
    <svg
      width={760}
      height={560}
      viewBox="0 0 380 280"
      aria-label="两份输入的完整交集示意"
      data-diagram-scene={scene}
    >
      {branchLabel[scene] ? (
        <foreignObject x={90} y={0} width={280} height={30}>
          <div style={{ fontSize: 12, color: colors.text, textAlign: "right" }}>
            {branchLabel[scene]}
          </div>
        </foreignObject>
      ) : null}
      <g transform="translate(10 10)">
        <CoordinateDiagram
          segments={data.segments}
          label={(x, y, text) =>
            tag(x, text === "y" ? y + 10 : y, text, colors.axis, 12)
          }
        />
        {tag(42, 179, "O", colors.axis, 12)}
        {[1, 2, 3, 4, 5, 6].map((x) => (
          <path
            key={`x-${x}`}
            d={`M${52 + 40 * x} 157 v6`}
            stroke={colors.axis}
          />
        ))}
        {[-1, 1, 2, 3].map((y) => (
          <path
            key={`y-${y}`}
            d={`M49 ${160 - 40 * y} h6`}
            stroke={colors.axis}
          />
        ))}
        {data.caption ? (
          <SvgMathText x={180} y={214} fontSize={14} align="center">
            {data.caption}
          </SvgMathText>
        ) : null}
        <SvgMathText x={180} y={260} fontSize={12} align="center">
          一般示意 · 坐标轴等比例
        </SvgMathText>
        {data.coincident && data.segments[1]
          ? (() => {
              const s = data.segments[1];
              const [x1, y1] = project(s.start),
                [x2, y2] = project(s.end);
              return (
                <g fill={s.color}>
                  <circle cx={x1} cy={y1} r={4} />
                  <circle cx={x2} cy={y2} r={4} />
                </g>
              );
            })()
          : null}
        {result
          ? (() => {
              const [x1, y1] = project(result.from),
                [x2, y2] = project(result.to);
              return (
                <g data-intersection-result>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={colors.emerald}
                    strokeWidth={2}
                  />
                  <circle cx={x1} cy={y1} r={3} fill={colors.emerald} />
                  <circle cx={x2} cy={y2} r={3} fill={colors.emerald} />
                </g>
              );
            })()
          : null}
        {selected ? (
          <AttentionMarks
            marks={[selected]}
            progress={cueProgress}
            project={project}
            scale={2}
          />
        ) : null}
        {data.labels.map(
          ({ at, text, dy = -17, dx = 0, color = colors.text }, index) => {
            const [x, y] = project(at);
            return <g key={index}>{tag(x + dx, y + dy, text, color)}</g>;
          },
        )}
      </g>
    </svg>
  );
}

function getCase(
  scene: string,
  focus: string | undefined,
  progress: number,
): Case | undefined {
  const blue = colors.blue,
    orange = colors.orange,
    green = colors.emerald;
  const a: Point = [5, 1],
    b: Point = [1, 1],
    c: Point = [3, 1],
    d: Point = [6, 1];
  const overlap = (): Case => ({
    // A dashed identity layer preserves both inputs at their real shared position.
    segments: [segment(a, b, blue), { ...segment(c, d, orange), dashed: true }],
    labels: [
      endpoint(a, "A_1", blue),
      endpoint(b, "B_1", blue),
      endpoint(c, "A_2", orange, 29),
      endpoint(d, "B_2", orange, 29),
    ],
    coincident: true,
    targets: {},
  });
  if (scene === "input-pair") {
    const a2: Point = [2, -1],
      b2: Point = [5, 3];
    const revealSecond = progress >= 0.5;
    return {
      segments: [
        segment(a, b, blue),
        ...(revealSecond ? [segment(a2, b2, orange)] : []),
      ],
      labels: [
        endpoint(a, "A_1", blue),
        endpoint(b, "B_1", blue),
        ...(revealSecond
          ? [endpoint(a2, "A_2", orange, 29), endpoint(b2, "B_2", orange)]
          : []),
      ],
      targets: {
        endpoints: [
          point(...a, blue),
          point(...b, blue),
          point(...a2, orange),
          point(...b2, orange),
        ],
      },
    };
  }
  if (
    scene === "point-line" ||
    scene === "point-range-x" ||
    scene === "point-range-y"
  ) {
    const vertical = scene === "point-range-y";
    const outside = focus === "outside-line" || focus === "extension";
    const e: Point = vertical ? [3, 3] : a;
    const f: Point = vertical ? [3, -1] : b;
    const t: Point = focus === "extension" ? [6, 1] : outside ? [3, 2] : c;
    return {
      segments: [
        {
          ...segment(
            vertical ? [3, -1.5] : [0.5, 1],
            vertical ? [3, 3.3] : [6.5, 1],
            colors.axis,
          ),
          dashed: true,
        },
        segment(e, f, blue),
        segment(t, t, orange, true),
      ],
      labels: [
        endpoint(e, "E", blue, vertical ? -14 : -17),
        endpoint(f, "F", blue, vertical ? 29 : -17),
        {
          ...endpoint(t, "T", orange, vertical ? 0 : -17),
          dx: vertical ? 25 : 0,
        },
      ],
      targets: {
        "name-points": [
          point(...t, orange),
          point(...e, blue),
          point(...f, blue),
        ],
        collinearity: [stroke(...e, ...f, blue), point(...t, orange)],
        "outside-line": [point(...t, orange)],
        extension: [point(...t, orange)],
        "range-x": [point(...f, blue), point(...e, blue), point(...t, orange)],
        "range-y": [point(...f, blue), point(...e, blue), point(...t, orange)],
      },
      caption: outside
        ? focus === "extension"
          ? "情形二：点在延长线上"
          : "情形一：点在直线外"
        : undefined,
    };
  }
  if (scene === "candidate" || scene === "axis-crossing") {
    const contact = scene === "axis-crossing";
    const a1: Point = [1, 1],
      b1: Point = contact ? [4, 1] : [3, 1];
    const a2: Point = contact ? [4, 1] : [5, -1],
      b2: Point = [5, 3];
    if (contact) b2[0] = 4;
    const p: Point = contact ? [4, 1] : [5, 1];
    return {
      segments: [
        { ...segment([0.5, 1], [6.5, 1], colors.axis), dashed: true },
        segment(a1, b1, blue),
        segment(a2, b2, orange),
      ],
      labels: [
        endpoint(a1, "A_1", blue),
        endpoint(b1, "B_1", blue, 29),
        ...(contact ? [] : [endpoint(a2, "A_2", orange, 29)]),
        endpoint(b2, "B_2", orange),
        {
          ...endpoint(p, contact ? "A_2=P" : "P", green),
          dx: contact ? 35 : 20,
        },
      ],
      targets: {
        "check-both": [
          stroke(...a1, ...b1, blue),
          point(...p, green),
          stroke(...a2, ...b2, orange),
        ],
        "only-candidate": [point(...p, green)],
        "closed-endpoint": [
          stroke(...a1, ...b1, blue),
          stroke(...a2, ...b2, orange),
          point(...p, green),
        ],
      },
      result: contact
        ? { from: p, to: p, showAt: 1, revealAt: 2 / 3 }
        : undefined,
    };
  }
  if (scene === "parallel") {
    const a2: Point = [2, 2.5],
      b2: Point = [6, 2.5];
    return {
      segments: [segment(b, a, blue), segment(a2, b2, orange)],
      labels: [
        endpoint(b, "A_1", blue),
        endpoint(a, "B_1", blue),
        endpoint(a2, "A_2", orange),
        endpoint(b2, "B_2", orange),
      ],
      targets: {
        "separate-lines": [
          stroke(...b, ...a, blue),
          point(...a2, orange),
          stroke(...a2, ...b2, orange),
        ],
      },
    };
  }
  if (
    scene === "collinear" ||
    scene === "overlap-select" ||
    scene === "overlap-full"
  ) {
    const data = overlap();
    data.targets = {
      "shared-endpoint": [point(...c, orange), stroke(...b, ...a, blue)],
      "sort-endpoints": [
        point(...b, blue),
        point(...a, blue),
        point(...c, orange),
        point(...d, orange),
      ],
      "choose-boundaries": [
        point(...b, blue),
        point(...c, orange),
        point(...c, green),
        point(...a, blue),
        point(...d, orange),
        point(...a, green),
      ],
      "whole-interval": [
        point(...c, green),
        point(...a, green),
        stroke(...c, ...a, green),
      ],
    };
    if (
      scene === "overlap-full" ||
      (scene === "overlap-select" && !focus) ||
      (focus === "choose-boundaries" && progress >= 2 / 6)
    )
      data.labels.push(endpoint(c, "L", green, -17));
    if (
      scene === "overlap-full" ||
      (scene === "overlap-select" && !focus) ||
      (focus === "choose-boundaries" && progress >= 5 / 6)
    )
      data.labels.push(endpoint(a, "R", green, 29));
    if (scene === "overlap-full")
      data.result = { from: c, to: a, showAt: 1, revealAt: 2 / 3 };
    return data;
  }
  if (scene === "overlap-empty" || scene === "overlap-touch") {
    const touch = scene === "overlap-touch";
    const r: Point = [3, 1],
      l: Point = [touch ? 3 : 4.5, 1];
    return {
      segments: [segment(b, r, blue), segment(l, d, orange)],
      labels: [
        endpoint(b, "B_1", blue),
        endpoint(d, "B_2", orange),
        endpoint(r, touch ? "A_1=A_2" : "A_1", blue),
        ...(!touch ? [endpoint(l, "A_2", orange)] : []),
        endpoint(r, touch ? "L=R" : "R", green, 29),
        ...(!touch ? [endpoint(l, "L", green, 29)] : []),
      ],
      targets: {
        "reversed-boundaries": [point(...l, green), point(...r, green)],
        "same-boundary": [point(...r, green)],
      },
      result: touch ? { from: r, to: r, showAt: 1 } : undefined,
    };
  }
  return undefined;
}
