import { SvgMathText } from "../../../shared/ui/SemanticMathText";
import { colors } from "../../colors.ts";
import { pages } from "./storyboard";
import type { TimelineRow, VisualState } from "./timeline";
import { CoverageExtension } from "./CoverageExtension";
const label = (x: number, y: number, text: string, fill = "#172c45") => (
  <SvgMathText x={x} y={y} fontSize={28} fill={fill}>
    {text}
  </SvgMathText>
);
export function ProofDiagram({
  row,
  state,
}: {
  row: TimelineRow;
  state: VisualState;
}) {
  const kind = pages[row.page].diagram;
  return (
    <svg width={800} height={550} viewBox="0 0 800 550" data-geometry-inputs>
      <defs>
        <marker
          id="axis-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8" fill="#64748b" />
        </marker>
      </defs>
      {label(20, 35, "一般关系示意（非执行轨迹）")}
      {kind === "column" && (
        <>
          <line
            x1={340}
            y1={80}
            x2={340}
            y2={490}
            stroke="#64748b"
            strokeDasharray="8 8"
          />
          {label(355, 490, "当前列")}
          <path
            d="M120 100 L340 210 M120 320 L340 210"
            stroke={colors.violet}
            strokeWidth={3}
            fill="none"
          />
          <circle cx={340} cy={210} r={6} fill={colors.violet} />
          {label(375, 175, "高处未处理：左侧状态")}
          {label(375, 220, "结束者仍保留")}
          <path
            d="M340 380 L580 280 M340 380 L580 470"
            stroke={colors.blue}
            strokeWidth={3}
            fill="none"
          />
          <circle cx={340} cy={380} r={6} fill={colors.blue} />
          {label(30, 420, "低处已处理")}
          {state.active && (
            <circle
              cx={340}
              cy={row.step === 1 ? 380 : 210}
              r={20}
              stroke={colors.amber}
              strokeWidth={3}
              fill="none"
            />
          )}
        </>
      )}
      {kind === "coverage" && (
        <>
          <line
            x1={120}
            y1={450}
            x2={720}
            y2={450}
            stroke="#64748b"
            markerEnd="url(#axis-arrow)"
          />
          {label(735, 460, "x")}
          <line
            x1={340}
            y1={100}
            x2={340}
            y2={450}
            stroke="#64748b"
            strokeDasharray="8 8"
          />
          {label(330, 495, "t")}
          <line
            x1={160}
            y1={190}
            x2={650}
            y2={190}
            stroke={colors.blue}
            strokeWidth={4}
          />
          <circle cx={160} cy={190} r={5} fill={colors.blue} />
          <circle cx={650} cy={190} r={5} fill={colors.blue} />
          {label(150, 160, "l_i")}
          {label(635, 160, "r_i")}
          {label(180, 235, "仍向右继续的成员")}
          {row.step >= 2 && (
            <>
              <line
                x1={180}
                y1={340}
                x2={340}
                y2={340}
                stroke={colors.violet}
                strokeWidth={4}
              />
              <circle cx={340} cy={340} r={6} fill={colors.violet} />
              {label(365, 350, "高处结束者：r_j=t")}
            </>
          )}
        </>
      )}
      {kind === "initial" && (
        <>
          {label(80, 130, "活动成员：空")}
          {label(80, 205, "组、顺序、覆盖：空")}
          {label(80, 280, "累计结果：空")}
          {row.step >= 2 && (
            <>
              <line
                x1={100}
                y1={400}
                x2={690}
                y2={400}
                stroke="#64748b"
                markerEnd="url(#axis-arrow)"
              />
              {[180, 300, 430, 590].map((x, i) => (
                <g key={x}>
                  <circle cx={x} cy={400} r={7} fill={colors.blue} />
                  {label(x - 35, 455, i === 3 ? "…" : "端点")}
                </g>
              ))}
              {label(110, 350, "已知位置按完整次序排列")}
            </>
          )}
          {row.step === 3 && (
            <circle
              cx={180}
              cy={400}
              r={20}
              stroke={colors.amber}
              strokeWidth={3}
              fill="none"
            />
          )}
        </>
      )}
      {kind === "participants" && (
        <>
          <path
            d="M100 130 L620 430 M100 430 L620 130 M100 280 L620 280"
            stroke={colors.blue}
            strokeWidth={3}
            fill="none"
          />
          {label(45, 90, "旧块：穿过者与结束者")}
          <circle cx={360} cy={280} r={7} fill={colors.blue} />
          {label(380, 325, "P")}
          <path d="M130 480 L360 280" stroke={colors.violet} strokeWidth={4} />
          <circle cx={360} cy={280} r={5} fill={colors.violet} />
          {label(30, 520, "结束者：报告后才退出")}
          {row.step >= 2 && (
            <>
              <path
                d="M360 280 L550 80"
                stroke={colors.violet}
                strokeWidth={4}
              />
              {label(560, 95, "开始者")}
              <circle
                cx={360}
                cy={280}
                r={14}
                stroke={colors.violet}
                strokeWidth={3}
                fill="none"
              />
              {label(450, 490, "点输入也在 P")}
            </>
          )}
        </>
      )}
      {kind === "report" && (
        <>
          <line
            x1={310}
            y1={100}
            x2={310}
            y2={470}
            stroke="#64748b"
            strokeDasharray="8 8"
          />
          {label(290, 505, "P")}
          <line
            x1={100}
            y1={170}
            x2={630}
            y2={170}
            stroke={colors.blue}
            strokeWidth={4}
          />
          <line
            x1={310}
            y1={270}
            x2={710}
            y2={270}
            stroke={colors.violet}
            strokeWidth={4}
          />
          {[100, 630].map((x) => (
            <circle key={x} cx={x} cy={170} r={6} fill={colors.blue} />
          ))}
          {[310, 710].map((x) => (
            <circle key={x} cx={x} cy={270} r={6} fill={colors.violet} />
          ))}
          {label(100, 140, "先开始的输入")}
          {label(385, 240, "后开始的输入")}
          {row.step >= 2 && (
            <>
              <line
                x1={310}
                y1={395}
                x2={630}
                y2={395}
                stroke={colors.blue}
                strokeWidth={7}
              />
              {[310, 630].map((x) => (
                <circle key={x} cx={x} cy={395} r={7} fill={colors.blue} />
              ))}
              {label(400, 445, "完整闭交集")}
            </>
          )}
        </>
      )}
      {kind === "update" && (
        <>
          <line
            x1={340}
            y1={90}
            x2={340}
            y2={500}
            stroke="#64748b"
            strokeDasharray="8 8"
          />
          <path
            d="M110 90 L340 180 M110 270 L340 180"
            stroke={colors.violet}
            strokeWidth={3}
            fill="none"
          />
          <circle cx={340} cy={180} r={6} fill={colors.violet} />
          {label(375, 150, "高处：保持旧状态")}
          <path
            d={
              row.step === 1
                ? "M110 290 L340 390 M110 490 L340 390"
                : "M340 390 L620 290 M340 390 L620 490"
            }
            stroke={colors.blue}
            strokeWidth={3}
            fill="none"
          />
          {row.step === 1 && (
            <>
              <path
                d="M100 390 L340 390"
                stroke={colors.violet}
                strokeWidth={4}
              />
              {label(100, 350, "结束者尚在")}
            </>
          )}
          <circle cx={340} cy={390} r={6} fill={colors.blue} />
          {label(355, 430, "P")}
          {row.step >= 2 && label(60, 530, "当前块：结束者退出，留下者取右序")}
        </>
      )}
      {kind === "checks" && (
        <>
          {row.step === 1 ? (
            <CoverageExtension stage={state.coverageStage} />
          ) : (
            <>
              <path
                d="M100 230 L270 230 M480 230 L700 230"
                stroke={colors.blue}
                strokeWidth={5}
              />
              {[100, 270, 480, 700].map((x) => (
                <circle key={x} cx={x} cy={230} r={6} fill={colors.blue} />
              ))}
              {label(100, 180, "已结束")}
              {label(480, 180, "尚未开始")}
              {label(300, 300, "空隙：无覆盖")}
              <line
                x1={380}
                y1={110}
                x2={380}
                y2={420}
                stroke="#64748b"
                strokeDasharray="8 8"
              />
              {label(350, 465, "当前列")}
            </>
          )}
        </>
      )}
      {kind === "queue" &&
        (row.page === "empty-queue" ? (
          <>
            {label(90, 130, "结束时的清单")}
            <rect
              x={90}
              y={170}
              width={570}
              height={95}
              rx={8}
              fill="none"
              stroke="#64748b"
              strokeWidth={2}
            />
            <SvgMathText
              x={375}
              y={217.5}
              fontSize={28}
              align="center"
              verticalAlign="middle"
            >
              空
            </SvgMathText>
            <circle cx={375} cy={400} r={8} fill={colors.blue} />
            {label(210, 460, "假设仍有最早剩余事件 Q")}
            {row.step >= 2 && (
              <>
                <path
                  d="M375 380 L375 285"
                  stroke={colors.violet}
                  strokeWidth={3}
                  markerEnd="url(#axis-arrow)"
                />
                {label(420, 350, "必已登记")}
              </>
            )}
          </>
        ) : (
          <>
            {label(60, 120, "真实事件：证明中的完整次序")}
            <line
              x1={90}
              y1={210}
              x2={710}
              y2={210}
              stroke="#64748b"
              markerEnd="url(#axis-arrow)"
            />
            <circle cx={160} cy={210} r={7} fill="#64748b" />
            <circle cx={380} cy={210} r={8} fill={colors.blue} />
            {label(90, 260, "已处理边界")}
            {label(365, 260, "Q")}
            {label(570, 205, "…")}
            {row.step >= 2 && (
              <>
                {label(60, 350, "清单中的真实未处理位置")}
                <rect
                  x={330}
                  y={380}
                  width={100}
                  height={70}
                  fill="none"
                  stroke={colors.blue}
                  strokeWidth={3}
                />
                <SvgMathText
                  x={380}
                  y={415}
                  fontSize={28}
                  align="center"
                  verticalAlign="middle"
                >
                  Q
                </SvgMathText>
                {label(470, 425, "其余已登记位置…")}
              </>
            )}
            {row.step >= 3 && (
              <path
                d="M380 365 L380 285"
                stroke={colors.violet}
                strokeWidth={3}
                markerEnd="url(#axis-arrow)"
              />
            )}
          </>
        ))}
    </svg>
  );
}
