import { speechComparisonText, type AudioTiming } from "./timing.ts";

/** Recognition copies only: partition at a measured sentence pause, never retime audio. */
export function assessmentChunks(audio: AudioTiming, pcm: Buffer) {
  const sampleRate = 48000;
  const totalSamples = pcm.length / 2;
  if (
    pcm.length % 2 ||
    Math.abs(totalSamples / sampleRate - audio.duration) > 0.002
  )
    throw Error("Assessment PCM does not match the measured source duration");
  const source = speechComparisonText(audio.speech);
  let cursor = 0;
  const candidates: { sample: number; textOffset: number }[] = [];
  for (const word of audio.alignment?.synthesisWords ?? audio.words) {
    const offset = source.indexOf(speechComparisonText(word.text), cursor);
    if (
      offset < 0 ||
      !/^[\p{P}\p{Z}\s]*$/u.test(audio.speech.slice(cursor, offset))
    )
      throw Error("Cannot locate synthesis word for assessment partition");
    const before = audio.speech.slice(0, offset).trimEnd();
    if (/[。！？]$/.test(before) && /[\p{L}\p{N}]/u.test(word.text)) {
      const sample = Math.round(((word.startMs - 100) * sampleRate) / 1000);
      // Require 20 ms of actual quiet PCM around the cut, rather than trusting
      // punctuation or a zero-duration synthesis event to establish silence.
      let quiet = sample >= 480 && sample + 480 <= totalSamples;
      for (let i = sample - 480; quiet && i < sample + 480; i++)
        if (Math.abs(pcm.readInt16LE(i * 2)) > 32) quiet = false;
      if (quiet) candidates.push({ sample, textOffset: offset });
    }
    cursor = offset + word.text.length;
  }
  const chunks: { startSample: number; endSample: number; speech: string }[] =
    [];
  let startSample = 0,
    textOffset = 0;
  while (totalSamples - startSample > 30 * sampleRate) {
    const available = candidates.filter(
      (c) =>
        c.sample > startSample &&
        c.sample <= startSample + 25 * sampleRate &&
        c.textOffset > textOffset,
    );
    const cut = available[available.length - 1];
    if (!cut)
      throw Error("No measured quiet sentence boundary within 25 seconds");
    chunks.push({
      startSample,
      endSample: cut.sample,
      speech: audio.speech.slice(textOffset, cut.textOffset),
    });
    startSample = cut.sample;
    textOffset = cut.textOffset;
  }
  chunks.push({
    startSample,
    endSample: totalSamples,
    speech: audio.speech.slice(textOffset),
  });
  return chunks;
}

export type AssessmentResponse = {
  RecognitionStatus: string;
  NBest: {
    Words: {
      Word: string;
      Offset: number;
      Duration: number;
      PronunciationAssessment: { ErrorType: string };
    }[];
  }[];
};

/** Preserve every service word/error and raw response; only translate sample origins. */
export function combineAssessments(
  parts: {
    startSample: number;
    endSample: number;
    speech: string;
    response: AssessmentResponse;
  }[],
) {
  if (
    !parts.length ||
    parts[0].startSample !== 0 ||
    parts.some(
      (p, i) =>
        p.response.RecognitionStatus !== "Success" ||
        !p.response.NBest?.[0]?.Words?.length ||
        p.endSample <= p.startSample ||
        (i > 0 && parts[i - 1].endSample !== p.startSample),
    )
  )
    throw Error("Incomplete or noncontiguous assessment chunks");
  return {
    RecognitionStatus: "Success",
    NBest: [
      {
        Words: parts.flatMap((part) =>
          part.response.NBest[0].Words.map((word) => ({
            ...word,
            Offset:
              word.Offset + Math.round((part.startSample * 10000000) / 48000),
          })),
        ),
      },
    ],
    chunks: parts,
  };
}
