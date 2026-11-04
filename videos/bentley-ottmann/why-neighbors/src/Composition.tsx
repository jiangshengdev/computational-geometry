import * as remotion from "remotion";
import { createNarratedLesson } from "../../../shared/ui/NarratedLesson";
import { TeachingPage } from "./TeachingPage";
import { pages } from "./lesson";
import { timelineFor, visualAt, audio } from "./timeline";

export const { LessonVideo } = createNarratedLesson({
  runtime: remotion,
  timelineFor,
  visualAt,
  audio: audio,
  renderPage: (row, state) => <TeachingPage shot={row} {...state} />,
  sequenceName: (row) => `第 ${pages[row.page].section} 节 · ${row.action}`,
});
