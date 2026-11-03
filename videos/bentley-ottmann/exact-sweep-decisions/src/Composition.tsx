import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import {
  rows,
  visualAt,
  audioLeadFrames,
  audio,
  type TimelineRow,
} from "./timeline";
import { narrationFile } from "../../../shared/speech/source";
import { TeachingPage } from "./TeachingPage";

function ShotScene({ row }: { row: TimelineRow }) {
  const frame = useCurrentFrame();
  return (
    <>
      <TeachingPage row={row} state={visualAt(row, frame)} />
      <Sequence from={audioLeadFrames}>
        <Audio
          src={staticFile(`narration/${narrationFile(row.id, audio[row.id])}`)}
        />
      </Sequence>
    </>
  );
}
/** Every adopted original WAV plays completely at its original rate. */
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
