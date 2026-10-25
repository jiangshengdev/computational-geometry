import { createTeachingMathLines } from "../../shared/ui/TeachingMathLines";
import { Subtitles } from "../../shared/ui/Subtitles";
import { MathText, Latex, SvgMathText, colorMath } from "./MathText";
import { pages, type Shot, type Line } from "./storyboard";

// Split only at authored teaching-group boundaries. Both columns stay in the
// main scene, with cumulative steps; this is not a second dependency panel.
const mainColumns = Object.fromEntries(
  Object.entries(pages).map(([id, page]) => {
    const groups = page.mainSplitAfterGroup
      ? [
          page.groups.slice(0, page.mainSplitAfterGroup),
          page.groups.slice(page.mainSplitAfterGroup),
        ]
      : [page.groups];
    let start = 0;
    return [
      id,
      groups.map((columnGroups, index) => {
        const count = columnGroups.reduce((sum, group) => sum + group.count, 0);
        const column = {
          id: `${id}-${index}`,
          start,
          lines: page.lines.slice(start, start + count),
          groups: columnGroups,
        };
        start += count;
        return column;
      }),
    ];
  }),
);
const columnPages = Object.fromEntries(
  Object.values(mainColumns)
    .flat()
    .map((column) => [column.id, column]),
);
const MathLines = createTeachingMathLines({
  pages: columnPages,
  MathText,
  Latex,
  colorMath,
  lineMarks: {},
  defaultMathColor: "#172c45",
  objectColors: { current: "#b45309" },
  pageRoles: Object.fromEntries(
    Object.keys(columnPages).map((id) => [id, "current" as const]),
  ),
});

function FractionDiagram({ showDistance }: { showDistance: boolean }) {
  // One-dimensional axis: labels use the same 900 px/unit map as the points.
  const x = (value: number) => 90 + value * 900;
  return (
    <svg data-fraction-diagram width={720} height={280} viewBox="0 0 720 280">
      <line
        x1={60}
        x2={700}
        y1={130}
        y2={130}
        stroke="#526579"
        strokeWidth={3}
      />
      {[0, 1 / 2, 2 / 3].map((value, index) => (
        <g key={value}>
          <circle
            cx={x(value)}
            cy={130}
            r={7}
            fill={index ? "#2563a6" : "#526579"}
          />
          <SvgMathText x={x(value)} y={195} align="center">
            {["0", "1/2", "2/3"][index]}
          </SvgMathText>
        </g>
      ))}
      <g
        data-fraction-distance
        style={{ visibility: showDistance ? "visible" : "hidden" }}
      >
        <path
          d={`M ${x(1 / 2)} 100 V 76 H ${x(2 / 3)} V 100`}
          fill="none"
          stroke="#2563a6"
          strokeWidth={3}
        />
        <SvgMathText
          x={(x(1 / 2) + x(2 / 3)) / 2}
          y={50}
          align="center"
          fill="#2563a6"
        >
          距离 1/6
        </SvgMathText>
      </g>
    </svg>
  );
}

function ContextLine({ line }: { line: Line }) {
  return (
    <div data-context-line style={{ marginBottom: 18, lineHeight: 1.45 }}>
      {line.math ? (
        <Latex colorize={false}>{line.math}</Latex>
      ) : (
        <MathText colorize={false}>{line.text ?? ""}</MathText>
      )}
    </div>
  );
}

export function TeachingPage({
  shot,
  caption,
  visibleStep,
}: {
  shot: Shot;
  caption: string;
  visibleStep: number;
}) {
  const page = pages[shot.page];
  return (
    <div
      data-production-page
      data-shot={shot.id}
      style={{
        position: "absolute",
        inset: 0,
        background: "#f6f8fb",
        color: "#172c45",
        fontFamily: '"PingFang SC", sans-serif',
      }}
    >
      <div
        data-page-block
        style={{
          position: "absolute",
          left: 100,
          top: 40,
          fontSize: 48,
          fontWeight: 600,
        }}
      >
        <MathText colorize={false}>{page.title}</MathText>
      </div>
      <div
        data-page-block
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: 125,
          fontSize: 30,
          color: "#526579",
          borderBottom: "2px solid #dce4ec",
          paddingBottom: 18,
        }}
      >
        <MathText colorize={false}>{page.mode}</MathText>
      </div>
      {page.context.length ? (
        <aside
          data-context
          data-page-block
          style={{
            position: "absolute",
            left: 100,
            top: 220,
            width: 740,
            height: 650,
            fontSize: 30,
          }}
        >
          <div style={{ fontSize: 28, color: "#526579", marginBottom: 26 }}>
            前面已讲过，本页继续使用
          </div>
          {page.context.map((line, i) => (
            <ContextLine line={line} key={i} />
          ))}
        </aside>
      ) : null}
      <div
        data-main-content
        style={{
          position: "absolute",
          left: page.context.length ? 920 : 100,
          top: 220,
          right: 100,
          bottom: 200,
          display: "flex",
          gap: 80,
        }}
      >
        {page.diagram ? (
          <div style={{ width: 740, flexShrink: 0 }}>
            <FractionDiagram showDistance={visibleStep >= 1} />
          </div>
        ) : null}
        {mainColumns[shot.page].map((column) => (
          <div
            data-main-column
            key={column.id}
            style={{ flex: 1, minWidth: 0 }}
          >
            <MathLines
              pageId={column.id}
              visibleStep={visibleStep - column.start}
            />
          </div>
        ))}
      </div>
      <div
        data-teaching-note
        data-page-block
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: 900,
          fontSize: 28,
          color: "#526579",
          visibility: visibleStep === page.lines.length ? "visible" : "hidden",
        }}
      >
        <MathText colorize={false}>{page.note}</MathText>
      </div>
      <Subtitles pageBlock>
        <span data-caption-ink>
          <MathText colorize={false}>{caption}</MathText>
        </span>
      </Subtitles>
    </div>
  );
}
