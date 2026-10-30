import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { TeachingPage } from "./TeachingPage";
import { timelineFor, visualAt, audio, type TimelineRow } from "./timeline";
import { narrationFile } from "../../../shared/speech/source";
function ShotScene({ row }: { row: TimelineRow }) {
  const frame = useCurrentFrame();
  return (
    <>
      <TeachingPage shot={row} {...visualAt(row, frame)} />
      {row.stages.map((stage) => (
        <Sequence
          key={stage.step}
          from={stage.audioFrame}
          durationInFrames={stage.trimAfter - stage.trimBefore}
          layout="none"
        >
          <Audio
            src={staticFile(
              `narration/${narrationFile(row.id, audio[row.id])}`,
            )}
            trimBefore={stage.trimBefore}
            trimAfter={stage.trimAfter}
          />
        </Sequence>
      ))}
    </>
  );
}
export function LessonVideo() {
  return (
    <>
      {timelineFor().map((row) => (
        <Sequence
          key={row.id}
          from={row.from}
          durationInFrames={row.durationInFrames}
          name={`${pages[row.page].chapter} · ${row.action}`}
        >
          <ShotScene row={row} />
        </Sequence>
      ))}
    </>
  );
}
import { pages } from "./lesson";
