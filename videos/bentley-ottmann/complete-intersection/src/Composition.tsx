import { Sequence, useCurrentFrame } from "remotion";
import { rows, visualAt, type TimelineRow } from "./timeline";
import { TeachingPage } from "./TeachingPage";
function ShotScene({ row }: { row: TimelineRow }) {
  const frame = useCurrentFrame();
  return <TeachingPage row={row} {...visualAt(row, frame)} />;
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
