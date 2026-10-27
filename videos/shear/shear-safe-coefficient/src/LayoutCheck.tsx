import { Sequence } from "remotion";
import { createShotLayoutCheck } from "../../../shared/checks/ShotLayoutCheck";
import { ShotScene } from "./Composition";
import {
  timelineFor,
  visualAt,
  fps,
  audioLeadFrames,
  type TimelineRow,
} from "./timeline";
import { auditPage } from "./page-audit";
import captions from "./captions.json";
function SceneAtFrame({ row, frame }: { row: TimelineRow; frame: number }) {
  return (
    <Sequence from={-frame} layout="none">
      <ShotScene row={row} audioEnabled={false} />
    </Sequence>
  );
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
