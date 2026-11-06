import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { createNarratedLesson } from "../../../shared/ui/NarratedLesson";
import { TeachingPage } from "./TeachingPage";
import { rows, visualAt, audio, audioLeadFrames } from "./timeline";

export const { LessonVideo: MyComposition } = createNarratedLesson({
  runtime: { Audio, Sequence, staticFile, useCurrentFrame },
  timelineFor: () => rows,
  visualAt,
  audio,
  audioLeadFrames,
  renderPage: (row, state) => <TeachingPage row={row} state={state} />,
});
