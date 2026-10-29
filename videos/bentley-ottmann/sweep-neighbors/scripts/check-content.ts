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
import "./check-sweep.ts";
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
    { id: "S02", seconds: 5 },
    { id: "S40", seconds: 5 },
  ],
});
