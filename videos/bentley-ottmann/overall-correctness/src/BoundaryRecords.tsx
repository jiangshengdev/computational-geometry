import { SvgMathText } from "../../../shared/ui/SemanticMathText";
import { colors } from "../../colors.ts";
import type { VisualState } from "./timeline";

const label = (x: number, y: number, text: string) => (
  <SvgMathText x={x} y={y} fontSize={28}>
    {text}
  </SvgMathText>
);
function Item({
  x,
  y,
  width,
  text,
  color = "#64748b",
  changed = false,
}: {
  x: number;
  y: number;
  width: number;
  text: string;
  color?: string;
  changed?: boolean;
}) {
  return (
    <>
      <rect
        x={x}
        y={y}
        width={width}
        height={48}
        rx={5}
        fill="none"
        stroke={changed ? colors.amber : color}
        strokeWidth={changed ? 3 : 1.5}
      />
      <SvgMathText
        x={x + width / 2}
        y={y + 24}
        fontSize={28}
        fill={color}
        align="center"
        verticalAlign="middle"
      >
        {text}
      </SvgMathText>
    </>
  );
}

// A local crossing of two continuing groups illustrates the record changes,
// not a replay or a restriction of the general preservation proof.
export function BoundaryRecords({ state }: { state: VisualState }) {
  return (
    <>
      {label(175, 85, "处理 P 前")}
      {state.preservationAfter && label(475, 85, "处理 P 后")}
      {label(170, 135, "同列高处：左序保留，前后不动")}
      {label(15, 220, "活动顺序")}
      {label(15, 260, "从下到上")}
      <Item x={190} y={170} width={175} text="穿过组乙" color={colors.violet} />
      <Item x={190} y={235} width={175} text="穿过组甲" color={colors.blue} />
      {label(195, 320, "P 处左序")}
      {state.preservationAfter && (
        <>
          <Item
            x={490}
            y={170}
            width={175}
            text="穿过组甲"
            color={colors.blue}
            changed={state.preservationEmphasis}
          />
          <Item
            x={490}
            y={235}
            width={175}
            text="穿过组乙"
            color={colors.violet}
            changed={state.preservationEmphasis}
          />
          {label(495, 320, "P 处右序")}
        </>
      )}
      {label(170, 365, "同列低处：右序已定，前后不动")}
      {label(15, 425, "待处理清单")}
      <Item
        x={180}
        y={390}
        width={65}
        text="P"
        changed={state.preservationEmphasis}
      />
      <Item x={260} y={390} width={150} text="其余位置" />
      {state.preservationAfter && (
        <>
          <Item x={490} y={390} width={175} text="其余位置" />
          {label(680, 425, "移去 P")}
        </>
      )}
      {label(15, 515, "已报告结果")}
      <Item x={180} y={480} width={230} text="此前结果" />
      {state.preservationAfter && (
        <>
          <Item x={440} y={480} width={155} text="此前结果" />
          <Item
            x={610}
            y={480}
            width={180}
            text="本次输入对"
            changed={state.preservationEmphasis}
          />
        </>
      )}
    </>
  );
}
