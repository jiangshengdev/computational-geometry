import { Composition } from "remotion";
import { SampleVideo } from "./Composition";
import { LayoutCheck } from "./LayoutCheck";
import { timelineFor, fps } from "./timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Shear242"
        component={SampleVideo}
        durationInFrames={timelineFor().reduce(
          (sum, row) => sum + row.durationInFrames,
          0,
        )}
        fps={fps}
        width={1920}
        height={1080}
      />
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
