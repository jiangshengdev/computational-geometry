import { Sequence, useCurrentFrame } from "remotion";
import { rows, visualAt, type TimelineRow } from "./timeline";
import { TeachingPage } from "./TeachingPage";
function Shot({ row }: { row: TimelineRow }) {
  return <TeachingPage row={row} state={visualAt(row, useCurrentFrame())} />;
}
/** Visuals-only stage. No audio component, source, synthesis, or export side effects. */
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
