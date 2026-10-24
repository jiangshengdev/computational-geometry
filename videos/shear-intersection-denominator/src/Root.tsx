import { Composition } from "remotion";
import { ShearVideo } from "./Composition";
import { LayoutCheck } from "./LayoutCheck";
import { fps, timelineFor } from "./timeline";
export const RemotionRoot = () => (
  <>
    <Composition
      id="ShearIntersectionDenominator"
      component={ShearVideo}
      durationInFrames={timelineFor().reduce(
        (sum, row) => sum + row.durationInFrames,
        0,
      )}
      fps={fps}
      width={1920}
      height={1080}
    />
    {["227", "228", "229"].map((issue) => (
      <Composition
        key={issue}
        id={`Shear${issue}`}
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
