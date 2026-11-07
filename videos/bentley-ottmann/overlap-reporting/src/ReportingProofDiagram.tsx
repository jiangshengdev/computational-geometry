import { SvgMathText as Label } from "../../../shared/ui/SemanticMathText";
import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import { colors } from "../../colors.ts";
import type { TimelineRow, VisualState } from "./timeline";

const ink = "#172c45";
const guide = "#94a3b8";

export const proofIdentityMarks = ["i", "j"].flatMap((index) =>
  ["S", "\\ell", "r"].map((base) => ({
    term: `${base}_${index}`,
    color: index === "i" ? colors.blue : colors.orange,
  })),
);

/** Independent horizontal-range panels, never different geometric heights.
 * Pixel positions express only the stated ordering, not numerical inputs. */
function Range({
  y,
  start,
  end,
  name,
  endpoints = true,
  active = false,
  progress = 1,
}: {
  y: number;
  start: number;
  end: number;
  name: "i" | "j";
  endpoints?: boolean;
  active?: boolean;
  progress?: number;
}) {
  const color = name === "i" ? colors.blue : colors.orange;
  return (
    <g data-range={name}>
      <path d={`M125 ${y} H715 l-9 -5 m9 5 l-9 5`} fill="none" stroke={guide} />
      <Label
        x={80}
        y={y}
        align="center"
        verticalAlign="middle"
        fontSize={25}
        fill={color}
      >{`S_${name}`}</Label>
      <line x1={start} x2={end} y1={y} y2={y} stroke={color} strokeWidth={3} />
      {[start, end].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={4} fill={color} />
          {endpoints ? (
            <Label
              x={x}
              y={y + 27}
              align="center"
              fontSize={24}
              fill={color}
            >{`${i ? "r" : "\\ell"}_${name}`}</Label>
          ) : null}
        </g>
      ))}
      {active ? (
        <AttentionMarks
          marks={[{ kind: "line", from: [start, y], to: [end, y], color }]}
          progress={progress}
        />
      ) : null}
    </g>
  );
}

function RangeCase({
  y,
  kind,
  active,
  progress = 1,
  qualified = false,
}: {
  y: number;
  kind: "inside" | "touch" | "apart";
  active?: boolean;
  progress?: number;
  qualified?: boolean;
}) {
  const begin = kind === "inside" ? 330 : kind === "touch" ? 470 : 570;
  // Keep SVG geometry and foreignObject labels in the same coordinate space.
  // Ancestor SVG transforms can move the geometry without its HTML labels.
  return (
    <g data-range-case={kind}>
      <Label x={30} y={y + 12} fontSize={23}>
        {kind === "inside"
          ? "严格在右端以前"
          : kind === "touch"
            ? "恰好在右端"
            : "先结束，后开始"}
      </Label>
      <Range
        y={y + 43}
        start={180}
        end={470}
        name="i"
        active={active}
        progress={progress}
      />
      <Range y={y + 105} start={begin} end={660} name="j" />
      <line
        x1={begin}
        x2={begin}
        y1={y + 25}
        y2={y + 115}
        stroke={colors.amber}
        strokeDasharray="5 5"
      />
      {qualified ? (
        <Label x={735} y={y + 40} align="right" fontSize={21}>
          {kind === "apart" ? "不在配对名单" : "旧成员仍在"}
        </Label>
      ) : null}
    </g>
  );
}

function JoiningPair({ paired }: { paired: boolean }) {
  return (
    <g data-joining-pair={paired ? "paired" : "waiting"}>
      <rect
        x={95}
        y={210}
        width={230}
        height={72}
        rx={10}
        fill="none"
        stroke={guide}
      />
      <Label
        x={210}
        y={246}
        align="center"
        verticalAlign="middle"
        fontSize={24}
      >
        先处理者已在组内
      </Label>
      <rect
        x={455}
        y={210}
        width={230}
        height={72}
        rx={10}
        fill="none"
        stroke={guide}
      />
      <Label
        x={570}
        y={246}
        align="center"
        verticalAlign="middle"
        fontSize={24}
      >
        后处理者
      </Label>
      {paired ? (
        <>
          <path
            d="M455 246 H335 l12 -6 m-12 6 l12 6"
            stroke={colors.amber}
            fill="none"
            strokeWidth={2}
          />
          <Label x={390} y={225} align="center" fontSize={22}>
            配对
          </Label>
        </>
      ) : null}
    </g>
  );
}

function GeneralGroups({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const n = Number(row.id.slice(2));
  const has = (op: string) => state.operations.includes(op);
  const expand = n > 38 || has("expand");
  return (
    <>
      <Label x={390} y={25} align="center" fontSize={23}>
        任取两组 · 成员数量不限
      </Label>
      {n > 38 || has("groupPair") ? (
        <g data-general-groups>
          {[110, 490].map((x, group) => (
            <g key={x}>
              <rect
                x={x}
                y={55}
                width={180}
                height={195}
                rx={10}
                fill="none"
                stroke={guide}
              />
              <Label x={x + 90} y={80} align="center" fontSize={23}>
                {group ? "另一组" : "一组"}
              </Label>
              {[120, 210].map((y) => (
                <circle
                  key={y}
                  cx={x + 90}
                  cy={y}
                  r={8}
                  fill={group ? colors.orange : colors.blue}
                />
              ))}
              <Label x={x + 90} y={165} align="center" fontSize={27}>
                ⋮
              </Label>
              <Label x={x + 90} y={280} align="center" fontSize={22}>
                当前参与成员
              </Label>
            </g>
          ))}
          {expand ? (
            <g data-member-product>
              {[120, 210].flatMap((y, i) =>
                [120, 210].map((to, j) => (
                  <line
                    key={`${i}-${j}`}
                    x1={208}
                    x2={572}
                    y1={y}
                    y2={to}
                    stroke={guide}
                    strokeWidth={2}
                  />
                )),
              )}
              {state.operation === "expand" ? (
                <AttentionMarks
                  marks={[
                    {
                      kind: "line",
                      from: [208, 120],
                      to: [572, 120],
                      color: colors.amber,
                    },
                    {
                      kind: "line",
                      from: [208, 120],
                      to: [572, 210],
                      color: colors.amber,
                    },
                  ]}
                  progress={state.operationProgress}
                />
              ) : null}
            </g>
          ) : null}
        </g>
      ) : null}
      {n > 38 || has("unique") ? (
        <Label x={390} y={315} align="center" fontSize={23}>
          每个组对只展开一次
        </Label>
      ) : null}
      {n > 39 || has("pointOnly") ? (
        <g data-distinct-lines>
          <path
            d="M120 395 H360 M140 435 L340 355"
            stroke={guide}
            strokeWidth={2}
            fill="none"
          />
          <circle cx={240} cy={395} r={5} fill={colors.violet} />
          <Label x={240} y={465} align="center" fontSize={22}>
            不同直线，共享当前点
          </Label>
          <Label x={560} y={395} align="center" fontSize={24}>
            完整交集：这个点
          </Label>
        </g>
      ) : null}
      {n === 40 && has("pointIdentities") ? (
        <g data-point-identities>
          <circle cx={150} cy={530} r={6} fill={colors.violet} />
          <circle cx={330} cy={530} r={6} fill={colors.violet} />
          <path d="M160 530 H320" stroke={guide} />
          <Label x={240} y={570} align="center" fontSize={22}>
            同位置不同身份 · 关系示意
          </Label>
          {has("pointsOnly") ? (
            <Label x={560} y={530} align="center" fontSize={23}>
              无非零组时仍配对
            </Label>
          ) : null}
        </g>
      ) : null}
    </>
  );
}

export function ReportingProofDiagram({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const n = Number(row.id.slice(2));
  const has = (op: string) => state.operations.includes(op);
  return (
    <svg
      width={780}
      height={600}
      viewBox="0 0 780 600"
      fill={ink}
      aria-label="一般报告证明示意"
      data-reporting-proof={row.page}
    >
      {row.page === "general-cross" ? (
        <GeneralGroups row={row} state={state} />
      ) : (
        <>
          <Label
            x={390}
            y={25}
            align="center"
            verticalAlign="middle"
            fontSize={23}
          >
            x 坐标范围分图 · 非几何高度
          </Label>
          {row.page === "proof-setup" ? (
            <>
              <Range
                y={130}
                start={190}
                end={630}
                name="i"
                endpoints={n > 21 || (n === 21 && has("endsI"))}
                active={state.operation === "endsI"}
                progress={state.operationProgress}
              />
              <Range
                y={270}
                start={190}
                end={630}
                name="j"
                endpoints={n > 21 || (n === 21 && has("endsJ"))}
                active={state.operation === "endsJ"}
                progress={state.operationProgress}
              />
              <Label x={390} y={345} align="center" fontSize={22}>
                各自范围独立示意，暂不比较两份起点
              </Label>
              {n === 22 && has("orders") ? (
                <g data-start-orders>
                  {[
                    "\\ell_i<\\ell_j",
                    "\\ell_j<\\ell_i",
                    "\\ell_i=\\ell_j",
                  ].map((text, i) => (
                    <g key={text}>
                      <path
                        d={`M390 380 L${150 + i * 240} 435`}
                        stroke={guide}
                      />
                      <Label
                        x={150 + i * 240}
                        y={480}
                        align="center"
                        fontSize={27}
                        colorize
                        marks={proofIdentityMarks}
                      >
                        {text}
                      </Label>
                    </g>
                  ))}
                </g>
              ) : null}
            </>
          ) : row.page === "proof-later" ? (
            <>
              {n > 23 || has("overlap") ? (
                <RangeCase
                  y={55}
                  kind="inside"
                  qualified={n > 24 || has("inside")}
                  active={state.operation === "inside"}
                  progress={state.operationProgress}
                />
              ) : null}
              {n > 24 || has("touch") ? (
                <RangeCase
                  y={225}
                  kind="touch"
                  qualified={n > 24 || has("kept")}
                  active={state.operation === "kept"}
                  progress={state.operationProgress}
                />
              ) : null}
              {n > 23 || has("apart") ? (
                <RangeCase y={395} kind="apart" qualified />
              ) : null}
              {n === 25 ? (
                <Label x={390} y={580} align="center" fontSize={23}>
                  交换先后角色，理由相同
                </Label>
              ) : null}
            </>
          ) : (
            <>
              <Range y={85} start={210} end={520} name="i" />
              <Range y={155} start={210} end={650} name="j" />
              <line
                x1={210}
                x2={210}
                y1={78}
                y2={170}
                stroke={colors.amber}
                strokeDasharray="5 5"
              />
              {n > 26 || has("first") ? (
                <JoiningPair paired={n > 26 || has("pair")} />
              ) : null}
              {n > 27 || has("once") ? (
                <g data-pair-once>
                  <path
                    d="M140 350 H655 l-10 -5 m10 5 l-10 5"
                    fill="none"
                    stroke={guide}
                  />
                  <circle cx={170} cy={350} r={6} fill={colors.violet} />
                  <Label x={170} y={325} align="center" fontSize={23}>
                    加入时报告
                  </Label>
                  {n > 27 || has("noRepeat") ? (
                    <>
                      <circle cx={430} cy={350} r={5} fill={guide} />
                      <circle cx={630} cy={350} r={5} fill={guide} />
                      <Label x={430} y={325} align="center" fontSize={23}>
                        外部交叉
                      </Label>
                      <Label x={630} y={325} align="center" fontSize={23}>
                        结束
                      </Label>
                      <Label x={525} y={385} align="center" fontSize={22}>
                        不再枚举旧同线对
                      </Label>
                    </>
                  ) : null}
                </g>
              ) : null}
              {n === 28 && has("sharedPoint") ? (
                <Label x={210} y={70} align="center" fontSize={22}>
                  共同包含当前点
                </Label>
              ) : null}
              {n === 28 && has("apart") ? (
                <RangeCase y={425} kind="apart" qualified />
              ) : null}
            </>
          )}
        </>
      )}
    </svg>
  );
}
