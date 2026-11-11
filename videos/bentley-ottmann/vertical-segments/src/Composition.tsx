import { Sequence, useCurrentFrame } from "remotion";
import { rows, visualAt, type TimelineRow } from "./timeline";
import { TeachingPage } from "./TeachingPage";
function Shot({ row }: { row: TimelineRow }) {
  const frame = useCurrentFrame();
  return <TeachingPage row={row} state={visualAt(row, frame)} />;
}
export function MyComposition() {
  return (
    <>
      {rows.map((row) => (
        <Sequence
          key={row.id}
          name={row.id}
          from={row.from}
          durationInFrames={row.durationInFrames}
        >
          <Shot row={row} />
        </Sequence>
      ))}
    </>
  );
}
