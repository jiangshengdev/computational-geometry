import { Subtitles as SubtitleBox } from "../../../shared/ui/Subtitles";
import { MathText } from "./MathText";
import { shots, type Shot } from "./storyboard";
import { captionNumberRoles, captionNumbers } from "./teaching-emphasis";

export const Subtitles = ({ text, shot }: { text: string; shot: Shot }) => {
  // During a silent lead-in the page may retain a cue from the preceding shot.
  const source = shot.caption.includes(text)
    ? shot
    : shots
        .slice(
          0,
          shots.findIndex((s) => s.id === shot.id),
        )
        .reverse()
        .find((s) => s.page === shot.page && s.caption.includes(text));
  const roles = source
    ? captionNumbers(source.caption, text, captionNumberRoles[source.id] ?? [])
    : [];
  return (
    <SubtitleBox pageBlock>
      <span data-caption-ink>
        <MathText numberRoles={roles}>{text}</MathText>
      </span>
    </SubtitleBox>
  );
};
