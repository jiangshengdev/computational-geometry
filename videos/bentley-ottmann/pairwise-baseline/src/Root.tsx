import { Composition } from "remotion";
import { LessonVideo } from "./Composition";
import { timelineFor, fps } from "./timeline";
const loadLayoutCheck = async () => {
  const { LayoutCheck } = await import("./LayoutCheck");
  return { default: LayoutCheck };
};
export const RemotionRoot = () => (
  <>
    <Composition
      id="PairwiseBaseline"
      component={LessonVideo}
      fps={fps}
      width={1920}
      height={1080}
      calculateMetadata={() => ({
        durationInFrames: timelineFor().reduce(
          (total, row) => total + row.durationInFrames,
          0,
        ),
      })}
    />
    <Composition
      id="LayoutCheck"
      lazyComponent={loadLayoutCheck}
      durationInFrames={1}
      fps={fps}
      width={1920}
      height={1080}
    />
  </>
);
