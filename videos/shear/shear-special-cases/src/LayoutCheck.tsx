import { createShotLayoutCheck } from "../../../shared/checks/ShotLayoutCheck";
import {
  timelineFor,
  visualAt,
  fps,
  audioLeadFrames,
  type TimelineRow,
} from "./timeline";
import { TeachingPage } from "./TeachingPage";
import { auditPage } from "./page-audit";
import captions from "./captions.json";
function SceneAtFrame({ row, frame }: { row: TimelineRow; frame: number }) {
  return <TeachingPage shot={row} {...visualAt(row, frame)} />;
}
export const LayoutCheck = createShotLayoutCheck({
  rows: timelineFor(),
  visualAt,
  fps,
  audioLeadFrames,
  captions,
  SceneAtFrame,
  auditPage,
});
