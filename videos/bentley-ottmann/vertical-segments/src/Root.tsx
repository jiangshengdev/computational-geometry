import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { durationInFrames, fps } from "./timeline";
export const RemotionRoot = () => (
  <>
    <Composition
      id="VerticalSegments"
      component={MyComposition}
      durationInFrames={durationInFrames}
      fps={fps}
      width={1920}
      height={1080}
    />
    <Composition
      id="LayoutCheck"
      lazyComponent={async () => ({
        default: (await import("./LayoutCheck")).LayoutCheck,
      })}
      durationInFrames={1}
      fps={fps}
      width={1920}
      height={1080}
    />
  </>
);
