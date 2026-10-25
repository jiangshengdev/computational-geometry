import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { TeachingPage } from "./TeachingPage";
import {
  timelineFor,
  visualAt,
  audioLeadFrames,
  type TimelineRow,
} from "./timeline";
import timingData from "./audio-timing.json";
import { narrationFile } from "../../shared/speech/source";
const audioFiles: Record<string, { duration: number; audioFile?: string }> =
  timingData;
export function ShotScene({
  row,
  audioEnabled = true,
}: {
  row: TimelineRow;
  audioEnabled?: boolean;
}) {
  const frame = useCurrentFrame();
  return (
    <>
      <TeachingPage shot={row} {...visualAt(row, frame)} />
      {audioEnabled ? (
        <Sequence from={audioLeadFrames}>
          <Audio
            src={staticFile(
              `narration/${narrationFile(row.id, audioFiles[row.id])}`,
            )}
          />
        </Sequence>
      ) : null}
    </>
  );
}
export function SampleVideo({ issue }: { issue?: string }) {
  return (
    <>
      {timelineFor(issue).map((row) => (
        <Sequence
          key={row.id}
          from={row.from}
          durationInFrames={row.durationInFrames}
          name={row.id}
        >
          <ShotScene row={row} />
        </Sequence>
      ))}
    </>
  );
}
