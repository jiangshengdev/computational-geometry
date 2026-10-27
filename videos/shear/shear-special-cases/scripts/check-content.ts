import { fileURLToPath } from "node:url";
import { shots, pages } from "../src/storyboard.ts";
import {
  timelineFor,
  visualAt,
  audioLeadFrames,
  fps,
} from "../src/timeline.ts";
import { buildSpeechDocument, voice, verifyAlignment } from "./azure-speech.ts";
import { checkContent } from "../../../shared/checks/content.ts";
import { mathLineGroups } from "../../../shared/math/math-lines.ts";
import { renderToString } from "katex";
for (const page of Object.values(pages)) {
  mathLineGroups(page.lines, page.groups);
  for (const line of page.lines)
    if (line.math)
      renderToString(line.math, { throwOnError: true, strict: "error" });
}
for (const row of timelineFor())
  for (const stage of row.stages) {
    const before =
      audioLeadFrames + Math.ceil((stage.speechMs * fps) / 1000) - 1;
    if (visualAt(row, before).visibleStep < stage.step)
      throw Error(`Teaching row follows speech: ${row.id}`);
  }
checkContent({
  root: fileURLToPath(new URL("../", import.meta.url)),
  shots,
  pages,
  buildSpeechDocument,
  voice,
  verifyAlignment,
  timelineFor,
  visualAt,
  audioLeadFrames,
  fps,
  checkPageHolds: true,
  expectedPauses: [
    { id: "237-07", seconds: 4 },
    { id: "238-20", seconds: 4 },
  ],
});
