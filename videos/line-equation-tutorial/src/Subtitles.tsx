import { Subtitles as SubtitleBox } from "../../shared/ui/Subtitles";
import { useCurrentFrame } from "remotion";
import captionData from "./captions.json";
import { chapters, offsets, fps, audioLeadInFrames } from "./timeline";
import { captionAt, type Caption } from "./caption-timeline";
import { MathText } from "./MathText";

const byRow: Record<string, Caption[]> = captionData;
const chapterCaptions = chapters.map((chapter) =>
  chapter.rows.flatMap((row) =>
    byRow[row.id].map((caption) => ({
      ...caption,
      startMs: caption.startMs + ((row.from + audioLeadInFrames) * 1000) / fps,
      endMs: caption.endMs + ((row.from + audioLeadInFrames) * 1000) / fps,
    })),
  ),
);

export const Subtitles = ({ first, last }: { first: number; last: number }) => {
  const absoluteFrame = useCurrentFrame() + offsets[first];
  const chapter = chapters.findIndex(
    (item, index) =>
      index >= first &&
      index <= last &&
      absoluteFrame >= offsets[index] &&
      absoluteFrame < offsets[index] + item.durationInFrames,
  );
  if (chapter < 0) return null;
  const frame = absoluteFrame - offsets[chapter];
  return (
    <SubtitleBox
      style={{ fontFamily: '"PingFang SC", sans-serif', color: "#172c45" }}
    >
      <MathText>
        {captionAt(chapterCaptions[chapter], (frame * 1000) / fps)}
      </MathText>
    </SubtitleBox>
  );
};
