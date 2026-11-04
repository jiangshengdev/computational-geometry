import * as remotion from "remotion";
import { createNarratedLesson } from "../../../shared/ui/NarratedLesson";
import { TeachingPage } from "./TeachingPage";
import { rows, visualAt, audioLeadFrames, audio } from "./timeline";

export const { LessonVideo } = createNarratedLesson({
  runtime: remotion,
  timelineFor: () => rows,
  visualAt,
  audio: audio,
  audioLeadFrames,
  renderPage: (row, state) => <TeachingPage row={row} state={state} />,
  sequenceName: (row) => `${row.id} · ${row.action}`,
});
