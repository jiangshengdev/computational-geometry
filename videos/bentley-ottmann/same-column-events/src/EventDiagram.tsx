import { useId } from "react";
import {
  SvgMathText as Label,
  MathText,
} from "../../../shared/ui/SemanticMathText";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import { colors } from "../../colors.ts";
import { inputs, orders, intersections, type InputId } from "./example";
import { pages } from "./storyboard";
import type { TimelineRow, VisualState } from "./timeline";

const ink = "#172c45",
  grid = "#e2e8f0",
  muted = "#64748b";
const x = (n: number) => 180 + 46 * n,
  y = (n: number) => 320 - 46 * n;
const num = (id: string) => Number(id.slice(2));

/** Case geometry remains fixed; only its teaching emphasis changes. */
function Geometry({ row, state }: { row: TimelineRow; state: VisualState }) {
  const n = num(row.id),
    uid = useId().replace(/:/g, "");
  const introduced = n < 4 ? 1 : n < 5 ? 2 : n < 6 ? 3 : 4;
  let selected: number[] = n >= 3 && n <= 6 ? [n - 3] : [];
  if (n === 8) selected = [0, 1];
  if (n === 9) selected = [2, 3];
  if (n === 10) selected = [0, 3];
  if (n >= 28 && n <= 30) selected = [0, 3];
  if (n === 11) selected = [1, 2];
  if (n === 12) selected = state.progress < 0.5 ? [0, 2] : [1, 3];
  if (n >= 14 && n <= 17) selected = [n - 14];
  if (n === 33) selected = [1];
  if (n === 34) selected = [3];
  if (n === 35)
    selected = state.reached.some((c) => c.includes("紫色退出")) ? [2] : [0];
  const scan = n >= 33 && n <= 36 ? 3 : n >= 14 && n <= 19 ? -1 : undefined;
  const known =
    n === 8
      ? ["P"]
      : n === 9
        ? ["P", "Q"]
        : (n >= 10 && n <= 13) || (n >= 28 && n <= 30) || n === 36 || n === 37
          ? ["P", "Q", "R"]
          : n === 15 || n === 16
            ? ["P"]
            : n >= 17 && n <= 20
              ? ["P", "Q"]
              : [];
  const showOutside = n === 11;
  return (
    <svg
      width={430}
      height={610}
      viewBox="0 0 430 610"
      data-geometry-inputs="case"
      aria-label="四份输入的等比例坐标图"
    >
      <defs>
        <marker
          id={uid}
          markerWidth={6}
          markerHeight={6}
          refX={5}
          refY={3}
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6 Z" fill={muted} />
        </marker>
      </defs>
      <Label x={215} y={30} align="center" fontSize={24}>
        等比例教学示意
      </Label>
      {[-2, -1, 0, 1, 2, 3, 4].map((v) => (
        <line
          key={`x${v}`}
          x1={x(v)}
          x2={x(v)}
          y1={y(-5)}
          y2={y(5)}
          stroke={grid}
        />
      ))}
      {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((v) => (
        <line
          key={`y${v}`}
          x1={x(-2)}
          x2={x(4)}
          y1={y(v)}
          y2={y(v)}
          stroke={grid}
        />
      ))}
      <path
        d={`M${x(-2.6)} ${y(0)} H${x(4.5)}`}
        stroke={muted}
        fill="none"
        markerEnd={`url(#${uid})`}
      />
      <path
        d={`M${x(0)} ${y(-5.5)} V${y(5.5)}`}
        stroke={muted}
        fill="none"
        markerEnd={`url(#${uid})`}
      />
      <Label x={x(4.5)} y={y(0) + 27} fontSize={21}>
        x
      </Label>
      <Label x={x(0) + 12} y={y(5.4)} fontSize={21}>
        y
      </Label>
      <Label x={x(0) - 10} y={y(0) + 25} align="right" fontSize={20}>
        O
      </Label>
      {[-2, -1, 1, 2, 3].map((v) => (
        <Label key={v} x={x(v)} y={y(0) + 25} align="center" fontSize={18}>
          {v}
        </Label>
      ))}
      {[-5, -3, -2, -1, 1, 2, 3, 5].map((v) => (
        <Label
          key={v}
          x={x(0) - 12}
          y={y(v)}
          align="right"
          verticalAlign="middle"
          fontSize={18}
        >
          {v}
        </Label>
      ))}
      {scan !== undefined && (
        <line
          x1={x(scan)}
          x2={x(scan)}
          y1={y(-5.4)}
          y2={y(5.4)}
          stroke={colors.amber}
          strokeWidth={2}
          strokeDasharray="7 6"
        />
      )}
      {showOutside &&
        [1, 2].map((i) => (
          <line
            key={i}
            x1={x(-2)}
            y1={y(inputs[i].m * -2 + inputs[i].b)}
            x2={x(-1)}
            y2={y(inputs[i].start[1])}
            stroke={inputs[i].color}
            strokeWidth={2}
            strokeDasharray="6 5"
          />
        ))}
      {inputs.slice(0, introduced).map((s) => (
        <g key={s.id}>
          <line
            x1={x(s.start[0])}
            y1={y(s.start[1])}
            x2={x(s.end[0])}
            y2={y(s.end[1])}
            stroke={s.color}
            strokeWidth={3}
          />
          {[s.start, s.end].map((p, i) => (
            <circle key={i} cx={x(p[0])} cy={y(p[1])} r={4} fill={s.color} />
          ))}
          <Label
            x={x(3) + 14}
            y={y(s.end[1])}
            verticalAlign="middle"
            fontSize={24}
            fill={s.color}
          >{`S_${s.id}`}</Label>
        </g>
      ))}
      {state.active && (
        <AttentionMarks
          progress={n === 12 ? (state.progress * 2) % 1 : state.progress}
          marks={selected.map((i) => ({
            kind: "line",
            from: [inputs[i].start[0], inputs[i].start[1]],
            to: [inputs[i].end[0], inputs[i].end[1]],
            color: inputs[i].color,
          }))}
          project={([a, b]) => [x(a), y(b)]}
        />
      )}
      {known.map((name) => {
        const [a, b] = intersections[name as keyof typeof intersections];
        return (
          <g key={name}>
            <circle cx={x(a)} cy={y(b)} r={5} fill={ink} />
            {name === "R" && (
              <path
                d={`M${x(a) + 7} ${y(b) + 7} L${x(a) + 35} ${y(b) + 90} H${x(a) + 62}`}
                fill="none"
                stroke={ink}
                strokeWidth={1.5}
              />
            )}
            <Label
              x={x(a) + (name === "R" ? 68 : 13)}
              y={y(b) + (name === "Q" ? -13 : name === "R" ? 90 : 30)}
              verticalAlign={name === "R" ? "middle" : "baseline"}
              fontSize={22}
            >
              {name}
            </Label>
          </g>
        );
      })}
      {showOutside && (
        <>
          <circle
            cx={x(-2)}
            cy={y(0)}
            r={6}
            fill="white"
            stroke={colors.amber}
            strokeWidth={2}
          />
          <Label x={x(-2)} y={y(0) - 20} align="center" fontSize={22}>
            (-2,0)
          </Label>
        </>
      )}
    </svg>
  );
}

export function orderState(
  row: TimelineRow,
  state: VisualState,
): { before: InputId[]; after: InputId[]; motion: number } {
  const n = num(row.id);
  if (n >= 14 && n <= 17)
    return {
      before: orders.before.slice(0, n - 14),
      after: orders.before.slice(0, n - 13),
      motion: state.motion,
    };
  if (n === 22)
    return {
      before: orders.before,
      after: orders.afterP,
      motion: state.motion,
    };
  if (n === 27)
    return {
      before: orders.afterP,
      after: orders.afterQ,
      motion: state.motion,
    };
  if (n === 32)
    return {
      before: orders.afterQ,
      after: orders.afterR,
      motion: state.motion,
    };
  if (n === 33)
    return { before: orders.afterR, after: [3, 0, 2], motion: state.motion };
  if (n === 34)
    return { before: [3, 0, 2], after: [0, 2], motion: state.motion };
  if (n === 35)
    return !state.reached.some((c) => c.includes("紫色退出"))
      ? { before: [0, 2], after: [2], motion: state.motion }
      : {
          before: [2],
          after: [],
          motion: state.secondMotion,
        };
  const order =
    n === 36
      ? []
      : n >= 43 || (n >= 23 && n <= 26)
        ? orders.afterP
        : n >= 28 && n <= 31
          ? orders.afterQ
          : orders.before;
  return { before: order, after: order, motion: 1 };
}

function Order({ row, state }: { row: TimelineRow; state: VisualState }) {
  const { before, after, motion } = orderState(row, state);
  const ids = [...new Set([...before, ...after])];
  const slot = (i: number) => 460 - i * 76;
  return (
    <svg
      width={280}
      height={580}
      viewBox="0 0 280 580"
      aria-label="维护顺序，从下到上"
      data-order={after.join(",")}
    >
      <Label x={140} y={40} align="center" fontSize={24}>
        维护顺序
      </Label>
      <Label x={140} y={74} align="center" fontSize={20}>
        从下向上读
      </Label>
      <path
        d="M245 485 V145 l-7 12 m7-12 l7 12"
        stroke={muted}
        fill="none"
        strokeWidth={2}
      />
      {ids.map((id) => {
        const a = before.indexOf(id),
          b = after.indexOf(id);
        if (b < 0 && motion === 1) return null;
        const exiting = num(row.id) >= 33 && num(row.id) <= 35;
        // Give the SVG border and foreignObject label the same position directly.
        // Avoid relying on ancestor SVG transforms for HTML label positioning.
        const xx =
          135 +
          (!exiting && a >= 0 && b >= 0
            ? Math.sign(b - a) * Math.sin(Math.PI * motion) * 60
            : 0);
        const yy = exiting
          ? slot(orders.afterR.indexOf(id))
          : a < 0
            ? slot(b)
            : b < 0
              ? slot(a)
              : slot(a) + (slot(b) - slot(a)) * motion;
        return (
          <g
            key={id}
            opacity={a < 0 ? motion : b < 0 ? 1 - motion : 1}
            data-order-member={id}
          >
            <rect
              x={xx - 70}
              y={yy - 25}
              width={140}
              height={50}
              rx={9}
              fill={`${inputs[id].color}12`}
              stroke={inputs[id].color}
              strokeWidth={2}
            />
            <Label
              x={xx}
              y={yy}
              align="center"
              verticalAlign="middle"
              fontSize={29}
              fill={inputs[id].color}
            >{`S_${id}`}</Label>
          </g>
        );
      })}
      {num(row.id) >= 28 && num(row.id) <= 30 && (
        <path
          d="M210 384 H226 V308 H210"
          fill="none"
          stroke={colors.amber}
          strokeWidth={4}
        />
      )}
      {after.length === 0 && motion === 1 && (
        <Label x={135} y={420} align="center" fontSize={28}>
          空
        </Label>
      )}
      <Label x={140} y={550} align="center" fontSize={18}>
        顺序竖列，不是几何坐标
      </Label>
    </svg>
  );
}

/** Each height has its own progress; never sample one shifted scan column. */
function Local({ row, state }: { row: TimelineRow; state: VisualState }) {
  const n = num(row.id),
    atR = n === 31 || n === 32;
  const lowRight = n >= 23 || (n === 22 && state.motion >= 0.5);
  const highRight = (n >= 28 && n <= 32) || (n === 27 && state.motion >= 0.5);
  const groups = atR
    ? [{ name: "R", h: 0, ids: [0, 3], right: n === 32 && state.motion >= 0.5 }]
    : [
        { name: "P", h: -2, ids: [0, 1], right: lowRight },
        { name: "Q", h: 2, ids: [2, 3], right: highRight },
      ];
  const x0 = 215,
    yy = (v: number) => 310 - v * 65;
  return (
    <svg
      width={430}
      height={580}
      viewBox="0 0 430 580"
      aria-label="各相遇高度独立更新的局部枝条"
    >
      <Label x={215} y={35} align="center" fontSize={24}>
        {atR ? "右方相遇处" : "同列的两处相遇"}
      </Label>
      <line
        x1={x0}
        x2={x0}
        y1={90}
        y2={510}
        stroke={muted}
        strokeDasharray="7 6"
      />
      <Label x={x0} y={80} align="center" fontSize={23}>
        {atR ? "x=2" : "x=0"}
      </Label>
      {groups.map((g) => (
        <g
          key={g.name}
          data-local-side={`${g.name}:${g.right ? "right" : "left"}`}
        >
          <rect
            x={55}
            y={yy(g.h) - 80}
            width={320}
            height={160}
            rx={12}
            fill={grid}
            opacity={0.32}
          />
          {g.ids.map((id) => {
            const dx = g.right ? 96 : -96;
            const y0 = yy(g.h);
            const y1 = y0 - inputs[id].m * dx;
            return (
              <g key={id}>
                <line
                  x1={x0}
                  x2={x0 + dx}
                  y1={y0}
                  y2={y1}
                  stroke={inputs[id].color}
                  strokeWidth={4}
                />
                <Label
                  x={x0 + dx + (g.right ? 12 : -12)}
                  y={y1}
                  align={g.right ? "left" : "right"}
                  verticalAlign="middle"
                  fill={inputs[id].color}
                  fontSize={24}
                >{`S_${id}`}</Label>
              </g>
            );
          })}
          <circle cx={x0} cy={yy(g.h)} r={5} fill={ink} />
          <Label x={x0 + 12} y={yy(g.h) - 12} fontSize={24}>
            {g.name}
          </Label>
          <Label x={215} y={yy(g.h) + 132} align="center" fontSize={22}>
            {g.right ? "已更新：右侧枝条" : "待更新：左侧枝条"}
          </Label>
        </g>
      ))}
    </svg>
  );
}

function Future({ row }: { row: TimelineRow }) {
  const n = num(row.id),
    uid = useId().replace(/:/g, "");
  const cx = 300,
    cy = 350;
  return (
    <svg
      width={740}
      height={590}
      viewBox="0 0 740 590"
      aria-label="完整位置的未来关系示意"
    >
      <defs>
        <marker
          id={uid}
          markerWidth={6}
          markerHeight={6}
          refX={5}
          refY={3}
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6 Z" fill={muted} />
        </marker>
      </defs>
      <Label x={370} y={35} align="center" fontSize={24}>
        位置关系示意，无指定数值
      </Label>
      {n >= 40 && (
        <rect
          x={cx + 2}
          y={90}
          width={350}
          height={400}
          fill={colors.emerald}
          opacity={0.09}
        />
      )}
      {n >= 41 && (
        <line
          x1={cx}
          x2={cx}
          y1={90}
          y2={cy - 10}
          stroke={colors.emerald}
          strokeWidth={6}
        />
      )}
      {n >= 42 && (
        <rect
          x={70}
          y={90}
          width={cx - 72}
          height={400}
          fill={muted}
          opacity={0.08}
        />
      )}
      <line
        x1={70}
        x2={680}
        y1={520}
        y2={520}
        stroke={muted}
        markerEnd={`url(#${uid})`}
      />
      <line
        x1={70}
        x2={70}
        y1={520}
        y2={70}
        stroke={muted}
        markerEnd={`url(#${uid})`}
      />
      <Label x={680} y={550} fontSize={24}>
        x
      </Label>
      <Label x={85} y={85} fontSize={24}>
        y
      </Label>
      <line
        x1={cx}
        x2={cx}
        y1={90}
        y2={520}
        stroke={muted}
        strokeDasharray="6 5"
      />
      <line
        x1={70}
        x2={cx}
        y1={cy}
        y2={cy}
        stroke={muted}
        strokeDasharray="6 5"
      />
      <Label x={cx} y={555} align="center" fontSize={24}>
        t
      </Label>
      <Label x={58} y={cy} align="right" verticalAlign="middle" fontSize={24}>
        h
      </Label>
      <Label x={58} y={550} align="right" fontSize={24}>
        O
      </Label>
      <circle cx={cx} cy={cy} r={7} fill={ink} />
      <Label x={cx - 12} y={cy + 35} align="right" fontSize={26}>
        E=(t,h)
      </Label>
      {n >= 39 && (
        <>
          <circle
            cx={n === 41 ? cx : 530}
            cy={170}
            r={7}
            fill={colors.emerald}
          />
          <Label
            x={n === 41 ? cx + 18 : 530}
            y={145}
            align={n === 41 ? "left" : "center"}
            fontSize={27}
          >
            F=(u,v)
          </Label>
        </>
      )}
      {n >= 40 && (
        <Label x={505} y={450} align="center" fontSize={27}>
          u &gt; t
        </Label>
      )}
      {n >= 41 && (
        <Label x={cx - 15} y={110} align="right" fontSize={25}>
          u=t，v&gt;h
        </Label>
      )}
      {n >= 42 && (
        <>
          <Label x={170} y={450} align="center" fontSize={24}>
            u&lt;t
          </Label>
          <Label x={cx + 20} y={500} fontSize={24}>
            u=t，v&lt;h
          </Label>
        </>
      )}
    </svg>
  );
}

export function EventDiagram({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const page = pages[row.page],
    n = num(row.id);
  if (page.diagram === "future" && n !== 37) return <Future row={row} />;
  const ordered = ["entry", "local", "exit"].includes(page.diagram);
  const reached = (text: string) => state.reached.some((c) => c.includes(text));
  const queue =
    n === 15 && !reached("于是登记")
      ? ""
      : n === 17 && !reached("登记 Q")
        ? "P"
        : n === 29 && !reached("因此现在登记")
          ? ""
          : n >= 43
            ? "Q"
            : n >= 15 && n <= 16
              ? "P"
              : n >= 17 && n <= 19
                ? "P，Q"
                : n >= 20 && n <= 25
                  ? "Q"
                  : n >= 29 && n <= 30
                    ? "R"
                    : "";
  const reported =
    n === 21 && !reached("先报告")
      ? ""
      : n === 26 && !reached("报告这一对")
        ? "P"
        : n === 31 && !reached("报告它们这一对")
          ? "P，Q"
          : n >= 43
            ? "P"
            : n >= 31 && n <= 36
              ? "P，Q，R"
              : n >= 26 && n <= 30
                ? "P，Q"
                : n >= 21 && n <= 25
                  ? "P"
                  : "";
  return (
    <div style={{ width: 800 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {page.diagram === "local" && !(n >= 28 && n <= 30) ? (
          <Local row={row} state={state} />
        ) : (
          <Geometry row={row} state={state} />
        )}
        {ordered && <Order row={row} state={state} />}
      </div>
      {ordered && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            fontSize: 22,
            color: ink,
          }}
        >
          <MathText colorize={false}>{`交点预约：${queue || "无"}`}</MathText>
          <MathText
            colorize={false}
          >{`已报告交点：${reported || "无"}`}</MathText>
        </div>
      )}
    </div>
  );
}
