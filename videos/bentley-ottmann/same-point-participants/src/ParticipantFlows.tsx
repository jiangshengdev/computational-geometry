import { useId } from "react";
import { SvgMathText as Label } from "./MathText";
import { objectColors } from "./teaching-colors";
import { colors, tints } from "../../colors";

type Cue = {
  target: string | null;
  progress: number;
  reached: string[];
  visibleStep: number;
  activeCaption: number | null;
  thinking: boolean;
};
const muted = "#94a3b8";

/** A token represents an input identity, never a geometric position. */
function Identity({
  name,
  x,
  y,
  active = false,
  width = 100,
}: {
  name: string;
  x: number;
  y: number;
  active?: boolean;
  width?: number;
}) {
  return (
    <g data-diagram-object={name}>
      <rect
        x={x}
        y={y}
        width={width}
        height={56}
        rx={8}
        fill={active ? tints.active : "#edf1f6"}
        stroke={objectColors[name]}
        strokeWidth={2}
      />
      <Label
        x={x + width / 2}
        y={y + 38}
        align="center"
        fill={objectColors[name]}
      >
        {name}
      </Label>
    </g>
  );
}

/** Shared connector for this episode's identity and membership flows. */
function Arrow({ d, active = false }: { d: string; active?: boolean }) {
  const id = useId().replace(/:/g, "");
  const color = active ? colors.amber : muted;
  return (
    <g>
      <defs>
        <marker
          id={id}
          markerWidth={8}
          markerHeight={8}
          refX={7}
          refY={4}
          orient="auto"
        >
          <path d="M0 0 L8 4 L0 8 Z" fill={color} />
        </marker>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={active ? 3 : 2}
        markerEnd={`url(#${id})`}
      />
    </g>
  );
}

export function RoleDiagram({ visibleStep, target }: Cue) {
  const roles = [
    {
      name: "B",
      label: "开始者",
      step: 2,
      y: 125,
      left: false,
      right: true,
      rise: -40,
    },
    {
      name: "A",
      label: "结束者",
      step: 3,
      y: 255,
      left: true,
      right: false,
      rise: 0,
    },
    {
      name: "C",
      label: "严格穿过者",
      step: 4,
      y: 385,
      left: true,
      right: true,
      rise: 40,
    },
    {
      name: "D",
      label: "严格穿过者",
      step: 4,
      y: 515,
      left: true,
      right: true,
      rise: -60,
    },
  ];
  return (
    <svg
      width={780}
      height={610}
      viewBox="0 0 780 610"
      aria-label="各行独立示意角色在事件两侧的存在范围"
    >
      <Label x={390} y={30} align="center" fontSize={24}>
        角色示意：各行分别观察
      </Label>
      <Label x={265} y={75} align="center" fontSize={26}>
        左侧
      </Label>
      <Label x={420} y={75} align="center" fontSize={26}>
        当前 P
      </Label>
      <Label x={625} y={75} align="center" fontSize={26}>
        右侧
      </Label>
      <line
        x1={420}
        y1={90}
        x2={420}
        y2={575}
        stroke={muted}
        strokeDasharray="5 7"
      />
      {roles.map((r) => (
        <g
          key={r.name}
          visibility={visibleStep >= r.step ? "visible" : "hidden"}
          data-role={r.name}
        >
          <Label x={25} y={r.y - 10} fontSize={26}>
            {r.label}
          </Label>
          <Label x={160} y={r.y - 10} fill={objectColors[r.name]}>
            {r.name}
          </Label>
          <line
            x1={r.left ? 220 : 420}
            y1={r.y - (r.left ? r.rise : 0)}
            x2={r.right ? 620 : 420}
            y2={r.y + (r.right ? r.rise : 0)}
            stroke={objectColors[r.name]}
            strokeWidth={2.5}
          />
          <circle cx={420} cy={r.y} r={5} fill={objectColors[r.name]} />
          {target === r.name && (
            <circle
              cx={420}
              cy={r.y}
              r={16}
              fill="none"
              stroke={colors.amber}
              strokeWidth={3}
            />
          )}
          {!r.left && (
            <Label x={265} y={r.y + 20} align="center" fontSize={24}>
              尚未开始
            </Label>
          )}
          {!r.right && (
            <Label x={625} y={r.y + 20} align="center" fontSize={24}>
              已经结束
            </Label>
          )}
        </g>
      ))}
    </svg>
  );
}

export function EventRecordDiagram({ visibleStep, target }: Cue) {
  const endpoints = visibleStep >= 2;
  return (
    <svg
      width={780}
      height={610}
      viewBox="0 0 780 610"
      aria-label="多个来源汇入同一事件位置，端点身份保留"
    >
      <Label x={180} y={45} align="center" fontSize={27}>
        已知来源
      </Label>
      {[
        { text: "A 的结束", y: 100, endY: 260 },
        { text: "B 的开始", y: 235, endY: 275 },
        { text: "A、C 预约交点", y: 370, endY: 290 },
      ].map((r) => (
        <g key={r.text}>
          <rect x={30} y={r.y} width={285} height={68} rx={8} fill="#edf1f6" />
          <Label x={172} y={r.y + 44} align="center" fontSize={29}>
            {r.text}
          </Label>
          <Arrow
            d={`M325 ${r.y + 34} L420 ${r.endY}`}
            active={target === "merge" || (target === "endpoints" && r.y < 370)}
          />
        </g>
      ))}
      <rect
        x={430}
        y={150}
        width={315}
        height={300}
        rx={12}
        fill={target === "merge" ? tints.attention : "#edf1f6"}
        stroke={muted}
        strokeWidth={2}
      />
      <Label x={588} y={202} align="center" fontSize={32}>
        同一位置 P
      </Label>
      <line x1={450} y1={230} x2={725} y2={230} stroke={muted} />
      {endpoints && (
        <g data-event-identities="B,A">
          <Label x={458} y={290} fontSize={27}>
            开始者
          </Label>
          <Identity name="B" x={620} y={250} active={target === "endpoints"} />
          <Label x={458} y={385} fontSize={27}>
            结束者
          </Label>
          <Identity name="A" x={620} y={345} active={target === "endpoints"} />
        </g>
      )}
      {visibleStep >= 3 && (
        <g>
          <Arrow d="M588 460 V505" active={target === "keep"} />
          <Label x={588} y={550} align="center" fontSize={28}>
            保留到取出，统一处理一次
          </Label>
        </g>
      )}
    </svg>
  );
}

const oldOrder = ["D", "A", "C"];

export function CollectionDiagram({ page, ...cue }: Cue & { page: string }) {
  const { target, progress, reached, visibleStep, activeCaption, thinking } =
    cue;
  if (page === "collect") {
    const merged = reached.includes("merge");
    const duplicate = visibleStep >= 2;
    return (
      <svg
        width={780}
        height={610}
        viewBox="0 0 780 610"
        aria-label="旧块与开始者汇入按原始编号列出的参与者名单"
      >
        <Label x={160} y={45} align="center" fontSize={29}>
          旧相遇块
        </Label>
        <Arrow d="M60 395 V100" />
        <Label x={60} y={82} align="center" fontSize={23}>
          上
        </Label>
        <Label x={60} y={430} align="center" fontSize={23}>
          下
        </Label>
        {oldOrder.map((name, i) => (
          <Identity
            key={name}
            name={name}
            x={110}
            y={340 - i * 110}
            active={target === "old" || target === name}
          />
        ))}
        <path
          d="M225 120 H250 V396 H225"
          fill="none"
          stroke={muted}
          strokeWidth={2}
        />
        <Label x={395} y={330} align="center" fontSize={27}>
          开始者
        </Label>
        <Identity
          name="B"
          x={345}
          y={350}
          active={target === "B" || target === "merge"}
        />
        {merged && (
          <g>
            <Arrow d="M255 260 H550" active={target === "merge"} />
            <Arrow d="M455 378 Q520 378 550 300" active={target === "merge"} />
            <rect
              x={565}
              y={85}
              width={170}
              height={460}
              rx={10}
              fill="none"
              stroke={muted}
              strokeWidth={1.5}
            />
            <Label x={650} y={45} align="center" fontSize={29}>
              当前参与者
            </Label>
            {["A", "B", "C", "D"].map((name, i) => (
              <Identity
                key={name}
                name={name}
                x={600}
                y={110 + i * 110}
                active={target === name}
              />
            ))}
            <Label x={650} y={585} align="center" fontSize={24}>
              按原始编号列出
            </Label>
          </g>
        )}
        {duplicate && (
          <g data-duplicate-identity="A">
            <Label x={395} y={75} align="center" fontSize={24}>
              端点记录：A 结束
            </Label>
            <Identity name="A" x={345} y={110} active={target === "A"} />
            <Arrow d="M455 138 H585" active={target === "A"} />
            <Label x={405} y={205} align="center" fontSize={24}>
              同一编号，指向已有项
            </Label>
          </g>
        )}
      </svg>
    );
  }
  const searching = page === "height-search";
  const collecting = searching && visibleStep >= 3;
  const selected =
    target === "collect-old" ? Math.min(2, Math.floor(progress * 3)) : -1;
  const candidateY = 378 - Math.max(0, selected) * 105;
  const collected =
    selected >= 0 ? selected + 1 : reached.includes("collect-old") ? 3 : 0;
  const emptyBranch =
    collecting && ((activeCaption !== null && activeCaption >= 1) || thinking);
  return (
    <svg
      width={780}
      height={610}
      viewBox="0 0 780 610"
      aria-label="按旧顺序向上定位相等块，再逐条收集"
    >
      <Label x={205} y={35} align="center" fontSize={29}>
        {searching ? "旧顺序中的相等块" : "旧相遇块"}
      </Label>
      <Arrow d="M35 440 V110" active={target === "old"} />
      <Label x={35} y={90} align="center" fontSize={23}>
        上
      </Label>
      <Label x={35} y={475} align="center" fontSize={23}>
        下
      </Label>
      {searching && (
        <g>
          <Label x={110} y={95} fontSize={24}>
            高于 y_P（若有）
          </Label>
          <Label x={110} y={462} fontSize={24}>
            低于 y_P（若有）
          </Label>
          <path d="M85 114 H365 M85 430 H365" stroke={muted} fill="none" />
        </g>
      )}
      {oldOrder.map((name, i) => (
        <g key={name}>
          <Identity
            name={name}
            x={110}
            y={350 - i * 105}
            active={target === "old" || target === name || i === selected}
          />
          {searching && (
            <Label x={240} y={388 - i * 105} fontSize={27}>
              =y_P
            </Label>
          )}
        </g>
      ))}
      <path
        d="M360 135 H385 V410 H360"
        fill="none"
        stroke={target === "old" ? colors.amber : muted}
        strokeWidth={2}
      />
      {!searching && (
        <g>
          <Label x={590} y={210} align="center" fontSize={28}>
            开始者
          </Label>
          <Identity name="B" x={540} y={240} />
          <Label x={590} y={355} align="center" fontSize={25}>
            尚未加入旧顺序
          </Label>
        </g>
      )}
      {searching && (
        <g>
          {!emptyBranch &&
            (target === "search" || target === "collect-old") && (
              <Arrow
                d={`M60 470 V${candidateY + 10} Q60 ${candidateY} 70 ${candidateY} H100`}
                active
              />
            )}
          {collecting && (
            <g
              data-collected-identities={oldOrder.slice(0, collected).join(",")}
            >
              <Label x={35} y={525} fontSize={27}>
                本例已收集
              </Label>
              {oldOrder.slice(0, collected).map((name, i) => (
                <Identity
                  key={name}
                  name={name}
                  x={225 + i * 120}
                  y={493}
                  active={i === selected}
                />
              ))}
              {((collected === 3 && target !== "collect-old") ||
                (target === "collect-old" && progress > 0.9)) && (
                <Label x={200} y={588} align="center" fontSize={25}>
                  再遇不等者，停止收集
                </Label>
              )}
            </g>
          )}
          {emptyBranch ? (
            <g data-empty-block>
              <Label x={590} y={100} align="center" fontSize={27}>
                另一种情况：空块
              </Label>
              <Label x={590} y={175} align="center" fontSize={26}>
                首个候选高于 y_P
              </Label>
              <Label x={590} y={225} align="center" fontSize={24}>
                或没有候选
              </Label>
              <Arrow d="M590 250 V310" active={target === "search"} />
              <Label x={590} y={360} align="center" fontSize={29}>
                相等块为空
              </Label>
              <Label x={590} y={415} align="center" fontSize={24}>
                只得到插入空隙
              </Label>
            </g>
          ) : (
            <g>
              <Label x={590} y={170} align="center" fontSize={27}>
                在 x_P 比较高度
              </Label>
              {visibleStep >= 2 && (
                <g>
                  <Label x={590} y={250} align="center" fontSize={25}>
                    定位第一条不低于 y_P
                  </Label>
                  <Arrow d="M540 290 L405 378" active={target === "search"} />
                </g>
              )}
            </g>
          )}
          <Label x={590} y={45} align="center" fontSize={22}>
            块外仅示意高度范围
          </Label>
        </g>
      )}
    </svg>
  );
}

/** Geometry stays in place; only the membership list changes after reporting. */
export function PointMembership({
  current,
  continuing,
  showRight,
  compact = false,
}: {
  current: string[];
  continuing: string[];
  showRight: boolean;
  compact?: boolean;
}) {
  const width = compact ? 365 : 755;
  const rightX = compact ? 250 : 520;
  return (
    <svg
      width={width}
      height={135}
      viewBox={`0 0 ${width} 135`}
      aria-label="当前位置参与者与右侧活动成员"
    >
      <Label x={10} y={28} fontSize={compact ? 23 : 26}>
        当前参与
      </Label>
      {current.map((name, i) => (
        <Identity
          key={name}
          name={name}
          x={10 + i * (compact ? 75 : 110)}
          y={48}
          width={compact ? 65 : 95}
        />
      ))}
      {showRight && (
        <g data-right-members={continuing.join(",")}>
          <Arrow d={`M${compact ? 170 : 365} 76 H${rightX - 20}`} />
          <Label x={rightX} y={28} fontSize={compact ? 23 : 26}>
            右侧活动
          </Label>
          {continuing.length ? (
            continuing.map((name, i) => (
              <Identity
                key={name}
                name={name}
                x={rightX + i * 100}
                y={48}
                width={compact ? 65 : 95}
              />
            ))
          ) : (
            <Label x={rightX + 30} y={88} align="center" fontSize={29}>
              空
            </Label>
          )}
        </g>
      )}
    </svg>
  );
}
