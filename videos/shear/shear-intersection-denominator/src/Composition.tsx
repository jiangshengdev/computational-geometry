import * as remotion from "remotion";
import { createNarratedLesson } from "../../../shared/ui/NarratedLesson";
import { TeachingPage } from "./TeachingPage";
import timing from "./audio-timing.json";
import { timelineFor, visualAt, audioLeadFrames } from "./timeline";

export const { ShotScene, LessonVideo: ShearVideo } = createNarratedLesson({
  runtime: remotion,
  timelineFor,
  visualAt,
  audio: timing,
  audioLeadFrames,
  renderPage: (row, state) => <TeachingPage shot={row} {...state} />,
});
