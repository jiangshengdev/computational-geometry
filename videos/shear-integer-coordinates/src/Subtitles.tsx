import { Subtitles as SubtitleBox } from "../../shared/ui/Subtitles";
import { MathText } from "./MathText";

export const Subtitles = ({ text }: { text: string }) => {
  return (
    <SubtitleBox pageBlock>
      <span data-caption-ink>
        <MathText colorize={false}>{text}</MathText>
      </span>
    </SubtitleBox>
  );
};
