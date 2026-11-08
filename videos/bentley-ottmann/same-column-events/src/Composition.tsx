import { Sequence, useCurrentFrame } from "remotion";
import { rows, visualAt, type TimelineRow } from "./timeline";
import { TeachingPage } from "./TeachingPage";
function Shot({ row }: { row: TimelineRow }) {
  return <TeachingPage row={row} state={visualAt(row, useCurrentFrame())} />;
}
// Deliberately silent: formal audio is outside #354 and must not be guessed.
export function MyComposition() {
  return (
    <>
      {rows.map((row) => (
        <Sequence
          key={row.id}
          from={row.from}
          durationInFrames={row.durationInFrames}
          name={row.id}
        >
          <Shot row={row} />
        </Sequence>
      ))}
    </>
  );
}
