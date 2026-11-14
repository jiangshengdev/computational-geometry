import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { durationInFrames } from "./timeline";
export const RemotionRoot = () => (
  <>
    <Composition
      id="OverallCorrectness"
      component={MyComposition}
      durationInFrames={durationInFrames}
      fps={60}
      width={1920}
      height={1080}
    />
    <Composition
      id="LayoutCheck"
      lazyComponent={async () => ({
        default: (await import("./LayoutCheck")).LayoutCheck,
      })}
      durationInFrames={1}
      fps={60}
      width={1920}
      height={1080}
    />
  </>
);
