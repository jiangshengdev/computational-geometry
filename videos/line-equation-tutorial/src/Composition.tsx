import { MathText } from "./MathText";
import { MathLines } from "./MathLines";
import {
  AbsoluteFill,
  Composition,
  Html5Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { Intro } from "./Intro";
import { chapters, offsets, totalFrames, fps } from "./timeline";
import { Diagram } from "./Diagram";
import { titles, visuals } from "./scenes";
type Row = (typeof chapters)[number]["rows"][number];
const Shot = ({ row, chapter }: { row: Row; chapter: number }) => {
  const frame = useCurrentFrame(),
    seconds = (frame / row.durationInFrames) * (row.end - row.start);
  const cues = visuals[row.id];
  const cue = [...cues].reverse().find((item) => item.at <= seconds) ?? cues[0];
  const graphic = cue.diagram !== "none";
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
      {graphic ? (
        <div style={{ position: "absolute", left: 65, top: 165 }}>
          <Diagram kind={cue.diagram ?? "line"} />
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: graphic ? 955 : 130,
          right: 100,
          top: graphic ? 320 : 280,
          textAlign: graphic ? "left" : "center",
        }}
      >
        <div
          key={cue.at}
          style={{
            opacity: interpolate(
              frame - (cue.at / (row.end - row.start)) * row.durationInFrames,
              [0, 7],
              [0.25, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            ),
          }}
        >
          <MathLines
            lines={cue.lines}
            highlightDifferences={row.id === "193-7"}
          />
        </div>
        {cue.note ? (
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.6,
              color: "#65758a",
              marginTop: 32,
            }}
          >
            <MathText>{cue.note}</MathText>
          </div>
        ) : null}
      </div>
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
