import { Diagram } from "./Diagram";
import { MathLines } from "./MathLines";
import { MathText, TeachingColors } from "./MathText";
import { pages, type Shot } from "./storyboard";
import { Subtitles } from "./Subtitles";
import { pageRoles } from "./teaching-emphasis";

export const TeachingPage = ({
  shot,
  progress,
  caption,
  visibleStep,
}: {
  shot: Shot;
  progress: number;
  caption: string;
  visibleStep: number;
}) => {
  const page = pages[shot.page];
  const moving = shot.page === "crossing" && shot.step >= 2;
  return (
    <TeachingColors value={pageRoles[shot.page]}>
      <div
        data-production-page
        data-shot={shot.id}
        style={{
          position: "absolute",
          inset: 0,
          background: "#f6f8fb",
          color: "#172c45",
          fontFamily: '"PingFang SC", sans-serif',
        }}
      >
        <div
          data-page-block
          style={{
            position: "absolute",
            left: 100,
            top: 40,
            fontSize: 48,
            fontWeight: 600,
          }}
        >
          <MathText colorize={false}>{page.title}</MathText>
        </div>
        <div
          data-page-block
          style={{
            position: "absolute",
            left: 100,
            right: 100,
            top: 125,
            fontSize: 30,
            color: "#526579",
            borderBottom: "2px solid #dce4ec",
            paddingBottom: 18,
          }}
        >
          <MathText colorize={false}>{page.mode}</MathText>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 190,
            transform: "scale(1.1)",
            transformOrigin: "top left",
          }}
        >
          <Diagram moving={moving} progress={moving ? progress : 0} />
        </div>
        <div
          data-main-content
          style={{
            position: "absolute",
            left: 920,
            top: 220,
            width: 900,
            bottom: 200,
          }}
        >
          <MathLines pageId={shot.page} visibleStep={visibleStep} />
        </div>
        <div
          data-page-block
          data-teaching-note
          style={{
            position: "absolute",
            left: 920,
            right: 100,
            top: 900,
            fontSize: 28,
            color: "#526579",
            visibility:
              visibleStep >= (page.noteFromStep ?? 0) ? "visible" : "hidden",
          }}
        >
          <MathText colorize={false}>{page.note}</MathText>
        </div>
        <Subtitles text={caption} shot={shot} />
      </div>
    </TeachingColors>
  );
};
