import { Sequence, useCurrentFrame } from "remotion";
import { TeachingPage } from "./TeachingPage";
import { timelineFor, visualAt, type TimelineRow } from "./timeline";
function ShotScene({ row }: { row: TimelineRow }) {
  return <TeachingPage shot={row} {...visualAt(row, useCurrentFrame())} />;
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
