import { useId } from "react";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import {
  SvgMathText as Label,
  MathText,
} from "../../../shared/ui/SemanticMathText";
import { inputs, results, type Name, type Point } from "./example";
import { colors } from "../../colors.ts";
import type { TimelineRow, VisualState } from "./timeline";

const ink = "#172c45";
const muted = "#94a3b8";
const panelWidth = 390;
const panelHeight = 210;
/** The shared sample's fixed viewport cannot contain x=10 and y=-4.
 * These article-specific panels keep the same coordinate scale within each comparison. */
function Geometry({
  names,
  wide = false,
  scan,
  highlight,
  progress = 1,
  title,
  result,
}: {
  names: Name[];
  wide?: boolean;
  scan?: number;
  highlight?: Name;
  progress?: number;
  title?: string;
  result?: { from: Point; to: Point };
}) {
  const uid = useId().replace(/:/g, "");
  const width = panelWidth,
    height = wide ? 390 : panelHeight,
    unit = 30;
  const x = (v: number) => 35 + unit * v,
    y = (v: number) => (wide ? 205 : 90) - unit * v;
  const ys = wide ? [-4, -3, -2, -1, 0, 1, 2, 3, 4] : [-2, -1, 0, 1, 2];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      data-geometry-inputs={names.join(",")}
      aria-label="等比例教学分图"
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
      {title ? (
        <Label x={width / 2} y={23} align="center" fontSize={22}>
          {title}
        </Label>
      ) : null}
      {Array.from({ length: 11 }, (_, i) => (
        <line
          key={i}
          x1={x(i)}
          x2={x(i)}
          y1={y(ys[0])}
          y2={y(ys[ys.length - 1])}
          stroke="#e2e8f0"
        />
      ))}
      {ys.map((i) => (
        <line
          key={i}
          x1={x(0)}
          x2={x(10)}
          y1={y(i)}
          y2={y(i)}
          stroke="#e2e8f0"
        />
      ))}
      <path
        d={`M${x(0)} ${y(ys[0] - 0.5)} V${y(ys[ys.length - 1] + 0.5)}`}
        stroke={muted}
        fill="none"
        markerEnd={`url(#${uid})`}
      />
      {/* Separate paths ensure each positive axis has its own arrow. */}
      <path
        d={`M${x(-0.5)} ${y(0)} H${x(10.6)}`}
        stroke={muted}
        fill="none"
        markerEnd={`url(#${uid})`}
      />
      {Array.from({ length: 11 }, (_, i) => (
        <line
          key={i}
          x1={x(i)}
          x2={x(i)}
          y1={y(0) - 3}
          y2={y(0) + 3}
          stroke={muted}
        />
      ))}
      <Label x={x(0) - 8} y={y(0) + 21} align="right" fontSize={18}>
        O
      </Label>
      <Label x={x(10.4)} y={y(0) + 22} fontSize={18}>
        x
      </Label>
      <Label x={x(0) + 9} y={y(ys[ys.length - 1] + 0.25)} fontSize={18}>
        y
      </Label>
      {scan !== undefined ? (
        <g>
          <line
            x1={x(scan)}
            x2={x(scan)}
            y1={y(ys[0])}
            y2={y(ys[ys.length - 1])}
            stroke={colors.amber}
            strokeDasharray="5 5"
          />
          <Label
            x={width - 8}
            y={height - 10}
            fontSize={18}
            align="right"
          >{`x=${scan}`}</Label>
        </g>
      ) : null}
      {names.map((name) => {
        const s = inputs[name];
        return (
          <g key={name} fill={s.color} stroke={s.color} data-input={name}>
            {name === "Z" ? (
              <path
                d={`M${x(5)} ${y(0) - 7} l7 7 l-7 7 l-7 -7 Z`}
                fill="none"
                strokeWidth={2}
              />
            ) : (
              <>
                <line
                  x1={x(s.start[0])}
                  y1={y(s.start[1])}
                  x2={x(s.end[0])}
                  y2={y(s.end[1])}
                  strokeWidth={2.5}
                />
                {[s.start, s.end].map((p, i) => (
                  <circle key={i} cx={x(p[0])} cy={y(p[1])} r={3.5} />
                ))}
              </>
            )}
            <Label
              x={
                name === "D"
                  ? x(8)
                  : name === "Z"
                    ? x(5) + 12
                    : wide && name === "B"
                      ? x(3)
                      : x((s.start[0] + s.end[0]) / 2)
              }
              y={
                name === "D" ? y(3) - 15 : name === "Z" ? y(0) - 18 : y(0) - 16
              }
              align={name === "Z" ? "left" : "center"}
              fill={s.color}
              fontSize={wide ? 22 : 26}
            >
              {name}
            </Label>
          </g>
        );
      })}
      {result ? (
        <g stroke={colors.violet} fill={colors.violet} data-result-range>
          <line
            x1={x(result.from[0])}
            y1={y(result.from[1])}
            x2={x(result.to[0])}
            y2={y(result.to[1])}
            strokeWidth={3}
          />
          {[result.from, result.to].map((p, i) => (
            <circle key={i} cx={x(p[0])} cy={y(p[1])} r={4} />
          ))}
        </g>
      ) : null}
      {highlight && names.includes(highlight) && highlight !== "Z" ? (
        <AttentionMarks
          marks={[
            {
              kind: "line",
              from: inputs[highlight].start,
              to: inputs[highlight].end,
              color: inputs[highlight].color,
            },
          ]}
          progress={progress}
          project={(p) => [x(p[0]), y(p[1])]}
        />
      ) : null}
      {wide && names.includes("Z") ? (
        <Label x={x(5)} y={y(0) + 32} align="center" fontSize={22}>
          P=(5,0)
        </Label>
      ) : null}
      {!wide ? (
        <Label x={width / 2} y={177} align="center" fontSize={22}>
          {result
            ? `(${result.from.join(",")}) — (${result.to.join(",")})`
            : names.length === 1
              ? `(${inputs[names[0]].start.join(",")}) — (${inputs[names[0]].end.join(",")})`
              : ""}
        </Label>
      ) : null}
    </svg>
  );
}
function GeometryPanels({
  names,
  visibleCount = names.length,
  scan,
  highlight,
  progress,
}: {
  names: Name[];
  visibleCount?: number;
  scan?: number;
  highlight?: Name;
  progress: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(2, ${panelWidth}px)`,
        gridTemplateRows: `repeat(${names.length > 2 ? 2 : 1}, ${panelHeight}px)`,
        justifyContent: "center",
      }}
    >
      {names.map((name, i) => (
        <div
          key={name}
          style={{
            gridRow: i < 2 ? 1 : 2,
            gridColumn:
              i === 2 || (i === 0 && visibleCount === 1) ? "1 / -1" : i + 1,
            justifySelf: "center",
            visibility: i < visibleCount ? "visible" : "hidden",
          }}
        >
          <Geometry
            names={[name]}
            scan={scan}
            highlight={highlight === name ? name : undefined}
            progress={progress}
          />
        </div>
      ))}
    </div>
  );
}
function Members({
  names,
  label = "G_0",
  pending = [],
}: {
  names: Name[];
  label?: string;
  pending?: Name[];
}) {
  return (
    <div
      data-member-state={names.join(",")}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        fontSize: 27,
        minHeight: 58,
      }}
    >
      <MathText>{label + "："}</MathText>
      {names.length ? (
        names.map((n) => (
          <span
            key={n}
            style={{
              border: `2px solid ${inputs[n].color}`,
              borderRadius: 8,
              padding: "5px 15px",
              color: inputs[n].color,
            }}
          >
            <MathText>{n}</MathText>
          </span>
        ))
      ) : (
        <span>空</span>
      )}
      {pending.length ? (
        <span style={{ fontSize: 23, color: ink }}>
          待加入：<MathText>{pending.join("、")}</MathText>
        </span>
      ) : null}
    </div>
  );
}
function Ledger({ count, capacity = 8 }: { count: number; capacity?: number }) {
  return (
    <div
      data-result-count={count}
      style={{
        display: "grid",
        gridTemplateColumns: capacity > 3 ? "1fr 1fr" : "1fr",
        gap: 8,
        fontSize: 24,
        padding: "14px 24px",
      }}
    >
      {results.slice(0, capacity).map((r, i) => (
        <div
          key={r.pair}
          data-result-pair={i < count ? r.pair : undefined}
          style={{ visibility: i < count ? "visible" : "hidden" }}
        >
          <MathText>{`${r.pair}：${r.from[0] === r.to[0] ? "P=(5,0)" : `(${r.from.join(",")}) 到 (${r.to.join(",")})`}`}</MathText>
        </div>
      ))}
    </div>
  );
}
export function OverlapDiagram({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const n = Number(row.id.slice(2));
  const has = (name: string) => state.operations.includes(name);
  const p = row.operations.length ? state.operationProgress : state.progress;
  const emphasis = state.operation ? Math.sin(Math.PI * p) ** 2 : 0;
  if (row.page === "inputs" || row.page === "group") {
    const count = row.page === "inputs" ? state.visibleStep : 3;
    const names: Name[] = ["A", "B", "C"];
    return (
      <div>
        <GeometryPanels
          names={names}
          visibleCount={count}
          scan={row.page === "group" ? (n === 8 ? 1 : 3.5) : undefined}
          highlight={names.find((name) => state.target === name)}
          progress={p}
        />
        {row.page === "group" ? (
          <div style={{ visibility: n >= 7 ? "visible" : "hidden" }}>
            <Members names={n === 8 ? ["A"] : names} />
          </div>
        ) : null}
        <div style={{ fontSize: 23, textAlign: "center", marginTop: 18 }}>
          同尺度分图 · 教学示意
        </div>
      </div>
    );
  }
  if (row.page === "join" || row.page === "nested") {
    const ending = n === 14;
    const scan =
      n <= 9
        ? 0
        : n <= 11
          ? 2
          : ending
            ? has("endB")
              ? 8
              : has("endA")
                ? 6
                : has("endC")
                  ? 4
                  : 3
            : 3;
    const members: Name[] =
      n === 9
        ? has("addA")
          ? ["A"]
          : []
        : n === 10
          ? ["A"]
          : n === 11
            ? has("addB")
              ? ["A", "B"]
              : ["A"]
            : n === 12
              ? ["A", "B"]
              : ending
                ? has("endB")
                  ? []
                  : has("endA")
                    ? ["B"]
                    : has("endC")
                      ? ["A", "B"]
                      : ["A", "B", "C"]
                : has("addC")
                  ? ["A", "B", "C"]
                  : ["A", "B"];
    const count =
      n <= 9
        ? 0
        : n === 10
          ? Number(has("AB"))
          : n === 11
            ? 1
            : n === 12
              ? 1 + Number(has("AC")) + Number(has("BC"))
              : 3;
    const highlight: Name | undefined =
      n === 10 ? "B" : n === 12 ? "C" : undefined;
    return (
      <div>
        <GeometryPanels
          names={row.page === "join" ? ["A", "B"] : ["A", "B", "C"]}
          scan={scan}
          highlight={highlight}
          progress={p}
        />
        <Members
          names={members}
          pending={
            n === 10 || (n === 11 && !has("addB"))
              ? ["B"]
              : n === 12 || (n === 13 && !has("addC"))
                ? ["C"]
                : []
          }
        />
        <div style={{ fontSize: 24, textAlign: "center", marginTop: 15 }}>
          累计完整结果
        </div>
        <Ledger count={count} capacity={row.page === "join" ? 1 : 3} />
        {row.page === "join" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
              visibility: count ? "visible" : "hidden",
            }}
          >
            <span style={{ fontSize: 24 }}>
              <MathText>A 与 B 的完整交集</MathText>
            </span>
            <Geometry names={[]} result={results[0]} />
          </div>
        ) : null}
      </div>
    );
  }
  if (row.page === "duplicates") {
    const members: Name[] =
      n === 15
        ? []
        : n === 16
          ? has("addJ2")
            ? ["J_1", "J_2"]
            : has("addJ1")
              ? ["J_1"]
              : []
          : has("addJ3")
            ? ["J_1", "J_2", "J_3"]
            : ["J_1", "J_2"];
    const pairs =
      n === 15
        ? []
        : n === 16
          ? has("J12")
            ? ["J_1,J_2"]
            : []
          : [
              "J_1,J_2",
              ...(has("J13") ? ["J_1,J_3"] : []),
              ...(has("J23") ? ["J_2,J_3"] : []),
            ];
    return (
      <div>
        <GeometryPanels
          names={["J_1", "J_2", "J_3"]}
          scan={1}
          highlight={
            n === 16
              ? !has("J12")
                ? "J_1"
                : "J_2"
              : n === 17
                ? "J_3"
                : undefined
          }
          progress={p}
        />
        <Members label="当前同线成员" names={members} />
        <div style={{ fontSize: 24, padding: 25 }}>
          {["J_1,J_2", "J_1,J_3", "J_2,J_3"].map((pair) => (
            <div
              key={pair}
              style={{
                marginTop: 12,
                visibility: pairs.includes(pair) ? "visible" : "hidden",
              }}
            >
              <MathText>{`${pair}：(1,0) 到 (5,0)`}</MathText>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (row.page === "handoff")
    return (
      <div>
        <GeometryPanels
          names={["B", "E"]}
          scan={8}
          highlight={state.target === "E" ? "E" : undefined}
          progress={p}
        />
        <Members
          names={n === 18 || !has("endB") ? ["B"] : ["E"]}
          pending={n === 18 || !has("endB") ? ["E"] : []}
        />
        <div
          style={{
            fontSize: 29,
            textAlign: "center",
            marginTop: 30,
            visibility: has("BE") ? "visible" : "hidden",
          }}
        >
          <MathText>B 与 E 的完整交集：(8,0)</MathText>
        </div>
      </div>
    );
  if (row.page === "crossing-input" || row.page === "collect") {
    const hasPoint = n >= 30;
    return (
      <div>
        <div style={{ display: "flex" }}>
          {(["A", "B"] as Name[]).map((name) => (
            <Geometry
              key={name}
              wide
              names={[name, "D", ...(hasPoint ? ["Z" as const] : [])]}
              scan={5}
              highlight={state.target === "D" ? "D" : undefined}
              progress={p}
            />
          ))}
        </div>
        <>
          <div style={{ visibility: n >= 31 ? "visible" : "hidden" }}>
            <Members names={["A", "B"]} />
          </div>
          <Members label="G_1（y=x−5）" names={["D"]} />
          <div
            style={{
              fontSize: 24,
              textAlign: "center",
              visibility: n >= 31 ? "visible" : "hidden",
            }}
          >
            <MathText>C 已在 x=4 结束；Z 单列点输入</MathText>
          </div>
        </>
      </div>
    );
  }
  const count =
    n === 34
      ? 3 + Number(has("AD")) + Number(has("BD"))
      : n === 35
        ? 5
        : n === 36
          ? 5 + Number(has("AZ")) + Number(has("BZ")) + Number(has("DZ"))
          : 8;
  const lines = [
    {
      from: [170, 90],
      to: [570, 140],
      label: "A,D",
      active: state.operation === "AD",
    },
    {
      from: [170, 190],
      to: [570, 140],
      label: "B,D",
      active: state.operation === "BD",
    },
    {
      from: [370, 315],
      to: [170, 90],
      label: "A,Z",
      active: state.operation === "AZ",
    },
    {
      from: [370, 315],
      to: [170, 190],
      label: "B,Z",
      active: state.operation === "BZ",
    },
    {
      from: [370, 315],
      to: [570, 140],
      label: "D,Z",
      active: state.operation === "DZ",
    },
  ];
  return (
    <div>
      <svg
        width={780}
        height={350}
        viewBox="0 0 780 350"
        aria-label="跨组与点输入配对关系"
      >
        <rect
          x={65}
          y={35}
          width={200}
          height={220}
          rx={12}
          fill="#edf1f6"
          stroke={muted}
        />
        <Label x={165} y={35} align="center" fontSize={25}>
          G_0
        </Label>
        <rect
          x={475}
          y={85}
          width={200}
          height={110}
          rx={12}
          fill="#edf1f6"
          stroke={muted}
        />
        <Label x={575} y={70} align="center" fontSize={25}>
          G_1
        </Label>
        {lines.slice(0, count - 3).map((l) => (
          <line
            key={l.label}
            x1={l.from[0]}
            y1={l.from[1]}
            x2={l.to[0]}
            y2={l.to[1]}
            stroke={l.active ? colors.amber : muted}
            strokeWidth={l.active ? 2 + 3 * emphasis : 2}
          />
        ))}
        {(
          [
            { name: "A", x: 170, y: 90 },
            { name: "B", x: 170, y: 190 },
            { name: "D", x: 570, y: 140 },
            ...(n >= 36 ? [{ name: "Z", x: 370, y: 315 }] : []),
          ] as { name: Name; x: number; y: number }[]
        ).map((o) => (
          <g key={o.name}>
            <rect
              x={o.x - 35}
              y={o.y - 25}
              width={70}
              height={50}
              rx={8}
              fill="#f6f8fb"
              stroke={inputs[o.name].color}
            />
            <Label
              x={o.x}
              y={o.y}
              align="center"
              verticalAlign="middle"
              fill={inputs[o.name].color}
              fontSize={28}
            >
              {o.name}
            </Label>
          </g>
        ))}
      </svg>
      <Ledger count={count} />
      {row.page === "point-pairs" ? (
        <div
          style={{
            fontSize: 24,
            textAlign: "center",
            visibility: n === 37 ? "visible" : "hidden",
          }}
        >
          <MathText>C,D 与 C,Z：空交集</MathText>
        </div>
      ) : null}
    </div>
  );
}
