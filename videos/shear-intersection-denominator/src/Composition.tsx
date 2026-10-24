import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { TeachingPage } from "./TeachingPage";
import {
  timelineFor,
  visualAt,
  audioLeadFrames,
  type TimelineRow,
} from "./timeline";
export const ShotScene = ({
  row,
  audioEnabled = true,
}: {
  row: TimelineRow;
  audioEnabled?: boolean;
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      <TeachingPage shot={row} {...visualAt(row, frame)} />
      {audioEnabled ? (
        <Sequence from={audioLeadFrames}>
          <Audio src={staticFile(`narration/${row.id}.mp3`)} />
        </Sequence>
      ) : null}
    </>
  );
};
export const ShearVideo = () => (
  <>
    {timelineFor().map((row) => (
      <Sequence
        key={row.id}
        from={row.from}
        durationInFrames={row.durationInFrames}
        name={row.id}
      >
        <ShotScene row={row} />
      </Sequence>
    ))}
  </>
);
