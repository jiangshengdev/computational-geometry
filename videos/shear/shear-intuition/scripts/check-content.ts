import { fileURLToPath } from "node:url";
import { shots, pages } from "../src/storyboard.ts";
import { buildSpeechDocument, voice } from "./azure-speech.ts";
import { verifyAlignment } from "./azure-alignment.ts";
import {
  timelineFor,
  visualAt,
  audioLeadFrames,
  fps,
} from "../src/timeline.ts";
import { checkContent } from "../../../shared/checks/content.ts";

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
  checkPageHolds: false,
  expectedPauses: [
    { id: "204-12", seconds: 4 },
    { id: "207-01", seconds: 4 },
  ],
});
