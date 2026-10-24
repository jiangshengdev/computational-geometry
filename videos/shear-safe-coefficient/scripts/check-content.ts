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
