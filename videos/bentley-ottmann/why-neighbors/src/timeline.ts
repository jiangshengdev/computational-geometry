import { pages, shots } from "./lesson.ts";
import audioData from "./audio-timing.json" with { type: "json" };
import captionData from "./captions.json" with { type: "json" };
import plans from "./sentence-plan.json" with { type: "json" };
import { createShotTimeline } from "../../../shared/speech/shot-timeline.ts";
import {
  captionAt,
  phraseTime,
  type AudioTiming,
  type Caption,
} from "../../../shared/speech/timing.ts";
export const fps = 60;
export const audioLeadFrames = 0;
export const timingKind = "measured-narration" as const;
export const audio = audioData as Record<string, AudioTiming>;
const captions: Record<string, Caption[]> = captionData;
const shared = createShotTimeline({
  shots,
  pages,
  timing: audio,
  captions,
  fps,
  audioLeadFrames,
});
/** Play each page's entire WAV continuously; word times only drive visuals. */
export const timelineFor = () => {
  return shared.timelineFor().map((shot) => {
    const page = pages[shot.page];
    const recording = audio[shot.id];
    if (!recording) throw Error(`Missing measured audio: ${shot.id}`);
    const sentences = plans[shot.id as keyof typeof plans];
    let sentenceIndex = 0;
    const spoken = page.steps.map((step) => {
      let caption = "",
        speech = "";
      while (
        caption.length < step.caption.length &&
        sentenceIndex < sentences.length
      ) {
        const sentence = sentences[sentenceIndex++];
        caption += sentence.caption;
        speech += sentence.speech.join("");
      }
      if (caption !== step.caption)
        throw Error(`${shot.id}: sentence plan crosses a teaching step`);
      const anchor = speech.replace(/[。！？]+$/u, "");
      return {
        start: phraseTime(recording, anchor, "start"),
        end: phraseTime(recording, anchor, "end"),
      };
    });
    if (sentenceIndex !== sentences.length)
      throw Error(`${shot.id}: unused semantic sentences`);
    const stages = spoken.map((speech, index) => {
      const earliest = index
        ? Math.ceil((spoken[index - 1].end * fps) / 1000)
        : 0;
      const latest = Math.floor((speech.start * fps) / 1000) - 1;
      if (earliest > latest)
        throw Error(`${shot.id}: no reveal frame before step ${index + 1}`);
      const frame = index ? Math.floor((earliest + latest) / 2) : 0;
      return {
        step: index + 1,
        frame,
        ms: (frame * 1000) / fps,
        speechStartMs: speech.start,
        speechEndMs: speech.end,
      };
    });
    return {
      ...shot,
      stages,
      captions: captions[shot.id],
    };
  });
};
export type TimelineRow = ReturnType<typeof timelineFor>[number];
export function visualAt(row: TimelineRow, frame: number) {
  const stage =
    row.stages.filter((stage) => stage.frame <= frame).slice(-1)[0] ??
    row.stages[0];
  const ms = (frame * 1000) / fps;
  return {
    visibleStep: stage.step,
    caption: captionAt(row.captions, ms, row.captions[0].text),
    thinking: false,
    cueActive: ms >= stage.speechStartMs && ms < stage.speechEndMs,
    cueProgress: Math.max(
      0,
      Math.min(
        1,
        (ms - stage.speechStartMs) / (stage.speechEndMs - stage.speechStartMs),
      ),
    ),
  };
}
