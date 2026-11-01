import { Sequence, useCurrentFrame } from "remotion";
import { timeline, type ReadingRow } from "./timeline";
import { TeachingPage } from "./TeachingPage";

function ReadingShot({ row }: { row: ReadingRow }) {
  return <TeachingPage row={row} frame={useCurrentFrame()} />;
}

export function LessonVideo() {
  return timeline.map((row) => (
    <Sequence
      key={row.id}
      from={row.from}
      durationInFrames={row.durationInFrames}
      name={row.id}
    >
      <ReadingShot row={row} />
    </Sequence>
  ));
}
