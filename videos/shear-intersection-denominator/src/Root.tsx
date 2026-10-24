import { Composition } from "remotion";
import { ShearVideo } from "./Composition";
import { LayoutCheck } from "./LayoutCheck";
import { fps, timelineFor } from "./timeline";
export const RemotionRoot = () => (
  <>
    <Composition
      id="Shear227"
      component={ShearVideo}
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
