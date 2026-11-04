import type { ComponentType, ReactNode } from "react";
import { narrationFile } from "../speech/source";

type Shot = { id: string; from: number; durationInFrames: number };
type Runtime = {
  Audio: ComponentType<{ src: string }>;
  Sequence: ComponentType<{
    from?: number;
    durationInFrames?: number;
    name?: string;
    children?: ReactNode;
  }>;
  staticFile(file: string): string;
  useCurrentFrame(): number;
};

/** The episode supplies its runtime and teaching scene; playback stays common. */
export function createNarratedLesson<Row extends Shot, State>({
  runtime: { Audio, Sequence, staticFile, useCurrentFrame },
  timelineFor,
  visualAt,
  renderPage,
  audio,
  audioLeadFrames,
  sequenceName = (row) => row.id,
}: {
  runtime: Runtime;
  timelineFor: (issue?: string) => Row[];
  visualAt: (row: Row, frame: number) => State;
  renderPage: (row: Row, state: State) => ReactNode;
  audio: Record<string, { duration: number; audioFile?: string }>;
  audioLeadFrames?: number;
  sequenceName?: (row: Row) => string;
}) {
  function ShotScene({
    row,
    audioEnabled = true,
  }: {
    row: Row;
    audioEnabled?: boolean;
  }) {
    const frame = useCurrentFrame();
    const narration = audioEnabled ? (
      <Audio
        src={staticFile(`narration/${narrationFile(row.id, audio[row.id])}`)}
      />
    ) : null;
    return (
      <>
        {renderPage(row, visualAt(row, frame))}
        {audioLeadFrames === undefined || !audioEnabled ? (
          narration
        ) : (
          <Sequence from={audioLeadFrames}>{narration}</Sequence>
        )}
      </>
    );
  }
  function LessonVideo({ issue }: { issue?: string } = {}) {
    return (
      <>
        {timelineFor(issue).map((row) => (
          <Sequence
            key={row.id}
            from={row.from}
            durationInFrames={row.durationInFrames}
            name={sequenceName(row)}
          >
            <ShotScene row={row} />
          </Sequence>
        ))}
      </>
    );
  }
  return { ShotScene, LessonVideo };
}
