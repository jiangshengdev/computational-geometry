import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { createNarratedLesson } from "../../../shared/ui/NarratedLesson";
import { rows, visualAt, audio, audioLeadFrames } from "./timeline";
import { TeachingPage } from "./TeachingPage";

export const { LessonVideo: MyComposition } = createNarratedLesson({
  runtime: { Audio, Sequence, staticFile, useCurrentFrame },
  timelineFor: () => rows,
  visualAt,
  audio,
  audioLeadFrames,
  renderPage: (row, state) => <TeachingPage row={row} state={state} />,
});
