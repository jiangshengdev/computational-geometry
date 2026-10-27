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
for (const [id, page] of Object.entries(pages)) {
  mathLineGroups(page.lines, page.groups);
  for (const line of [...page.lines, ...page.basis])
    if (line.math)
      renderToString(line.math, { throwOnError: true, strict: "error" });
  const first = shots.findIndex((shot) => shot.page === id);
  for (const basis of page.basis) {
    const introduced = shots.findIndex((shot) => shot.id === basis.from);
    if (introduced < 0 || introduced >= first)
      throw Error(`Unintroduced basis on ${id}: ${basis.from}`);
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
});
