import { MyComposition } from "./Composition";
import { Still } from "remotion";
import { LatexPreview } from "./LatexPreview";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Still
        id="LatexPreview"
        component={LatexPreview}
        width={1920}
        height={1080}
      />
    </>
  );
};
