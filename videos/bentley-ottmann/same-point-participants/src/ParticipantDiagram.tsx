import { useId } from "react";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import {
  point,
  stroke,
  type AttentionMark,
} from "../../../shared/speech/teaching-cues";
import { SvgMathText as Label } from "./MathText";
import {
  CollectionDiagram,
  EventRecordDiagram,
  PointMembership,
  RoleDiagram,
} from "./ParticipantFlows";
import { colors } from "../../colors.ts";
import { objectColors } from "./teaching-colors";
import type { DiagramKind } from "./storyboard";

type State = {
  page: string;
  kind: DiagramKind;
  visibleStep: number;
  target: string | null;
  progress: number;
  reached: string[];
  reachedCaption: number | null;
  thinking: boolean;
};
import { inputs, type Name } from "./example.ts";
const ink = "#172c45";
const muted = "#94a3b8";

/** Exact article coordinates, with equal X/Y units and unchanged input identities. */
function Geometry({
  names,
  target: requestedTarget,
  progress,
  compact = false,
  title,
}: {
  names: Name[];
  target: string | null;
  progress: number;
  compact?: boolean;
  title?: string;
}) {
  const target =
    (requestedTarget === "CZ1" && !names.includes("Z_1")) ||
    (requestedTarget === "CZ2" && !names.includes("Z_2")) ||
    (requestedTarget === "AZ1" && !names.includes("A")) ||
    (requestedTarget === "BZ1" && !names.includes("B"))
      ? null
      : requestedTarget;
  const uid = useId().replace(/:/g, "");
  const unit = compact ? 27 : 44;
  const width = compact ? 365 : 780;
  const height = compact ? 440 : 610;
  const x = (v: number) => (compact ? 42 : 90) + unit * v;
  const y = (v: number) => (compact ? 365 : 510) - unit * v;
  const marks: AttentionMark[] = [];
  for (const name of names) {
    if (
      target === name ||
      target?.includes(name.replace("_", "")) ||
      (target === "AB" && ["A", "B"].includes(name)) ||
      (target === "AC" && ["A", "C"].includes(name)) ||
      (target === "BD" && ["B", "D"].includes(name)) ||
      (target === "ABC" && name !== "D") ||
      (target === "points" && name.startsWith("Z"))
    ) {
      const input = inputs[name];
      marks.push(
        name.startsWith("Z")
          ? point(4, 4, objectColors[name])
          : stroke(...input.start, ...input.end, objectColors[name]),
      );
    }
  }
  if (target === "P") marks.push(point(4, 4, colors.amber));
  const labels: Partial<Record<Name, [number, number]>> = {
    A: [1.6, 4.5],
    B: [7.5, 6.7],
    C: [1.2, 7.9],
    D: [5.4, 9.1],
  };
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label="同点事件等比例坐标图"
      data-geometry-inputs={names.join(",")}
    >
      <defs>
        <marker
          id={uid}
          markerWidth={7}
          markerHeight={7}
          refX={6}
          refY={3.5}
          orient="auto"
        >
          <path d="M0 0 L7 3.5 L0 7 Z" fill={muted} />
        </marker>
      </defs>
      {title && (
        <Label x={width / 2} y={40} align="center" fontSize={25}>
          {title}
        </Label>
      )}
      {Array.from({ length: 11 }, (_, i) => (
        <g key={i} stroke="#e2e8f0" strokeWidth={1}>
          <line x1={x(i)} y1={y(-1)} x2={x(i)} y2={y(10)} />
          <line x1={x(0)} y1={y(i)} x2={x(10)} y2={y(i)} />
        </g>
      ))}
      <path
        d={`M${x(-0.3)} ${y(0)} H${x(10.4)}`}
        fill="none"
        stroke={muted}
        strokeWidth={1.5}
        markerEnd={`url(#${uid})`}
      />
      <path
        d={`M${x(0)} ${y(-1.3)} V${y(10.5)}`}
        fill="none"
        stroke={muted}
        strokeWidth={1.5}
        markerEnd={`url(#${uid})`}
      />
      <Label x={x(-0.15)} y={y(-0.2)} align="right" fontSize={23}>
        O
      </Label>
      <Label x={x(10.2)} y={y(-0.25)} fontSize={24}>
        x
      </Label>
      <Label x={x(0.25)} y={y(10.5)} fontSize={24}>
        y
      </Label>
      <line
        x1={x(4)}
        x2={x(4)}
        y1={y(-1)}
        y2={y(10)}
        stroke={muted}
        strokeWidth={1.4}
        strokeDasharray="5 6"
      />
      <Label x={x(4) + 8} y={y(0) + 10} fontSize={23}>
        4
      </Label>
      <Label x={x(0) - 9} y={y(4) - 15} align="right" fontSize={23}>
        4
      </Label>
      {names
        .filter((n) => !n.startsWith("Z"))
        .map((name) => {
          const input = inputs[name];
          const color = objectColors[name];
          const label = labels[name]!;
          return (
            <g key={name} data-diagram-object={name}>
              <line
                x1={x(input.start[0])}
                y1={y(input.start[1])}
                x2={x(input.end[0])}
                y2={y(input.end[1])}
                stroke={color}
                strokeWidth={2.5}
              />
              {[input.start, input.end].map((p, i) => (
                <circle key={i} cx={x(p[0])} cy={y(p[1])} r={4} fill={color} />
              ))}
              <Label
                x={x(label[0])}
                y={y(label[1])}
                fill={color}
                fontSize={compact ? 26 : 30}
              >
                {name}
              </Label>
            </g>
          );
        })}
      <AttentionMarks
        marks={marks}
        progress={progress}
        project={([px, py]) => [x(px), y(py)]}
      />
      {names
        .filter((n) => n.startsWith("Z"))
        .map((name) => (
          <g key={name} data-diagram-object={name}>
            <path
              d={`M${x(4)} ${y(4) - 7} l7 7 l-7 7 l-7 -7 Z`}
              fill="white"
              stroke={objectColors[name]}
              strokeWidth={2.5}
            />
            <Label
              x={x(4)}
              y={y(4) - 52}
              align="center"
              verticalAlign="middle"
              fill={objectColors[name]}
              fontSize={26}
            >
              {name}
            </Label>
          </g>
        ))}
      {!names.some((n) => n.startsWith("Z")) && (
        <circle cx={x(4)} cy={y(4)} r={5} fill={ink} />
      )}
      <Label
        x={x(4) + 36}
        y={y(4)}
        verticalAlign="middle"
        fontSize={compact ? 23 : 28}
      >
        P
      </Label>
    </svg>
  );
}

export function ParticipantDiagram({
  page,
  kind,
  visibleStep,
  target,
  progress,
  reached,
  reachedCaption,
  thinking,
}: State) {
  const cue = {
    target,
    progress,
    reached,
    visibleStep,
    reachedCaption,
    thinking,
  };
  if (kind === "endpoint" || kind === "interior" || kind === "meeting") {
    const names: Name[] =
      kind === "endpoint"
        ? page === "endpoint-input" && visibleStep === 1
          ? ["A"]
          : ["A", "B"]
        : kind === "interior"
          ? ["B", "C"]
          : ["A", "B", "C", "D"];
    return <Geometry names={names} target={target} progress={progress} />;
  }
  if (kind === "points" || kind === "pure" || kind === "endpoint-point") {
    const solo = kind === "pure" && visibleStep >= 2;
    const leftNames: Name[] =
      kind === "endpoint-point"
        ? ["A", "Z_1"]
        : kind === "pure"
          ? ["Z_1"]
          : ["C", "Z_1"];
    const rightNames: Name[] =
      kind === "endpoint-point"
        ? ["B", "Z_1"]
        : kind === "pure"
          ? ["Z_2"]
          : ["C", "Z_2"];
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 610,
        }}
      >
        <div style={{ display: "flex", gap: 25, alignItems: "center" }}>
          <Geometry
            compact
            names={leftNames}
            target={target}
            progress={progress}
            title={kind === "endpoint-point" ? "案例一" : undefined}
          />
          {!solo && (kind !== "endpoint-point" || visibleStep >= 2) && (
            <Geometry
              compact
              names={rightNames}
              target={target}
              progress={progress}
              title={kind === "endpoint-point" ? "案例二" : undefined}
            />
          )}
        </div>
        {page === "points-report" && (
          <div
            style={{
              height: 135,
              visibility: visibleStep >= 3 ? "visible" : "hidden",
            }}
          >
            <PointMembership
              current={["C", "Z_1", "Z_2"]}
              continuing={["C"]}
              showRight={(reachedCaption ?? -1) >= 1 || thinking}
            />
          </div>
        )}
        {kind === "endpoint-point" && (
          <div style={{ display: "flex", gap: 25 }}>
            <PointMembership
              compact
              current={["A", "Z_1"]}
              continuing={[]}
              showRight={
                visibleStep >= 2 || (reachedCaption ?? -1) >= 1 || thinking
              }
            />
            {visibleStep >= 2 && (
              <PointMembership
                compact
                current={["B", "Z_1"]}
                continuing={["B"]}
                showRight={
                  visibleStep >= 3 || (reachedCaption ?? -1) >= 1 || thinking
                }
              />
            )}
          </div>
        )}
      </div>
    );
  }
  if (kind === "collect") return <CollectionDiagram page={page} {...cue} />;
  if (kind === "roles") return <RoleDiagram {...cue} />;
  if (kind === "block") {
    const joined = visibleStep >= 3;
    const marks: Record<string, AttentionMark[]> = {
      UV: [point(140, 420, colors.blue), point(140, 100, colors.orange)],
      W: [stroke(140, 260, joined ? 590 : 300, 260, colors.violet)],
      P: [point(590, 260)],
      interval: [stroke(140, 520, 590, 520)],
    };
    return (
      <svg
        width={780}
        height={610}
        viewBox="0 0 780 610"
        aria-label="一般夹层关系示意，不是数值坐标图"
      >
        <Label x={390} y={40} align="center" fontSize={25}>
          旧顺序夹层 → 同一边界位置
        </Label>
        {[
          ["U", 420],
          ["W", 260],
          ["V", 100],
        ].map(([name, y]) => (
          <g key={name} data-diagram-object={name}>
            <line
              x1={140}
              y1={Number(y)}
              x2={name === "W" && !joined ? 300 : 590}
              y2={260}
              stroke={objectColors[name as string]}
              strokeWidth={2.5}
            />
            <Label
              x={140}
              y={Number(y) - 52}
              align="center"
              fill={objectColors[name as string]}
            >
              {name}
            </Label>
          </g>
        ))}
        <circle cx={590} cy={260} r={5} fill={ink} />
        <Label x={620} y={265}>
          P
        </Label>
        <Label x={140} y={520} align="center" fontSize={24}>
          紧邻左侧
        </Label>
        <Label x={590} y={520} align="center" fontSize={24}>
          x_P
        </Label>
        <AttentionMarks marks={marks[target ?? ""] ?? []} progress={progress} />
        <Label x={390} y={600} align="center" fontSize={23}>
          {joined
            ? "沿用夹层结论：W 也经过 P，纳入相遇块"
            : "先核对旧结论的适用条件"}
        </Label>
      </svg>
    );
  }
  if (kind === "queue") return <EventRecordDiagram {...cue} />;
  const pairs = [
    ["A", "B"],
    ["A", "C"],
    ["A", "D"],
    ["B", "C"],
    ["B", "D"],
    ["C", "D"],
  ];
  const revealed = reached.includes("all-pairs") ? pairs.length : 0;
  return (
    <svg
      width={780}
      height={610}
      viewBox="0 0 780 610"
      aria-label="六个不同原始输入对，对应一个位置"
    >
      {pairs.map(([a, b], i) => (
        <g
          key={a + b}
          visibility={i < revealed ? "visible" : "hidden"}
          data-pair={`${a},${b}`}
        >
          <rect
            x={40}
            y={35 + i * 85}
            width={300}
            height={65}
            rx={7}
            fill="#edf1f6"
          />
          <Label
            x={100}
            y={67.5 + i * 85}
            verticalAlign="middle"
            fill={objectColors[a]}
          >
            {a}
          </Label>
          <Label
            x={215}
            y={67.5 + i * 85}
            verticalAlign="middle"
            fill={objectColors[b]}
          >
            {b}
          </Label>
          <line
            x1={365}
            y1={67 + i * 85}
            x2={650}
            y2={285}
            stroke={muted}
            strokeWidth={1.5}
          />
        </g>
      ))}
      <circle cx={650} cy={285} r={6} fill={ink} />
      <Label x={674} y={285} verticalAlign="middle">
        P
      </Label>
    </svg>
  );
}
