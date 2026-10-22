import { MyComposition } from "./Composition";
import { Still } from "remotion";
import { LatexPreview } from "./LatexPreview";
import { LayoutCheck } from "./LayoutCheck";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Still
        id="LayoutCheck"
        component={LayoutCheck}
        width={1920}
        height={1080}
      />
      <Still
        id="LatexPreview"
        component={LatexPreview}
        width={1920}
        height={1080}
      />
    </>
  );
};
