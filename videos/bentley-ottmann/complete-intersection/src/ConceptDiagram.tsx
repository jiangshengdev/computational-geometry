import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import type { AttentionMark } from "../../../shared/speech/teaching-cues";
import { colors, inputColors } from "../../colors.ts";
import { SvgMathText } from "./MathText";
import { labelColor } from "./teaching-colors";

type Point = [number, number];
type Stroke = {
  id: string;
  a: Point;
  b: Point;
  color: string;
  dash?: boolean;
  width?: number;
};
type Dot = { id: string; p: Point; color: string; shared?: boolean };
type Label = { p: Point; text: string };
const [blue, orange] = inputColors;
const ink = "#172c45";
const guide = "#94a3b8";

/** General schematics: no invented numerical inputs or new proof steps. */
function scene(kind: string, step: number) {
  const strokes: Stroke[] = [];
  const dots: Dot[] = [];
  const labels: Label[] = [];
  const line = (
    id: string,
    a: Point,
    b: Point,
    color = guide,
    dash = false,
    width = 4,
  ) => strokes.push({ id, a, b, color, dash, width });
  const dot = (id: string, p: Point, color = ink, shared = false) =>
    dots.push({ id, p, color, shared });
  const label = (p: Point, text: string) => labels.push({ p, text });
  const arrow = (id: string, a: Point, b: Point) => {
    line(id, a, b, guide, false, 2);
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (const sign of [-1, 1])
      line(
        `${id}-${sign}`,
        b,
        [
          b[0] - 12 * Math.cos(angle + sign * 0.5),
          b[1] - 12 * Math.sin(angle + sign * 0.5),
        ],
        guide,
        false,
        2,
      );
  };
  if (kind === "point-gate") {
    dot("same", [200, 140], blue);
    label([200, 85], "A_i=B_i");
    dot("a", [490, 140], blue);
    dot("b", [680, 140], blue);
    line("different", [490, 140], [680, 140], blue);
    label([490, 85], "A_i");
    label([680, 85], "B_i");
    if (step >= 2) {
      for (const [index, x] of [145, 390, 635].entries()) {
        label([x, 290], ["两份都是点", "恰好一份是点", "两份都非点"][index]);
        if (index < 2) dot(`class-${index}-1`, [x, 350], blue);
        else line("class-2-1", [x - 70, 350], [x + 70, 350], blue);
        if (index === 0) dot("class-0-2", [x, 410], orange);
        else line(`class-${index}-2`, [x - 70, 410], [x + 70, 410], orange);
      }
    }
    if (step >= 3) {
      line("point-line-1", [100, 140], [300, 140], guide, true, 2);
      line("point-line-2", [135, 205], [265, 75], guide, true, 2);
      line("unique-line", [435, 140], [740, 140], blue, true, 2);
    }
  } else if (kind === "point-point") {
    label([175, 55], "同位置");
    label([565, 55], "不同位置");
    dot("same", [175, 135], blue, true);
    dot("different-1", [490, 135], blue);
    dot("different-2", [650, 135], orange);
    label([175, 95], "S_1,S_2");
    label([490, 95], "S_1");
    label([650, 95], "S_2");
    if (step >= 2) {
      dot("point-result", [175, 135], colors.violet);
      label([175, 205], "交集：该点");
      label([565, 205], "交集：空");
    }
    if (step >= 3) {
      dot("t", [190, 360], orange);
      label([190, 310], "T");
      line("ef", [400, 360], [680, 360], blue);
      dot("e", [400, 360], blue);
      dot("f", [680, 360], blue);
      label([400, 410], "E");
      label([680, 410], "F");
    }
  } else if (kind === "range") {
    const e: Point = [120, 190],
      f: Point = [430, 75],
      t: Point = [275, 132.5];
    line("ef", e, f, blue);
    dot("e", e, blue);
    dot("f", f, blue);
    dot("t", t, orange);
    label([105, 145], "E");
    label([450, 60], "F");
    label([275, 95], "T");
    if (step >= 2) {
      arrow("x-axis", [70, 265], [485, 265]);
      label([510, 265], "x");
      for (const [id, p] of [
        ["e", e],
        ["f", f],
        ["t", t],
      ] as const) {
        line(`projection-${id}`, p, [p[0], 265], guide, true, 2);
        dot(`x-${id}`, [p[0], 265], id === "t" ? orange : blue);
        label([p[0], 305], `x_${id.toUpperCase()}`);
      }
      line("x-range", [120, 265], [430, 265], blue);
    }
    if (step >= 3) {
      line("vertical", [620, 420], [620, 100], blue);
      dot("vertical-e", [620, 420], blue);
      dot("vertical-f", [620, 100], blue);
      dot("vertical-t", [620, 260], orange);
      label([580, 420], "E");
      label([580, 100], "F");
      label([580, 260], "T");
      arrow("y-axis", [710, 460], [710, 55]);
      label([755, 55], "y");
      for (const [name, y] of [
        ["E", 420],
        ["T", 260],
        ["F", 100],
      ] as const) {
        line(`y-projection-${name}`, [620, y], [710, y], guide, true, 2);
        dot(`y-${name}`, [710, y], name === "T" ? orange : blue);
        label([760, y], `y_${name}`);
      }
      line("y-range", [710, 420], [710, 100], blue);
    }
  } else if (kind === "candidate-range") {
    for (const [index, y] of [145, 375].entries()) {
      if (index === 1 && step < 2) continue;
      const end = index === 0 ? 610 : 340;
      line(`line-${index}-1`, [100, y], [700, y], blue, true, 2);
      line(`line-${index}-2`, [470, y - 85], [470, y + 85], orange, true, 2);
      line(`s1-${index}`, [150, y], [end, y], blue);
      line(`s2-${index}`, [470, y - 60], [470, y + 60], orange);
      dot(`p-${index}`, [470, y], colors.violet);
      dot(`end-${index}`, [end, y], blue);
      label([515, y + 40], "P");
      label([220, y - 45], "S_1");
      label([540, y - 65], "S_2");
      if (index === 1) label([325, y + 65], "一份范围排除 P");
      else if (step >= 3) label([310, y + 95], "两份都通过：交集为 P");
    }
  } else if (kind === "zero-delta") {
    for (const [index, y] of [125, 280].entries()) {
      label([140, y], index === 0 ? "平行" : "重合");
      line(
        `first-${index}`,
        [270, y],
        [690, y],
        blue,
        false,
        index === 1 ? 10 : 4,
      );
      line(
        `second-${index}`,
        [270, index === 0 ? y - 55 : y],
        [690, index === 0 ? y - 55 : y],
        orange,
      );
      if (step >= 2) {
        dot(`a2-${index}`, [420, index === 0 ? y - 55 : y], orange);
        label([420, y - 90], "A_2");
      }
    }
    if (step >= 4) {
      label([140, 435], "唯一交点");
      line("cross-first", [270, 435], [690, 435], blue);
      line("cross-second", [420, 435], [590, 350], orange);
      dot("shared-endpoint", [420, 435], orange);
      label([420, 390], "A_2");
      label([660, 385], "\\Delta\\ne0");
    }
  } else if (kind === "three-outcomes") {
    for (let index = 0; index < Math.min(step, 3); index++) {
      const y = 100 + 155 * index;
      const [left, right] = [
        [480, 300],
        [390, 390],
        [300, 480],
      ][index];
      arrow(`order-${index}`, [130, y], [700, y]);
      line(`lower-${index}`, [left, y], [650, y], blue, false, 10);
      line(`upper-${index}`, [170, y], [right, y], orange);
      dot(`l-${index}`, [left, y], colors.violet);
      dot(`r-${index}`, [right, y], colors.violet);
      label([left, y - 45], index === 1 ? "L=R" : "L");
      if (index !== 1) label([right, y - 45], "R");
      if (index === 1) dot("touch", [left, y], colors.violet);
      if (index === 2)
        line("interval", [left, y], [right, y], colors.violet, false, 6);
      label([410, y + 55], ["交集为空", "交集为点 L", "完整闭区间"][index]);
    }
  }
  return { strokes, dots, labels };
}

export const conceptKinds = new Set([
  "point-gate",
  "point-point",
  "range",
  "candidate-range",
  "zero-delta",
  "three-outcomes",
]);

export function ConceptDiagram({
  kind,
  step,
  target,
  progress,
}: {
  kind: string;
  step: number;
  target: string | null;
  progress: number;
}) {
  const { strokes, dots, labels } = scene(kind, step);
  const stroke = strokes.find((v) => v.id === target);
  const point = dots.find((v) => v.id === target);
  const marks: AttentionMark[] = stroke
    ? [{ kind: "line", from: stroke.a, to: stroke.b, color: stroke.color }]
    : point
      ? [{ kind: "point", at: point.p, color: colors.violet }]
      : [];
  return (
    <svg
      width={800}
      height={520}
      viewBox="0 0 800 520"
      data-concept-diagram={kind}
      role="img"
      aria-label={kind}
    >
      {strokes.map((v) => (
        <line
          key={v.id}
          data-concept-line={v.id}
          x1={v.a[0]}
          y1={v.a[1]}
          x2={v.b[0]}
          y2={v.b[1]}
          stroke={v.color}
          strokeWidth={v.width}
          strokeDasharray={v.dash ? "8 7" : undefined}
        />
      ))}
      {dots.map((v) => (
        <g key={v.id} data-concept-point={v.id}>
          <circle cx={v.p[0]} cy={v.p[1]} r={v.shared ? 9 : 5} fill={v.color} />
          {v.shared ? (
            <circle cx={v.p[0]} cy={v.p[1]} r={4} fill={orange} />
          ) : null}
        </g>
      ))}
      {labels.map((v, i) => (
        <SvgMathText
          key={i}
          x={v.p[0]}
          y={v.p[1]}
          fontSize={27}
          align="center"
          fill={labelColor(v.text)}
        >
          {v.text}
        </SvgMathText>
      ))}
      <AttentionMarks marks={marks} progress={progress} />
    </svg>
  );
}
