import { SvgMathText } from "../../../shared/ui/SemanticMathText";
import { colors } from "../../colors.ts";
import type { VisualState } from "./timeline";

const label = (x: number, y: number, text: string) => (
  <SvgMathText x={x} y={y} fontSize={28}>
    {text}
  </SvgMathText>
);
export function NextEventTimeline({ state }: { state: VisualState }) {
  return (
    <>
      {label(45, 100, "完整位置次序：先 x，同列再按高度")}
      <line
        x1={90}
        y1={180}
        x2={725}
        y2={180}
        stroke="#64748b"
        strokeWidth={2}
        markerEnd="url(#axis-arrow)"
      />
      <circle cx={160} cy={180} r={7} fill="#64748b" />
      <circle cx={580} cy={180} r={8} fill={colors.blue} />
      {label(65, 235, "已处理边界")}
      {label(505, 235, "下一处 Q")}
      {label(675, 165, "…")}
      {label(45, 300, "更晚交点不必此时全部已知")}
      <rect
        x={45}
        y={360}
        width={270}
        height={90}
        rx={6}
        stroke={colors.blue}
        strokeWidth={2}
        fill="none"
      />
      <SvgMathText
        x={180}
        y={383}
        fontSize={28}
        align="center"
        verticalAlign="middle"
      >
        此前已登记 Q
      </SvgMathText>
      <SvgMathText
        x={180}
        y={427}
        fontSize={28}
        align="center"
        verticalAlign="middle"
      >
        清单保留，尚未取出
      </SvgMathText>
      {state.nextEventTaken && (
        <>
          <path
            d="M330 405 L465 405"
            stroke="#64748b"
            strokeWidth={2}
            markerEnd="url(#axis-arrow)"
          />
          {label(340, 380, "取最小")}
          <rect
            x={485}
            y={360}
            width={275}
            height={90}
            rx={6}
            stroke={colors.blue}
            strokeWidth={2}
            fill="none"
          />
          <SvgMathText
            x={622.5}
            y={405}
            fontSize={28}
            align="center"
            verticalAlign="middle"
          >
            随后取到 Q
          </SvgMathText>
        </>
      )}
      {state.nextEventParticipants &&
        label(45, 520, "到站收齐参与者，再按原始输入对报告")}
    </>
  );
}
