import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import {
  rows,
  visualAt,
  audio,
  audioLeadFrames,
  type TimelineRow,
} from "./timeline";
import { narrationFile } from "../../../shared/speech/source";
import { TeachingPage } from "./TeachingPage";
function ShotScene({ row }: { row: TimelineRow }) {
  const frame = useCurrentFrame();
  return (
    <>
      <TeachingPage row={row} {...visualAt(row, frame)} />
      <Sequence from={audioLeadFrames}>
        <Audio
          src={staticFile(`narration/${narrationFile(row.id, audio[row.id])}`)}
        />
      </Sequence>
    </>
  );
}
export function LessonVideo() {
  return (
    <>
      {rows.map((row) => (
        <Sequence
          key={row.id}
          from={row.from}
          durationInFrames={row.durationInFrames}
          name={`${row.id} · ${row.action}`}
        >
          <ShotScene row={row} />
        </Sequence>
      ))}
    </>
  );
}
