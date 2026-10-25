import { fileURLToPath } from "node:url";
import { shots, pages } from "../src/storyboard.ts";
import { buildSpeechDocument, voice, verifyAlignment } from "./azure-speech.ts";
import {
  timelineFor,
  visualAt,
  audioLeadFrames,
  fps,
} from "../src/timeline.ts";
import { checkContent } from "../../shared/checks/content.ts";
import { mathLineGroups } from "../../shared/math/math-lines.ts";
import { renderToString } from "katex";
for (const page of Object.values(pages)) {
  mathLineGroups(page.lines, page.groups);
  for (const line of [...page.context, ...page.lines])
    if (line.math)
      renderToString(line.math, { throwOnError: true, strict: "error" });
}
// Check the production state before each spoken explanation starts, not only
// after its reveal; a row may contain a complete equation including its result.
for (const row of timelineFor()) {
  for (const stage of row.stages) {
    const firstSpokenFrame =
      audioLeadFrames + Math.ceil((stage.speechMs * fps) / 1000);
    if (visualAt(row, firstSpokenFrame - 1).visibleStep < stage.step)
      throw Error(
        `Teaching row must be visible before speech: ${row.id}/${stage.step}`,
      );
  }
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
  expectedPauses: [{ id: "232-13", seconds: 4 }],
});
