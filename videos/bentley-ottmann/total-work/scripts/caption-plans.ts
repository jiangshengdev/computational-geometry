import { createCaptionPlans } from "../../../shared/speech/caption-plans.ts";
import { type CaptionPlan } from "../../../shared/speech/timing.ts";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };
const mappings: Record<string, CaptionPlan> = Object.fromEntries(
  Object.entries(sentences).map(([id, plan]) => [
    id,
    plan.map((sentence) => ({
      caption: sentence.caption,
      speech: sentence.speech.join(""),
    })),
  ]),
);
// Display subdivisions preserve the original semantic source and SSML pauses.
// TW06's expanded wording needs smaller reading windows; no audio is altered.
const parts = [
  "沿完整位置次序走过 7 个事件：",
  "前三个事件各有 1 组参与，",
  "第四个有 4 组，",
  "最后三个也各有 1 组。",
];
mappings.TW06 = [
  ...parts.map((caption, index) => ({
    caption,
    speech: sentences.TW06[0].speech[index],
  })),
  mappings.TW06[1],
];
mappings.TW26 = [
  mappings.TW26[0],
  {
    caption: "只有一个组并且没有点输入时，不展开整个旧成员表；",
    speech: sentences.TW26[1].speech.slice(0, 2).join(""),
  },
  {
    caption: "零组没有非零成员可展开。",
    speech: sentences.TW26[1].speech.slice(2).join(""),
  },
];
export const { captionPlan, measuredCaptions } = createCaptionPlans(
  shots,
  narration,
  mappings,
);
