import { SvgMathText } from "../../../shared/ui/SemanticMathText";
import { colors } from "../../colors.ts";
import type { VisualState } from "./timeline";

const label = (x: number, y: number, text: string, fill = "#172c45") => (
  <SvgMathText x={x} y={y} fontSize={28} fill={fill}>
    {text}
  </SvgMathText>
);

// Both panels use the same uniform 1/2 projection of the original OC35
// geometry: old [100,350], joining [250,650], neighbor [150,700], Q.x=550.
// The neighbor starts before the joining event; no adjacency change is implied.
export function CoverageExtension({
  stage,
}: {
  stage: VisualState["coverageStage"];
}) {
  const extended = stage !== "before";
  return (
    <>
      {[false, true].map((after) => {
        const dx = after ? 400 : 0;
        const right = after ? 325 : 175;
        return (
          <g
            key={String(after)}
            visibility={after && !extended ? "hidden" : "visible"}
          >
            {label(dx + 20, 90, after ? "延长后 · 邻接不变" : "延长前")}
            <line
              x1={dx + 125}
              y1={140}
              x2={dx + 125}
              y2={380}
              stroke="#64748b"
              strokeDasharray="6 6"
            />
            {label(dx + 85, 405, "加入处")}
            {/* Dashed support is deliberately distinct from closed coverage. */}
            {!after && (
              <line
                x1={175}
                y1={210}
                x2={325}
                y2={210}
                stroke="#64748b"
                strokeDasharray="6 6"
                strokeWidth={2}
              />
            )}
            <line
              x1={dx + 75}
              y1={370}
              x2={dx + 350}
              y2={150}
              stroke={colors.violet}
              strokeWidth={3}
            />
            <line
              x1={dx + 50}
              y1={210}
              x2={dx + right}
              y2={210}
              stroke={colors.blue}
              strokeWidth={5}
            />
            {[50, right].map((x) => (
              <circle key={x} cx={dx + x} cy={210} r={5} fill={colors.blue} />
            ))}
            <circle cx={dx + 75} cy={370} r={5} fill={colors.violet} />
            <circle cx={dx + 350} cy={150} r={5} fill={colors.violet} />
            {label(dx + 50, 185, "本组", colors.blue)}
            {label(dx + 185, 345, "同一邻组", colors.violet)}
            <circle
              cx={dx + 275}
              cy={210}
              r={7}
              fill={after ? "#172c45" : "white"}
              stroke="#172c45"
              strokeWidth={2}
            />
            {label(dx + 285, 250, "Q")}
            {label(
              dx + 20,
              455,
              after ? "Q 属于双方真实闭范围" : "Q 不在本组真实闭范围",
            )}
          </g>
        );
      })}
      {label(20, 515, "同一候选交点 Q")}
      {stage === "queued" && (
        <>
          <path
            d="M675 470 L675 480"
            stroke="#64748b"
            strokeWidth={2}
            markerEnd="url(#axis-arrow)"
          />
          <rect
            x={420}
            y={490}
            width={350}
            height={55}
            rx={8}
            fill="none"
            stroke="#64748b"
            strokeWidth={2}
          />
          <SvgMathText
            x={595}
            y={517.5}
            fontSize={28}
            align="center"
            verticalAlign="middle"
          >
            待处理清单：…，Q
          </SvgMathText>
        </>
      )}
    </>
  );
}
