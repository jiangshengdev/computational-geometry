import {
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { TeachingPage } from "./TeachingPage";
import { audioLeadFrames, timelineFor } from "./timeline";
import captionData from "./captions.json";

const captions = captionData as Record<
  string,
  { text: string; startMs: number; endMs: number }[]
>;

const ShotScene = ({
  row,
}: {
  row: ReturnType<typeof timelineFor>[number];
}) => {
  const frame = useCurrentFrame();
  const ms = ((frame - audioLeadFrames) * 1000) / 60;
  return (
    <>
      <TeachingPage
        shot={row}
        caption={
          captions[row.id]?.find((cue) => ms >= cue.startMs && ms < cue.endMs)
            ?.text ?? ""
        }
        progress={
          row.animate ||
          [
            "204-01",
            "204-02",
            "204-03",
            "204-07",
            "204-16",
            "205-03",
            "205-05",
          ].includes(row.id)
            ? interpolate(
                frame,
                [audioLeadFrames, audioLeadFrames + row.speechFrames * 0.75],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )
            : 1
        }
        thinking={Boolean(
          row.pauseAfter && frame >= audioLeadFrames + row.speechFrames,
        )}
      />
      <Sequence from={audioLeadFrames}>
        <Audio src={staticFile(`narration/${row.id}.mp3`)} />
      </Sequence>
    </>
  );
};

export const ShearVideo = ({ issue }: { issue?: string }) => (
  <>
    {timelineFor(issue).map((row) => (
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
