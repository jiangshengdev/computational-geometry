import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { TeachingPage } from "./TeachingPage";
import {
  timelineFor,
  visualAt,
  audioLeadFrames,
  type TimelineRow,
} from "./timeline";
import timing from "./audio-timing.json";
import { narrationFile } from "../../../shared/speech/source";
const audio: Record<string, { audioFile?: string }> = timing;
function ShotScene({ row }: { row: TimelineRow }) {
  const frame = useCurrentFrame();
  return (
    <>
      <TeachingPage shot={row} {...visualAt(row, frame)} />
      <Sequence from={audioLeadFrames}>
        <Audio
          src={staticFile(`narration/${narrationFile(row.id, audio[row.id])}`)}
        />
      </Sequence>
    </>
  );
}
export function SpecialCasesVideo({ issue }: { issue?: string }) {
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
