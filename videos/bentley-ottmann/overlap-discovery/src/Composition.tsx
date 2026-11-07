import { Sequence, useCurrentFrame } from "remotion";
import { rows, visualAt, type TimelineRow } from "./timeline";
import { TeachingPage } from "./TeachingPage";

function SilentShot({ row }: { row: TimelineRow }) {
  const frame = useCurrentFrame();
  return <TeachingPage row={row} state={visualAt(row, frame)} />;
}

/** #347 has no audio. #348 replaces inspection windows with verified speech. */
export const MyComposition = () => (
  <>
    {rows.map((row) => (
      <Sequence
        key={row.id}
        from={row.from}
        durationInFrames={row.durationInFrames}
        name={row.id}
      >
        <SilentShot row={row} />
      </Sequence>
    ))}
  </>
);
