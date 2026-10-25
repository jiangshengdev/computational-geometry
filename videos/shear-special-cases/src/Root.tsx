import { Composition } from "remotion";
import { SpecialCasesVideo } from "./Composition";
import { LayoutCheck } from "./LayoutCheck";
import { fps, timelineFor } from "./timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {[undefined, "237", "238", "239"].map((issue) => (
        <Composition
          key={issue ?? "full"}
          id={issue ? `Shear${issue}` : "ShearSpecialCases"}
          component={SpecialCasesVideo}
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
