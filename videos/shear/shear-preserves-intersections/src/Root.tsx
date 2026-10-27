import { Composition } from "remotion";
import { SampleVideo } from "./Composition";
import { timelineFor, fps } from "./timeline";
import type { CalculateMetadataFunction } from "remotion";

const calculateDuration: CalculateMetadataFunction<{ issue?: string }> = ({
  props,
}) => ({
  durationInFrames: timelineFor(props.issue).reduce(
    (sum, row) => sum + row.durationInFrames,
    0,
  ),
});
const loadLayoutCheck = async () => {
  const { LayoutCheck } = await import("./LayoutCheck");
  return { default: LayoutCheck };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {[undefined, "242", "243", "244"].map((issue) => (
        <Composition
          key={issue ?? "full"}
          id={issue ? `Shear${issue}` : "ShearPreservesIntersections"}
          component={SampleVideo}
          defaultProps={{ issue }}
          calculateMetadata={calculateDuration}
          fps={fps}
          width={1920}
          height={1080}
        />
      ))}
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
};
