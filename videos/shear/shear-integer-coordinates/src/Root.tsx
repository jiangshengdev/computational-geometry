import { Composition } from "remotion";
import { ShearVideo } from "./Composition";
import { LayoutCheck } from "./LayoutCheck";
import { fps, timelineFor } from "./timeline";
export const RemotionRoot = () => (
  <>
    <Composition
      id="ShearIntegerCoordinates"
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
      id="Shear216"
      component={ShearVideo}
      defaultProps={{ issue: "216" }}
      durationInFrames={timelineFor("216").reduce(
        (sum, row) => sum + row.durationInFrames,
        0,
      )}
      fps={fps}
      width={1920}
      height={1080}
    />
    <Composition
      id="Shear217"
      component={ShearVideo}
      defaultProps={{ issue: "217" }}
      durationInFrames={timelineFor("217").reduce(
        (sum, row) => sum + row.durationInFrames,
        0,
      )}
      fps={fps}
      width={1920}
      height={1080}
    />
    <Composition
      id="Shear218"
      component={ShearVideo}
      defaultProps={{ issue: "218" }}
      durationInFrames={timelineFor("218").reduce(
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
