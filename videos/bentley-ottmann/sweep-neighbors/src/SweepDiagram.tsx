import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import type { TeachingFocus } from "../../../shared/speech/teaching-cues";
import { SvgMathText } from "./MathText";
import { inputs, intersections, type SweepState } from "./sweep-state";
const project = ([x, y]: [number, number]): [number, number] => [
  105 + x * 66,
  497 - y * 66,
];
export function SweepDiagram({
  state,
  focus,
}: {
  state: SweepState;
  focus?: TeachingFocus;
}) {
  const [sx] = project([state.x, 0]);
  const [, axisY] = project([0, 0]);
  const [, top] = project([0, 7]);
  const [, bottom] = project([0, -2]);
  const [candidateX, candidateY] = project([5, 3]);
  return (
    <svg
      width={900}
      height={704}
      viewBox="0 -24 900 704"
      style={{ display: "block", marginTop: -24 }}
      aria-label="四线段等比例扫描教学示意"
    >
      <defs>
        <marker
          id="axis-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#60738a" />
        </marker>
      </defs>
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={"x" + i}
          x1={105 + i * 66}
          x2={105 + i * 66}
          y1={top}
          y2={bottom}
          stroke="#dbe3ec"
        />
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <line
          key={"y" + i}
          x1={45}
          x2={835}
          y1={project([0, 7 - i])[1]}
          y2={project([0, 7 - i])[1]}
          stroke="#dbe3ec"
        />
      ))}
      <line
        x1={45}
        x2={850}
        y1={axisY}
        y2={axisY}
        stroke="#60738a"
        markerEnd="url(#axis-arrow)"
      />
      <line
        x1={105}
        x2={105}
        y1={bottom + 20}
        y2={top - 20}
        stroke="#60738a"
        markerEnd="url(#axis-arrow)"
      />
      <SvgMathText x={870} y={axisY + 5} fontSize={24}>
        x
      </SvgMathText>
      <SvgMathText x={127} y={top - 12} fontSize={24}>
        y
      </SvgMathText>
      <SvgMathText x={93} y={axisY + 28} align="right" fontSize={22}>
        O
      </SvgMathText>
      {[2, 4, 6, 8, 10].map((x) => (
        <SvgMathText
          key={x}
          x={project([x, 0])[0]}
          y={axisY + 30}
          align="center"
          fontSize={20}
        >
          {x}
        </SvgMathText>
      ))}
      {[-2, 2, 4, 6].map((y) => (
        <SvgMathText
          key={y}
          x={88}
          y={project([0, y])[1] + 7}
          align="right"
          fontSize={20}
        >
          {y}
        </SvgMathText>
      ))}
      {state.shown.map((id) => {
        const s = inputs[id];
        const [x1, y1] = project(s.from);
        const [x2, y2] = project(s.to);
        const active = state.order.includes(id);
        return (
          <g
            key={id}
            data-input={id}
            opacity={state.records && !active ? 0.3 : 1}
          >
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={s.color}
              strokeWidth={3}
            />
            <circle cx={x1} cy={y1} r={4} fill={s.color} />
            <circle cx={x2} cy={y2} r={4} fill={s.color} />
            <SvgMathText
              x={id === "D" ? x1 - 25 : x1 + 8}
              y={id === "D" ? y1 + 60 : y1 - 15}
              align={id === "D" ? "right" : "left"}
              fontSize={25}
              fill={s.color}
              label
            >{`${id} (${s.from.join(",")})`}</SvgMathText>
            <SvgMathText
              x={x2 + 5}
              y={y2 + (id === "C" ? 35 : -16)}
              fontSize={24}
              fill={s.color}
              label
            >{`(${s.to.join(",")})`}</SvgMathText>
          </g>
        );
      })}
      {state.records > 0 && (
        <g data-scan-x={state.x}>
          <line
            x1={sx}
            x2={sx}
            y1={top}
            y2={bottom}
            stroke="#b45309"
            strokeWidth={2}
            strokeDasharray="8 7"
          />
          <SvgMathText
            x={
              state.x === inputs.C.to[0]
                ? sx - 12
                : state.x === inputs.A.to[0]
                  ? sx + 30
                  : sx
            }
            y={bottom + 40}
            align={
              state.x === inputs.C.to[0]
                ? "right"
                : state.x === inputs.A.to[0]
                  ? "left"
                  : "center"
            }
            fontSize={24}
          >
            {state.x < 0 || state.definition ? "扫描线" : `x=${state.x}`}
          </SvgMathText>
        </g>
      )}
      {state.candidate && (
        <g data-candidate>
          <line
            x1={project([3, 3])[0]}
            y1={candidateY}
            x2={candidateX}
            y2={candidateY}
            stroke={inputs.B.color}
            strokeDasharray="7 7"
          />
          <circle
            cx={candidateX}
            cy={candidateY}
            r={7}
            fill="none"
            stroke="#64748b"
          />
          <SvgMathText
            x={candidateX + 14}
            y={candidateY - 17}
            label
            fontSize={23}
          >
            (5,3)
          </SvgMathText>
        </g>
      )}
      {state.discovered.map((id) => {
        const [x, y] = project(intersections[id].at);
        const reported = state.reported.includes(id);
        return (
          <g key={id} data-intersection={id} data-reported={reported}>
            <circle
              cx={x}
              cy={y}
              r={7}
              fill={reported ? "#172c45" : "#f6f8fb"}
              stroke="#172c45"
              strokeWidth={2}
            />
            <SvgMathText
              x={x + (id === "Q" ? -12 : 14)}
              y={y + (id === "Q" ? 33 : -14)}
              align={id === "Q" ? "right" : "left"}
              fontSize={25}
              label
            >{`${id} (${intersections[id].at.join(",")})`}</SvgMathText>
          </g>
        );
      })}
      {focus?.active && (
        <AttentionMarks
          marks={focus.panels?.scan ?? []}
          progress={focus.progress}
          project={project}
        />
      )}
    </svg>
  );
}
