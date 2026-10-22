import { MathText } from "./MathText";

export const Subtitles = ({ text }: { text: string }) => (
  <div
    data-page-block
    data-subtitle
    style={{
      position: "absolute",
      left: 120,
      right: 120,
      bottom: 30,
      height: 68,
      boxSizing: "content-box",
      borderTop: "2px solid #dce4ec",
      paddingTop: 20,
      fontSize: 40,
      lineHeight: 1.4,
      textAlign: "center",
      whiteSpace: "nowrap",
    }}
  >
    <span data-caption-ink>
      <MathText>{text}</MathText>
    </span>
  </div>
);
