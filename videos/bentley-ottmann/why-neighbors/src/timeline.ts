import { pages, shots } from "./lesson.ts";
import audioData from "./audio-timing.json" with { type: "json" };
import captionData from "./captions.json" with { type: "json" };
import plans from "./sentence-plan.json" with { type: "json" };
import {
  captionAt,
  phraseTime,
  type AudioTiming,
  type Caption,
} from "../../../shared/speech/timing.ts";
export const fps = 60;
export const audioLeadFrames = 12;
export const timingKind = "measured-narration" as const;
export const audio = audioData as Record<string, AudioTiming>;
const captions: Record<string, Caption[]> = captionData;
/** Keep the original WAV intact. Add reading time only between semantic steps,
 * at a frame wholly inside the measured inter-step silence. */
export const timelineFor = () => {
  let from = 0;
  return shots.map((shot) => {
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
    const cuts = [0];
    for (let index = 1; index < spoken.length; index++) {
      const earliest = Math.ceil((spoken[index - 1].end * fps) / 1000);
      const latest = Math.floor((spoken[index].start * fps) / 1000);
      if (earliest > latest)
        throw Error(
          `${shot.id}: no measured silent frame before step ${index + 1}`,
        );
      cuts.push(Math.floor((earliest + latest) / 2));
    }
    cuts.push(Math.ceil(recording.duration * fps));
    let cursor = 0;
    const stages = page.steps.map((step, index) => {
      const audioFrame = cursor + audioLeadFrames;
      const shiftMs = ((audioFrame - cuts[index]) * 1000) / fps;
      const stage = {
        step: index + 1,
        frame: cursor,
        ms: (cursor * 1000) / fps,
        audioFrame,
        trimBefore: cuts[index],
        trimAfter: cuts[index + 1],
        speechStartMs: spoken[index].start + shiftMs,
        speechEndMs: spoken[index].end + shiftMs,
      };
      cursor += Math.max(
        Math.ceil(step.seconds * fps),
        audioLeadFrames + cuts[index + 1] - cuts[index],
      );
      return stage;
    });
    const timedCaptions = captions[shot.id].map((caption) => {
      const stage = stages.find(
        (stage) =>
          caption.startMs >= (stage.trimBefore * 1000) / fps &&
          caption.startMs < (stage.trimAfter * 1000) / fps,
      );
      if (!stage || caption.endMs > (stage.trimAfter * 1000) / fps + 1)
        throw Error(
          `${shot.id}: caption crosses an audio cut: ${caption.text}`,
        );
      const shiftMs = ((stage.audioFrame - stage.trimBefore) * 1000) / fps;
      return {
        ...caption,
        startMs: caption.startMs + shiftMs,
        endMs: caption.endMs + shiftMs,
      };
    });
    const row = {
      ...shot,
      from,
      stages,
      captions: timedCaptions,
      readingFrames: cursor,
      durationInFrames: cursor + page.hold * fps,
    };
    from += row.durationInFrames;
    return row;
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
