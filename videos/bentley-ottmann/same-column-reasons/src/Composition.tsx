import { Sequence, useCurrentFrame } from "remotion";
import { rows, visualAt, type TimelineRow } from "./timeline";
import { TeachingPage } from "./TeachingPage";

function Shot({ row }: { row: TimelineRow }) {
  return <TeachingPage row={row} state={visualAt(row, useCurrentFrame())} />;
}
/** Silent draft: no media elements or fabricated audio timing. */
export const MyComposition = () => (
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
