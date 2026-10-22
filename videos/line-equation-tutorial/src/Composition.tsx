import { ChapterLayout } from "./ChapterLayout";
import { MathLines } from "./MathLines";
import {
  Composition,
  Html5Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Intro } from "./Intro";
import {
  chapters,
  offsets,
  totalFrames,
  fps,
  frameScale,
  audioLeadInFrames,
} from "./timeline";
import { Diagram } from "./Diagram";
import { titles } from "./scenes";
import { derivationAt } from "./derivations";
import { Subtitles } from "./Subtitles";
import type { ReactNode } from "react";
import { emphasisProgress } from "./teaching-emphasis";
type Row = (typeof chapters)[number]["rows"][number];
const Shot = ({ row, chapter }: { row: Row; chapter: number }) => {
  const frame = useCurrentFrame(),
    seconds = (frame / row.durationInFrames) * (row.end - row.start);
  const { page, step } = derivationAt(row.id, seconds);
  return (
    <DerivationPage
      page={page}
      step={step}
      chapter={chapter}
      emphasis={emphasisProgress(
        (frame - (step.cue.at / (row.end - row.start)) * row.durationInFrames) /
          frameScale,
      )}
    >
      {row.narration ? (
        <Sequence from={audioLeadInFrames} layout="none">
          <Html5Audio src={staticFile(`narration/${row.id}.mp3`)} />
        </Sequence>
      ) : null}
    </DerivationPage>
  );
};

export const DerivationPage = ({
  page,
  step,
  chapter,
  children,
  emphasis = 1,
}: ReturnType<typeof derivationAt> & {
  chapter: number;
  children?: ReactNode;
  emphasis?: number;
}) => {
  const { cue } = step;
  const { graphic } = page;
  const columns =
    page.columnBreak === undefined
      ? [{ start: 0, end: page.lines.length }]
      : [
          { start: 0, end: page.columnBreak },
          {
            start: page.columnBreak,
            end: page.lines.length,
          },
        ];
  return (
    <ChapterLayout
      chapter={chapter}
      context={page.context}
      graphic={graphic}
      diagram={
        graphic && cue.diagram !== "none" ? (
          <Diagram
            kind={cue.diagram ?? "line"}
            scale={cue.coordinateScale}
            activeObjects={step.activeLines.map((index) => page.objects[index])}
            emphasis={emphasis}
          />
        ) : undefined
      }
      columnCount={columns.length}
      note={cue.note}
      content={columns.map(({ start, end }) => (
        <div key={start}>
          <MathLines
            lines={page.lines}
            objects={page.objects}
            emphasis={emphasis}
            groups={page.groups}
            start={start}
            end={end}
            visibleCount={step.visibleCount}
            activeLines={step.activeLines}
            fontSize={page.fontSize ?? 42}
            highlightDifferences={step.row === "193-7"}
          />
        </div>
      ))}
    >
      {children}
    </ChapterLayout>
  );
};
const Chapter = ({ chapter }: { chapter: number }) => (
  <>
    {chapter === 0 ? (
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
    )}
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
    <Subtitles first={first} last={last} />
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
