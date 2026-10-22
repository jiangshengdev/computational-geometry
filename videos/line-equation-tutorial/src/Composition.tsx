import { MathText } from "./MathText";
import { MathLines } from "./MathLines";
import {
  AbsoluteFill,
  Composition,
  Html5Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Intro } from "./Intro";
import { chapters, offsets, totalFrames, fps } from "./timeline";
import { Diagram } from "./Diagram";
import { titles } from "./scenes";
import { derivationAt } from "./derivations";
type Row = (typeof chapters)[number]["rows"][number];
const Shot = ({ row, chapter }: { row: Row; chapter: number }) => {
  const frame = useCurrentFrame(),
    seconds = (frame / row.durationInFrames) * (row.end - row.start);
  const { page, step } = derivationAt(row.id, seconds);
  const { cue } = step;
  const { graphic } = page;
  const columns =
    page.columnBreak === undefined
      ? [{ start: 0, lines: page.lines }]
      : [
          { start: 0, lines: page.lines.slice(0, page.columnBreak) },
          {
            start: page.columnBreak,
            lines: page.lines.slice(page.columnBreak),
          },
        ];
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f6f8fb",
        color: "#172c45",
        fontFamily: '"PingFang SC", sans-serif',
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 62,
          fontSize: 28,
          color: "#65758a",
        }}
      >
        由两个端点写出直线方程 ·{" "}
        <MathText>{`${String(chapter + 1).padStart(2, "0")} / 08`}</MathText>
      </div>
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 125,
          fontSize: 48,
          fontWeight: 600,
        }}
      >
        <MathText>{titles[chapter]}</MathText>
      </div>
      {page.context.length ? (
        <div
          style={{
            position: "absolute",
            left: 100,
            right: 100,
            top: 210,
            display: "flex",
            gap: 48,
            alignItems: "center",
            fontSize: 30,
            color: "#526579",
            borderBottom: "2px solid #dce4ec",
            paddingBottom: 18,
          }}
        >
          {page.context.map((line) => (
            <div key={line}>
              <MathText>{line}</MathText>
            </div>
          ))}
        </div>
      ) : null}
      {graphic && cue.diagram !== "none" ? (
        <div
          style={{
            position: "absolute",
            left: 65,
            top: 285,
            scale: "0.74",
            transformOrigin: "top left",
          }}
        >
          <Diagram kind={cue.diagram ?? "line"} scale={cue.coordinateScale} />
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: graphic ? 790 : 180,
          right: 100,
          top: 305,
          textAlign: "left",
          display: "grid",
          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
          gap: 40,
        }}
      >
        {columns.map(({ start, lines }) => (
          <div key={start}>
            <MathLines
              lines={lines}
              visibleCount={Math.max(0, step.visibleCount - start)}
              activeLines={step.activeLines.map((index) => index - start)}
              fontSize={columns.length > 1 || page.lines.length > 6 ? 30 : 42}
              highlightDifferences={row.id === "193-7"}
            />
          </div>
        ))}
      </div>
      {cue.note ? (
        <div
          style={{
            position: "absolute",
            left: graphic ? 790 : 180,
            right: 100,
            top: 815,
            fontSize: 26,
            lineHeight: 1.6,
            color: "#65758a",
          }}
        >
          <MathText>{cue.note}</MathText>
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          bottom: 55,
          borderTop: "2px solid #dce4ec",
          paddingTop: 24,
          fontSize: 28,
          lineHeight: 1.6,
          textAlign: "center",
        }}
      >
        <MathText>{row.narration}</MathText>
      </div>
      {row.narration ? (
        <Sequence from={6} layout="none">
          <Html5Audio src={staticFile(`narration/${row.id}.mp3`)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
const Chapter = ({ chapter }: { chapter: number }) =>
  chapter === 0 ? (
    <Intro />
  ) : (
    <>
      {chapters[chapter].rows.map((row) => (
        <Sequence
          key={row.id}
          from={row.from}
          durationInFrames={row.durationInFrames}
          name={row.id}
        >
          <Shot row={row} chapter={chapter} />
        </Sequence>
      ))}
    </>
  );
export const Tutorial = ({
  first = 0,
  last = 7,
}: {
  first?: number;
  last?: number;
}) => (
  <>
    {chapters.map((item, chapter) =>
      chapter < first || chapter > last ? null : (
        <Sequence
          key={chapter}
          from={offsets[chapter] - offsets[first]}
          durationInFrames={item.durationInFrames}
          name={titles[chapter]}
        >
          <Chapter chapter={chapter} />
        </Sequence>
      ),
    )}
  </>
);
export const MyComposition = () => (
  <>
    <Composition
      id="LineEquationTutorial"
      component={Tutorial}
      durationInFrames={totalFrames}
      fps={fps}
      width={1920}
      height={1080}
    />
    {[0, 2, 4, 6].map((first) => (
      <Composition
        key={first}
        id={`Parts${first + 1}And${first + 2}`}
        component={Tutorial}
        defaultProps={{ first, last: first + 1 }}
        durationInFrames={
          chapters[first].durationInFrames +
          chapters[first + 1].durationInFrames
        }
        fps={fps}
        width={1920}
        height={1080}
      />
    ))}
  </>
);
