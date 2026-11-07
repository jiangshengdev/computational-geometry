import {
  phraseTime,
  wordsInTextRange,
  type AudioTiming,
} from "../../../shared/speech/timing.ts";
import { visualCues } from "./visual-cues.ts";

/** Two pairs explained collectively: advance on an actual word boundary,
 * never on a fraction of the subtitle's estimated reading duration. */
const secondPairPhrase: Record<string, string> = {
  "OR17/J23": "分别配对",
  "OR36/BZ": "当前成员分别配对",
};

export function measuredOperations(
  id: string,
  audio: AudioTiming,
  fps: number,
  lead: number,
) {
  const operations = (visualCues[id] ?? []).map((cue) => {
    let startMs = phraseTime(audio, cue.phrase, "start");
    const endMs = phraseTime(audio, cue.phrase, "end");
    const suffix = secondPairPhrase[`${id}/${cue.name}`];
    if (suffix) {
      const index = cue.phrase.indexOf(suffix);
      if (index < 0)
        throw Error(`${id}/${cue.name}: missing spoken subdivision`);
      const start = audio.speech.indexOf(cue.phrase) + index;
      const words = wordsInTextRange(audio, start, start + suffix.length);
      if (!words.length)
        throw Error(`${id}/${cue.name}: missing measured subdivision`);
      startMs = words[0].startMs;
    }
    return {
      name: cue.name,
      start: lead + Math.floor((startMs * fps) / 1000),
      end: lead + Math.ceil((endMs * fps) / 1000),
    };
  });
  operations.forEach((op, i) => {
    op.end = Math.min(op.end, operations[i + 1]?.start ?? op.end);
    if (op.end <= op.start)
      throw Error(`${id}/${op.name}: overlapping or empty action`);
  });
  return operations;
}
