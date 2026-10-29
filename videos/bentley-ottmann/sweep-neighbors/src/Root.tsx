import { Composition } from "remotion";
import { LessonVideo } from "./Composition";
import { timelineFor, fps } from "./timeline";
const loadLayoutCheck = async () => ({
  default: (await import("./LayoutCheck")).LayoutCheck,
});
export const RemotionRoot = () => (
  <>
    <Composition
      id="SweepNeighbors"
      component={LessonVideo}
      fps={fps}
      width={1920}
      height={1080}
      calculateMetadata={() => ({
        durationInFrames: timelineFor().reduce(
          (sum, row) => sum + row.durationInFrames,
          0,
        ),
      })}
    />
    <Composition
      id="LayoutCheck"
      lazyComponent={loadLayoutCheck}
      fps={fps}
      width={1920}
      height={1080}
      durationInFrames={1}
    />
  </>
);
