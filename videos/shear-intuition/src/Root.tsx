import { Composition } from "remotion";
import { ShearVideo } from "./Composition";
import { timelineFor, fps } from "./timeline";
import { LayoutCheck } from "./LayoutCheck";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {[undefined, "204", "205", "206", "207"].map((issue) => (
        <Composition
          key={issue ?? "all"}
          id={issue ? `Shear${issue}` : "ShearIntuition"}
          component={ShearVideo}
          defaultProps={{ issue }}
          durationInFrames={timelineFor(issue).reduce(
            (sum, row) => sum + row.durationInFrames,
            0,
          )}
          fps={fps}
          width={1920}
          height={1080}
        />
      ))}
      <Composition
        id="LayoutCheck"
        component={LayoutCheck}
        durationInFrames={1}
        fps={fps}
        width={1920}
        height={1080}
      />
    </>
  );
};
