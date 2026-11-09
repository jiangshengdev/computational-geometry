import { SvgMathText as Label } from "../../../shared/ui/SemanticMathText";
import { colors } from "../../colors.ts";
import { pages } from "./storyboard";
import type { TimelineRow, VisualState } from "./timeline";

const ink = "#172c45",
  muted = "#94a3b8";
const palette = [colors.blue, colors.orange, colors.violet, colors.emerald];
function Line({
  x1,
  y1,
  x2,
  y2,
  color = ink,
  dash = false,
  width = 3,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  dash?: boolean;
  width?: number;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dash ? "7 7" : undefined}
    />
  );
}
function Text({
  x,
  y,
  children,
  color = ink,
  size = 25,
}: {
  x: number;
  y: number;
  children: string;
  color?: string;
  size?: number;
}) {
  return (
    <Label
      x={x}
      y={y}
      align="center"
      verticalAlign="middle"
      fontSize={size}
      fill={color}
    >
      {children}
    </Label>
  );
}
function Card({
  x,
  y,
  color,
  children,
  opacity = 1,
}: {
  x: number;
  y: number;
  color: string;
  children: string;
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      <rect
        x={x - 75}
        y={y - 23}
        width={150}
        height={46}
        rx={8}
        fill={`${color}12`}
        stroke={color}
        strokeWidth={2}
      />
      <Text x={x} y={y} color={color} size={23}>
        {children}
      </Text>
    </g>
  );
}
function Branches({
  x = 270,
  y,
  side,
  opacity = 1,
}: {
  x?: number;
  y: number;
  side: number;
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      {[-1, 1].map((s, i) => (
        <Line
          key={s}
          x1={x}
          y1={y}
          x2={x + side * 135}
          y2={y - s * side * 50}
          color={palette[i]}
        />
      ))}
      <circle cx={x} cy={y} r={5} fill={ink} />
    </g>
  );
}
function Progress({ row, state }: { row: TimelineRow; state: VisualState }) {
  const update =
    row.id === "SR17"
      ? state.motion
      : row.page === "outside" || row.page === "right"
        ? 1
        : 0;
  const all = row.id === "SR22" ? state.motion : row.id === "SR23" ? 1 : 0;
  return (
    <>
      <Line x1={270} y1={65} x2={270} y2={475} color={muted} dash />
      <Text x={270} y={45}>
        x=t
      </Text>
      <Branches y={130} side={-1} opacity={1 - all} />
      <Branches y={130} side={1} opacity={all} />
      <Branches y={275} side={-1} opacity={1 - update} />
      <Branches y={275} side={1} opacity={update} />
      <Branches y={420} side={1} />
      <Text x={80} y={130}>
        高处
      </Text>
      <Text x={80} y={275}>
        E
      </Text>
      <Text x={80} y={420}>
        低处
      </Text>
      <Text x={600} y={70}>
        各高度的处理进度
      </Text>
      <Card x={600} y={130} color={colors.violet}>
        {all === 1 ? "已更新" : "未处理"}
      </Card>
      <Card x={600} y={275} color={colors.amber}>
        {update === 1 ? "已更新" : "当前"}
      </Card>
      <Card x={600} y={420} color={colors.emerald}>
        已更新
      </Card>
      <Text x={390} y={525} size={22}>
        局部枝条与阶段顺序示意
      </Text>
    </>
  );
}
function Boundary() {
  return (
    <>
      <rect x={130} y={90} width={270} height={330} fill={`${colors.blue}0c`} />
      <Line x1={400} y1={65} x2={400} y2={450} color={muted} dash />
      <Text x={400} y={35}>
        x=t
      </Text>
      <Text x={260} y={465}>
        严格左侧的无事件间隙
      </Text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Line
            x1={130}
            y1={150 + 100 * i}
            x2={400}
            y2={i === 0 ? 170 : 300}
            color={palette[i]}
          />
          <circle cx={400} cy={i === 0 ? 170 : 300} r={5} fill={palette[i]} />
          <Line
            x1={430}
            y1={i === 0 ? 170 : 300}
            x2={590}
            y2={160 + i * 90}
            color={palette[i]}
            dash
          />
          <Card x={660} y={160 + i * 90} color={palette[i]}>
            {i === 0 ? "较高" : "等高"}
          </Card>
        </g>
      ))}
      <Text x={390} y={525} size={22}>
        左侧高低保持到边界，允许相等与结束
      </Text>
    </>
  );
}
function Block({ row, state }: { row: TimelineRow; state: VisualState }) {
  const move = row.id === "SR10" ? state.motion : row.id === "SR11" ? 1 : 0;
  return (
    <>
      <Line x1={95} y1={450} x2={95} y2={65} color={muted} />
      <path
        d="M88 78 L95 65 L102 78"
        fill="none"
        stroke={muted}
        strokeWidth={2}
      />
      <Text x={95} y={40}>
        高度
      </Text>
      <Line x1={105} y1={275} x2={730} y2={275} color={colors.amber} dash />
      <Text x={60} y={275}>
        h
      </Text>
      <rect
        x={250}
        y={230}
        width={350}
        height={90}
        fill={`${colors.amber}0e`}
        stroke={colors.amber}
        strokeDasharray="6 5"
      />
      {[
        { x: 170, y: 390, c: colors.emerald },
        { x: 300, y: 275, c: colors.blue },
        { x: 425, y: 275, c: colors.orange },
        { x: 550, y: 275, c: colors.violet },
        { x: 675, y: 140, c: colors.emerald },
      ].map((p, i) => (
        <g key={i} opacity={i === 2 ? 1 - move : 1}>
          <circle cx={p.x} cy={p.y} r={9} fill={p.c} />
          {i > 0 ? (
            <Line
              x1={i === 1 ? 170 : p.x - 125}
              y1={i === 1 ? 390 : 275}
              x2={p.x}
              y2={p.y}
              color={muted}
            />
          ) : null}
        </g>
      ))}
      <circle cx={425} cy={275} r={9} fill={colors.emerald} opacity={move} />
      <path
        d="M160 460 H700 M687 453 L700 460 L687 467"
        fill="none"
        stroke={muted}
        strokeWidth={2}
      />
      <Text x={425} y={495}>
        按维护顺序，从下方成员读到上方成员
      </Text>
      <Text x={390} y={535} size={21}>
        横向表示列表位置；点的竖向表示在本列的高度
      </Text>
    </>
  );
}
function Roles({ row, state }: { row: TimelineRow; state: VisualState }) {
  const detail = ["SR14", "SR15", "SR16"].includes(row.id);
  const remove = row.id === "SR15" ? state.motion : row.id === "SR16" ? 1 : 0;
  return (
    <>
      <Line x1={350} y1={60} x2={350} y2={475} color={muted} dash />
      <Text x={350} y={35}>
        x=t
      </Text>
      <Line x1={150} y1={410} x2={550} y2={150} color={colors.blue} />
      <circle cx={350} cy={280} r={6} fill={colors.blue} />
      <Text x={305} y={250}>
        E
      </Text>
      <Line x1={130} y1={120} x2={570} y2={120} color={colors.violet} />
      <circle cx={350} cy={120} r={5} fill={colors.violet} />
      <Text x={650} y={120}>
        高处
      </Text>
      {detail ? (
        <>
          <g opacity={1 - remove}>
            <Line x1={150} y1={190} x2={350} y2={280} color={colors.orange} />
            <circle
              cx={350}
              cy={280}
              r={7}
              fill="none"
              stroke={colors.orange}
              strokeWidth={3}
            />
            <Text x={130} y={160} color={colors.orange}>
              结束者
            </Text>
          </g>
          <Line x1={350} y1={280} x2={570} y2={390} color={colors.emerald} />
          <Text x={630} y={410} color={colors.emerald}>
            开始者
          </Text>
          <Text x={125} y={440} color={colors.blue}>
            穿过者
          </Text>
        </>
      ) : null}
      {row.id === "SR16" ? (
        <path
          d="M350 266 L364 280 L350 294 L336 280 Z"
          fill="none"
          stroke={colors.amber}
          strokeWidth={3}
        />
      ) : null}
      <Text x={390} y={525} size={22}>
        非竖直直线在本列只有一个交点
      </Text>
    </>
  );
}
function Neighbors({ row, state }: { row: TimelineRow; state: VisualState }) {
  const frame = 30 + state.progress * row.readingFrames;
  const operation = (start: number, end: number) =>
    Math.max(
      0,
      Math.min(
        1,
        (frame - row.captions[start].start) /
          (row.captions[end].end - row.captions[start].start),
      ),
    );
  const insert = row.id === "SR20" && state.active && state.phase < 2;
  const empty =
    row.id === "SR20"
      ? state.phase < 2
        ? 0
        : operation(2, 3)
      : row.id === "SR21"
        ? 1
        : 0;
  return (
    <>
      <Text x={390} y={45}>
        {insert
          ? "旧块为空：在空隙加入开始者"
          : row.id === "SR20"
            ? "另一分支：新块为空，接起两侧"
            : "顺序示意：块外位置保持"}
      </Text>
      <Card x={390} y={115} color={colors.violet}>
        上方外侧
      </Card>
      <Card x={390} y={435} color={colors.emerald}>
        下方外侧
      </Card>
      {insert ? (
        <>
          <Card
            x={540 - 150 * operation(0, 1)}
            y={275}
            color={colors.blue}
            opacity={operation(0, 1)}
          >
            开始者
          </Card>
          <Line x1={390} y1={138} x2={390} y2={230} color={colors.amber} />
          <Line x1={390} y1={320} x2={390} y2={412} color={colors.amber} />
        </>
      ) : (
        <g opacity={1 - empty}>
          <Card x={390} y={235} color={colors.blue}>
            新块上端
          </Card>
          <Card x={390} y={315} color={colors.orange}>
            新块下端
          </Card>
          <Line
            x1={390}
            y1={138}
            x2={390}
            y2={212}
            color={colors.amber}
            width={5}
          />
          <Line
            x1={390}
            y1={338}
            x2={390}
            y2={412}
            color={colors.amber}
            width={5}
          />
        </g>
      )}
      {empty > 0 ? (
        <g opacity={empty}>
          <path
            d="M450 115 H570 V435 H450"
            fill="none"
            stroke={colors.amber}
            strokeWidth={4}
          />
          <Text x={640} y={275}>
            新邻接
          </Text>
        </g>
      ) : null}
      <Text x={390} y={525} size={22}>
        {row.id === "SR20"
          ? "插入占据空隙；移空后连接两侧"
          : "内部已相交；边界与空块连接需要检查"}
      </Text>
    </>
  );
}
function Target({ row, state }: { row: TimelineRow; state: VisualState }) {
  const discovery = row.page === "discover";
  const low =
    row.id === "SR27" ? state.motion : row.id === "SR28" || discovery ? 1 : 0;
  return (
    <>
      <Line x1={340} y1={65} x2={340} y2={430} color={muted} dash />
      <Text x={340} y={35}>
        x=u_*
      </Text>
      {[-1, 0, 1].map((s, i) => (
        <Line
          key={s}
          x1={140}
          y1={180 + s * 65}
          x2={340}
          y2={180}
          color={palette[i]}
        />
      ))}
      <circle
        cx={340}
        cy={180}
        r={8}
        fill="white"
        stroke={ink}
        strokeWidth={2}
      />
      <Text x={410} y={175}>
        F_*
      </Text>
      {[0, 1, 2].map((i) => (
        <Card key={i} x={620} y={115 + i * 65} color={palette[i]}>
          目标组
        </Card>
      ))}
      <rect
        x={545}
        y={80}
        width={150}
        height={200}
        fill="none"
        stroke={colors.amber}
        strokeWidth={2}
        strokeDasharray="6 6"
      />
      {discovery ? (
        <>
          <path
            d="M710 115 H730 V180 H710"
            fill="none"
            stroke={colors.amber}
            strokeWidth={4}
          />
          <path
            d="M710 180 Q765 460 180 460"
            fill="none"
            stroke={colors.amber}
            strokeWidth={2}
            strokeDasharray="6 6"
          />
        </>
      ) : null}
      <Branches x={340} y={375} side={-1} opacity={1 - low} />
      <Branches x={340} y={375} side={1} opacity={low} />
      <Card x={620} y={420} color={colors.emerald}>
        低处块
      </Card>
      {row.id === "SR28" ? (
        <Card
          x={440 + 180 * state.motion}
          y={330}
          color={colors.amber}
          opacity={state.motion}
        >
          新低处组
        </Card>
      ) : null}
      {discovery ? (
        <>
          <Line x1={100} y1={470} x2={700} y2={470} color={muted} />
          <circle cx={180} cy={470} r={7} fill={colors.blue} />
          <Text x={180} y={510}>
            邻接形成
          </Text>
          {row.id === "SR31" ? (
            <>
              <circle cx={410} cy={470} r={7} fill={colors.orange} />
              <Text x={410} y={510}>
                覆盖首次足够
              </Text>
            </>
          ) : null}
          <circle cx={690} cy={470} r={7} fill="white" stroke={ink} />
          <Text x={690} y={510}>
            目标
          </Text>
        </>
      ) : (
        <Text x={390} y={520} size={22}>
          低处操作始终在目标块外；空心圈不是已预约标记
        </Text>
      )}
    </>
  );
}
function Range({
  y,
  start,
  end,
  color,
  opacity = 1,
}: {
  y: number;
  start: number;
  end: number;
  color: string;
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      <Line x1={start} y1={y} x2={end} y2={y} color={color} width={4} />
      <circle cx={start} cy={y} r={5} fill={color} />
      <circle cx={end} cy={y} r={5} fill={color} />
    </g>
  );
}
function Coverage({ row, state }: { row: TimelineRow; state: VisualState }) {
  const ending =
    row.id === "SR40" || row.page === "high-ending" || row.id === "SR48";
  const two = row.page === "two-checks" || row.page === "high-ending";
  const extension = row.page === "extension";
  const extended = extension ? (row.id === "SR46" ? state.motion : 1) : 0;
  const current = 260,
    far = ending ? current : extension ? (extended > 0 ? 660 : 430) : 620;
  const target = ending ? current : 490;
  const empty = row.id === "SR48" ? state.motion : 0;
  const removed = row.id === "SR47" ? state.motion : row.id === "SR48" ? 1 : 0;
  return (
    <>
      <Text x={390} y={40}>
        {row.id === "SR48"
          ? "另一分支：当前成员全部在 t 结束"
          : row.id === "SR47"
            ? "结束分支：当前列已到短成员右端"
            : "成员的 x 范围（分行不表示几何高度）"}
      </Text>
      <Line x1={current} y1={85} x2={current} y2={430} color={muted} dash />
      <Text x={current} y={465}>
        t
      </Text>
      <g opacity={1 - empty}>
        <Range
          y={155}
          start={140}
          end={row.id === "SR46" ? 430 : extension || ending ? current : 450}
          color={colors.blue}
          opacity={1 - removed}
        />
        <Range
          y={255}
          start={extension && !ending ? current : 180}
          end={extension && !ending ? 660 : far}
          color={colors.blue}
          opacity={row.id === "SR46" ? extended : 1}
        />
        <Text x={80} y={205} color={colors.blue}>
          {row.visibleStep >= 1 ? "G_a" : ""}
        </Text>
        {row.id >= "SR38" ? (
          <Text x={far} y={295} color={colors.blue}>
            {"R_{G_a}"}
          </Text>
        ) : null}
        {row.id === "SR38" ? (
          <Line
            x1={current}
            y1={255}
            x2={current + (far - current) * state.motion}
            y2={255}
            color={colors.amber}
            width={7}
          />
        ) : null}
      </g>
      {two ? (
        <>
          <Range
            y={370}
            start={150}
            end={ending ? current : 680}
            color={colors.orange}
          />
          <Text x={80} y={370} color={colors.orange}>
            G_b
          </Text>
          <Text x={ending ? current : 680} y={410} color={colors.orange}>
            {"R_{G_b}"}
          </Text>
        </>
      ) : null}
      {row.id === "SR39" || two ? (
        <>
          <Line
            x1={target}
            y1={95}
            x2={target}
            y2={435}
            color={colors.amber}
            dash
          />
          <Text x={target} y={ending ? 100 : 495} color={colors.amber}>
            {ending ? "u=t" : "u"}
          </Text>
        </>
      ) : null}
      {row.id === "SR43" ? (
        <Line
          x1={current}
          y1={state.phase === 0 ? 255 : 370}
          x2={target}
          y2={state.phase === 0 ? 255 : 370}
          color={colors.amber}
          width={7}
        />
      ) : null}
      {row.id === "SR48" ? (
        <>
          <Range y={355} start={530} end={700} color={muted} />
          <Text x={610} y={390}>
            未来开始者
          </Text>
        </>
      ) : null}
      <path
        d="M110 440 H730 M718 433 L730 440 L718 447"
        fill="none"
        stroke={muted}
        strokeWidth={2}
      />
      <Text x={750} y={440}>
        x
      </Text>
      <Text x={390} y={540} size={21}>
        {ending
          ? row.id === "SR45"
            ? "闭覆盖不等于严格未来"
            : "高处结束组：闭范围仍包含本列"
          : extension
            ? "只在成员自己的开始或结束位置更新"
            : "闭端点计入覆盖；未来资格另行比较"}
      </Text>
    </>
  );
}
function Report({ row, state }: { row: TimelineRow; state: VisualState }) {
  if (row.id === "SR34")
    return (
      <>
        <Text x={390} y={60}>
          同组身份分别保留
        </Text>
        <Range y={170} start={220} end={580} color={colors.blue} />
        <Range y={280} start={220} end={650} color={colors.orange} />
        <Line x1={220} y1={120} x2={220} y2={350} color={muted} dash />
        <Text x={220} y={390}>
          同一开始位置
        </Text>
        <Range y={450} start={220} end={580} color={colors.violet} />
        <Text x={390} y={515}>
          原始输入对的完整交集
        </Text>
      </>
    );
  return (
    <>
      <Text x={390} y={50}>
        跨组展开示意（任意组成员数）
      </Text>
      {[180, 330].map((y, i) => (
        <Card key={y} x={180} y={y} color={colors.blue}>
          {i === 0 ? "组内身份一" : "组内身份二"}
        </Card>
      ))}
      <Card x={610} y={255} color={colors.orange}>
        另一组身份
      </Card>
      {[180, 330].map((y, i) => (
        <Line
          key={y}
          x1={240}
          y1={y}
          x2={550}
          y2={255}
          color={i === state.phase ? colors.amber : muted}
          width={i === state.phase ? 4 : 2}
        />
      ))}
      <Range y={440} start={200} end={600} color={colors.violet} />
      <Text x={390} y={500}>
        旧同线对的完整区间保留
      </Text>
    </>
  );
}
export function ReasonDiagram({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const props = { row, state };
  const kind = pages[row.page].diagram;
  return (
    <svg
      width={780}
      height={560}
      viewBox="0 0 780 560"
      data-geometry-inputs
      aria-label="一般理由教学示意"
    >
      {kind === "progress" ? (
        <Progress {...props} />
      ) : kind === "boundary" ? (
        <Boundary />
      ) : kind === "block" ? (
        <Block {...props} />
      ) : kind === "roles" ? (
        <Roles {...props} />
      ) : kind === "neighbors" ? (
        <Neighbors {...props} />
      ) : kind === "target" ? (
        <Target {...props} />
      ) : kind === "coverage" ? (
        <Coverage {...props} />
      ) : kind === "report" ? (
        <Report {...props} />
      ) : null}
    </svg>
  );
}
