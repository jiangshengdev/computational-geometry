import { inputColors } from "../../colors.ts";
import { useId } from "react";
import { SvgMathText } from "./MathText";
import type { DiagramFocus } from "./timeline";
import {
  AttentionMarks,
  sampleAttention,
} from "../../../shared/ui/AttentionMarks";
import type { AttentionMark } from "../../../shared/speech/teaching-cues";

const colors = inputColors.slice(0, 3);
/** All four views use the same origin and 100 pixels per coordinate unit. */
export function InputDiagram({
  inputs,
  focus,
  animateFocus = false,
  size = 370,
  attention,
}: {
  inputs: number[];
  focus?: DiagramFocus;
  animateFocus?: boolean;
  size?: number;
  attention?: { marks: AttentionMark[]; progress: number };
}) {
  const arrow = useId().replace(/:/g, "");
  const vertical = inputs[0] === 2;
  const focusColor = colors[inputs.length === 1 ? inputs[0] - 1 : 2];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 370 370"
      aria-label="等比例输入坐标图"
    >
      <defs>
        <marker
          id={arrow}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8" fill="#94a3b8" />
        </marker>
      </defs>
      <path
        d="M185 345 V30"
        stroke="#94a3b8"
        strokeWidth="2"
        fill="none"
        markerEnd={`url(#${arrow})`}
      />
      <path
        d="M25 185 H335"
        stroke="#94a3b8"
        strokeWidth="2"
        markerEnd={`url(#${arrow})`}
      />
      <SvgMathText x={335} y={218}>
        x
      </SvgMathText>
      <SvgMathText x={209} y={48}>
        y
      </SvgMathText>
      {inputs.includes(1) && (
        <g stroke={colors[0]} fill={colors[0]} strokeWidth={6}>
          <line x1={85} y1={185} x2={285} y2={185} />
          <circle cx={85} cy={185} r={6} />
          <circle cx={285} cy={185} r={6} />
        </g>
      )}
      {inputs.includes(2) && (
        <g stroke={colors[1]} fill={colors[1]} strokeWidth={6}>
          <line x1={185} y1={285} x2={185} y2={85} />
          <circle cx={185} cy={285} r={6} />
          <circle cx={185} cy={85} r={6} />
        </g>
      )}
      {inputs.includes(3) && (
        <path
          d="M185 172 L198 185 L185 198 L172 185 Z"
          fill={colors[2]}
          stroke="#f6f8fb"
          strokeWidth={3}
        />
      )}
      {focus && focus.target !== "identity" && (
        <g
          fill="none"
          stroke={focusColor}
          opacity={animateFocus ? sampleAttention(focus.progress).opacity : 1}
          strokeWidth={3}
          aria-hidden="true"
        >
          {focus.target === "segment" ? (
            <line
              x1={vertical ? 185 : 85}
              y1={vertical ? 285 : 185}
              x2={vertical ? 185 : 285}
              y2={vertical ? 85 : 185}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={
                1 -
                (animateFocus
                  ? focus.progress
                  : Math.min(1, focus.progress / 0.2))
              }
              strokeWidth={12}
            />
          ) : focus.target === "diamond" ? (
            <path
              d="M185 165 L205 185 L185 205 L165 185 Z"
              strokeWidth={
                animateFocus ? sampleAttention(focus.progress).diamondWidth : 5
              }
            />
          ) : (
            <circle
              cx={
                focus.target === "origin" || vertical
                  ? 185
                  : focus.target === "start"
                    ? 85
                    : 285
              }
              cy={
                focus.target === "origin" || !vertical
                  ? 185
                  : focus.target === "start"
                    ? 285
                    : 85
              }
              r={animateFocus ? sampleAttention(focus.progress).radius : 18}
            />
          )}
        </g>
      )}
      {attention && (
        <AttentionMarks
          {...attention}
          color={focusColor}
          scale={size / 370}
          project={([x, y]) => [185 + 100 * x, 185 - 100 * y]}
        />
      )}
      {inputs.length === 1 && inputs[0] === 1 && (
        <>
          <SvgMathText x={85} y={230} align="center" fontSize={26}>
            (-1,0)
          </SvgMathText>
          <SvgMathText x={285} y={230} align="center" fontSize={26}>
            (1,0)
          </SvgMathText>
        </>
      )}
      {inputs.length === 1 && inputs[0] === 2 && (
        <>
          <SvgMathText x={210} y={89} fontSize={26}>
            (0,1)
          </SvgMathText>
          <SvgMathText x={210} y={300} fontSize={26}>
            (0,-1)
          </SvgMathText>
        </>
      )}
      {inputs.includes(3) && (
        <SvgMathText x={210} y={230} fontSize={26}>
          (0,0)
        </SvgMathText>
      )}
    </svg>
  );
}
