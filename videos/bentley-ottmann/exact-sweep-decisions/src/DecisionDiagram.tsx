import { AttentionMarks } from "../../../shared/ui/AttentionMarks";
import {
  point,
  stroke,
  type AttentionMark,
} from "../../../shared/speech/teaching-cues";
import { colors } from "../../colors.ts";
import { SvgMathText, MathText } from "./MathText";
import type { PageInput } from "./storyboard";

type Props = {
  page: string;
  kind: NonNullable<PageInput["diagram"]>;
  visibleStep: number;
  target: string | null;
  progress: number;
  reached: string[];
};
const ink = "#172c45";
const muted = "#64748b";
const Label = SvgMathText;
const segment = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={3} />;
const dot = (x: number, y: number, color = colors.violet) => (
  <circle cx={x} cy={y} r={6} fill={color} />
);

/** Local geometric relations, without fictitious numeric data or a scan trace. */
export function DecisionDiagram({
  page,
  kind,
  visibleStep: step,
  target,
  progress,
  reached,
}: Props) {
  const seen = (name: string) => reached.includes(name);
  const marks: Record<string, AttentionMark[]> = {};
  let content;
  if (kind === "records") {
    const identity = page === "identity";
    const emphasis = (name: string) =>
      target === name ? `${colors.amber}22` : undefined;
    return (
      <div
        data-record-comparison
        style={{ fontSize: 30, lineHeight: 2.1, padding: 30 }}
      >
        <div style={{ marginBottom: 25 }}>比较位置，核对已有记录</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 220px 220px",
            gap: 15,
          }}
        >
          <div>位置来源</div>
          <div>横坐标</div>
          <div>纵坐标</div>
          <div style={{ background: emphasis("record-p") }}>
            <MathText>本次 P</MathText>
          </div>
          <div style={{ background: emphasis("record-x") }}>
            <MathText>x_P</MathText>
          </div>
          <div style={{ background: emphasis("record-y") }}>
            <MathText>y_P</MathText>
          </div>
          <div style={{ background: emphasis("record-q") }}>
            <MathText>清单 Q</MathText>
          </div>
          <div style={{ background: emphasis("record-x") }}>
            <MathText>x_Q</MathText>
          </div>
          <div style={{ background: emphasis("record-y") }}>
            <MathText>y_Q</MathText>
          </div>
        </div>
        {(identity || step >= 2) && (
          <div style={{ marginTop: 30 }}>
            <MathText>两个坐标分别相等，才是同一位置</MathText>
          </div>
        )}
        {identity && step >= 2 && (
          <div
            data-diagram-object="pair-identity"
            style={{
              marginTop: 35,
              padding: 15,
              border: `2px solid ${muted}`,
              background: emphasis("pair"),
            }}
          >
            求交结果另保留：原始无序输入对
          </div>
        )}
      </div>
    );
  }
  if (kind === "eligibility") {
    const extension = seen("extension") || step > 1;
    marks.finite = [stroke(100, 320, 310, 320, colors.blue)];
    marks.extension = [point(440, 320)];
    marks.gate = [
      { kind: "rect", from: [105, 470], to: [695, 540], radius: 8 },
    ];
    content = (
      <>
        {segment(100, 320, 310, 320, colors.blue)}
        {dot(100, 320, colors.blue)}
        {dot(310, 320, colors.blue)}
        {segment(240, 120, 360, 240, colors.orange)}
        {dot(240, 120, colors.orange)}
        {dot(360, 240, colors.orange)}
        {extension && (
          <g data-diagram-object="extension">
            <path
              d="M310 320 H620 M360 240 L500 380"
              fill="none"
              stroke={muted}
              strokeWidth={2}
              strokeDasharray="8 8"
            />
            {dot(440, 320)}
            <Label x={465} y={300}>
              延长线交点
            </Label>
          </g>
        )}
        {step >= 2 && (
          <g data-diagram-object="gate">
            <Label x={100} y={420}>
              判空：不登记交叉
            </Label>
            <rect
              x={105}
              y={470}
              width={590}
              height={70}
              rx={8}
              fill="none"
              stroke={muted}
            />
            <Label x={130} y={515} fontSize={27}>
              真实交点 → 严格未来且尚未登记？
            </Label>
          </g>
        )}
      </>
    );
  } else if (kind === "positions") {
    marks.h = [point(230, 310)];
    marks.k = [point(560, 190)];
    marks.order = [stroke(230, 450, 560, 450)];
    content = (
      <>
        <path
          d="M90 450 H710"
          stroke={muted}
          strokeWidth={2}
          markerEnd="url(#decision-arrow)"
        />
        <Label x={735} y={455}>
          x
        </Label>
        {dot(230, 310, colors.blue)}
        {dot(560, 190, colors.orange)}
        <Label x={230} y={280} align="center" fill={colors.blue}>
          H
        </Label>
        <Label x={560} y={160} align="center" fill={colors.orange}>
          K
        </Label>
        <path
          d="M230 310 V450 M560 190 V450"
          fill="none"
          stroke={muted}
          strokeWidth={2}
          strokeDasharray="6 8"
        />
        <Label x={230} y={500} align="center">
          x_H
        </Label>
        <Label x={560} y={500} align="center">
          x_K
        </Label>
        {step >= 2 && (
          <Label x={400} y={560} align="center">
            先处理左侧；与发现时间无关
          </Label>
        )}
      </>
    );
  } else if (kind === "future") {
    const zeroPage = page === "future-zero";
    const showCandidate = !zeroPage && (step >= 3 || seen("candidate"));
    const showPositive = !zeroPage && step >= 3;
    const showZero = zeroPage;
    const showNegative = zeroPage && step >= 2;
    marks.current = [stroke(400, 225, 400, 285)];
    marks.candidate = [point(600, 260)];
    marks.difference = [stroke(400, 370, 600, 370)];
    const panel = (
      y: number,
      px: number | null,
      name: string,
      relation?: string,
    ) => (
      <g key={name} data-position-case={name}>
        <path
          d={`M100 ${y} H700`}
          stroke={muted}
          strokeWidth={2}
          markerEnd="url(#decision-arrow)"
        />
        <line
          x1={400}
          y1={y - 35}
          x2={400}
          y2={y + 25}
          stroke={ink}
          strokeWidth={2}
        />
        <Label x={400} y={y + 70} align="center">
          x_0
        </Label>
        {px !== null && (
          <>
            {dot(px, y)}
            <Label x={px === 400 ? px + 40 : px} y={y - 28} align="center">
              P
            </Label>
            {px !== 400 && (
              <Label x={px} y={y + 70} align="center">
                x_P
              </Label>
            )}
          </>
        )}
        {relation && (
          <Label x={100} y={y - 95}>
            {relation}
          </Label>
        )}
      </g>
    );
    marks["future-positive"] = [point(600, 260)];
    marks["future-zero"] = [point(400, 190)];
    marks["future-negative"] = [point(200, 430)];
    content = zeroPage ? (
      <>
        {showZero && panel(190, 400, "zero", "f_P=0")}
        {showNegative && panel(430, 200, "negative", "f_P<0")}
      </>
    ) : (
      <>
        {panel(
          260,
          showCandidate ? 600 : null,
          "positive",
          showPositive ? "f_P>0" : undefined,
        )}
        {seen("difference") && (
          <g data-diagram-object="difference">
            <path
              d="M400 355 V385 M400 370 H600 M600 355 V385"
              fill="none"
              stroke={muted}
              strokeWidth={2}
            />
            <path
              d="M410 370 H590"
              stroke={muted}
              strokeWidth={2}
              markerEnd="url(#decision-arrow)"
            />
            <Label x={500} y={420} align="center">
              f_P=x_P-x_0
            </Label>
          </g>
        )}
      </>
    );
  } else if (kind === "heights") {
    const named = page === "height-difference" || step >= 2;
    const heights = page === "height-difference" || step >= 3;
    marks.s1 = [stroke(100, 420, 680, 280, colors.blue)];
    marks.s2 = [stroke(100, 250, 680, 180, colors.orange)];
    marks.scan = [stroke(400, 120, 400, 460)];
    marks.height1 = [point(400, 420 - (300 * 140) / 580, colors.blue)];
    marks.height2 = [point(400, 250 - (300 * 70) / 580, colors.orange)];
    marks.height = [...marks.height2, ...marks.height1];
    content = (
      <>
        {segment(100, 420, 680, 280, colors.blue)}
        {segment(100, 250, 680, 180, colors.orange)}
        <line
          x1={400}
          y1={120}
          x2={400}
          y2={460}
          stroke={muted}
          strokeWidth={2}
          strokeDasharray="8 8"
        />
        <Label x={400} y={510} align="center">
          {heights ? "x" : "比较位置"}
        </Label>
        {named && (
          <>
            <Label x={690} y={300} fill={colors.blue}>
              S_1
            </Label>
            <Label x={690} y={170} fill={colors.orange}>
              S_2
            </Label>
          </>
        )}
        {heights && (
          <g data-diagram-object="heights">
            {dot(400, 420 - (300 * 140) / 580, colors.blue)}
            {dot(400, 250 - (300 * 70) / 580, colors.orange)}
            <Label x={425} y={370} fill={colors.blue}>
              y_1(x)
            </Label>
            <Label x={425} y={210} fill={colors.orange}>
              y_2(x)
            </Label>
          </g>
        )}
        {named && (
          <Label x={400} y={580} align="center" fontSize={26}>
            同一横坐标的局部示意；图中第二份在上
          </Label>
        )}
      </>
    );
  } else {
    marks.s2 = [stroke(160, 440, 640, 200, colors.orange)];
    marks.slopes = [stroke(100, 320, 700, 320, colors.blue), ...marks.s2];
    marks.intersection = [point(400, 320)];
    marks.left = [stroke(160, 320, 160, 440)];
    marks.right = [stroke(640, 320, 640, 200)];
    const showRight = seen("right");
    const showLeft = seen("left");
    content = (
      <>
        {segment(100, 320, 700, 320, colors.blue)}
        {segment(160, 440, 640, 200, colors.orange)}
        {dot(400, 320)}
        <Label x={430} y={365}>
          P
        </Label>
        <Label x={710} y={315} fill={colors.blue}>
          S_1
        </Label>
        <Label x={650} y={185} fill={colors.orange}>
          S_2
        </Label>
        <Label x={400} y={100} align="center">
          {page === "crossing-action"
            ? "普通交叉；示意 m_2-m_1>0"
            : "普通交叉的局部示意"}
        </Label>
        {showLeft && (
          <g data-diagram-object="left-side">
            <path
              d="M160 280 V465"
              stroke={muted}
              strokeWidth={2}
              strokeDasharray="6 8"
            />
            <Label x={160} y={525} align="center">
              {page === "crossing-action" ? "左侧 S_2 在下" : "交点左侧"}
            </Label>
          </g>
        )}
        {showRight && (
          <g data-diagram-object="right-side">
            <path
              d="M640 160 V360"
              stroke={muted}
              strokeWidth={2}
              strokeDasharray="6 8"
            />
            <Label x={640} y={525} align="center">
              {page === "crossing-action" ? "右侧 S_2 在上" : "交点右侧"}
            </Label>
          </g>
        )}
        {(showLeft || showRight) && (
          <Label x={400} y={595} align="center" fontSize={25}>
            两侧取未跨过其他事件的范围，不作固定小数采样
          </Label>
        )}
      </>
    );
  }
  return (
    <svg
      width={800}
      height={620}
      viewBox="0 0 800 620"
      role="img"
      aria-label="当前判断的局部几何关系示意"
    >
      <defs>
        <marker
          id="decision-arrow"
          markerWidth={9}
          markerHeight={9}
          refX={8}
          refY={4}
          orient="auto"
        >
          <path
            d="M0 0 L8 4 L0 8"
            fill="none"
            stroke={muted}
            strokeWidth={1.5}
          />
        </marker>
      </defs>
      {content}
      <AttentionMarks
        marks={target ? (marks[target] ?? []) : []}
        progress={progress}
      />
    </svg>
  );
}
