import { useCurrentFrame } from "remotion";
import captionData from "./captions.json";
import { chapters, offsets, fps } from "./timeline";
import { captionAt, type Caption } from "./caption-timeline";
import { MathText } from "./MathText";

const byRow: Record<string, Caption[]> = captionData;
const chapterCaptions = chapters.map((chapter) =>
  chapter.rows.flatMap((row) =>
    byRow[row.id].map((caption) => ({
      ...caption,
      startMs: caption.startMs + ((row.from + 6) * 1000) / fps,
      endMs: caption.endMs + ((row.from + 6) * 1000) / fps,
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
    <div
      data-subtitle
      style={{
        position: "absolute",
        left: 120,
        right: 120,
        bottom: 55,
        minHeight: 90,
        borderTop: "2px solid #dce4ec",
        paddingTop: 24,
        fontFamily: '"PingFang SC", sans-serif',
        color: "#172c45",
        fontSize: 28,
        lineHeight: 1.6,
        textAlign: "center",
        textWrap: "pretty",
      }}
    >
      <MathText>
        {captionAt(chapterCaptions[chapter], (frame * 1000) / fps)}
      </MathText>
    </div>
  );
};
