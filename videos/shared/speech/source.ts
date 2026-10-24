export const synthesisFormat = "riff-48khz-16bit-mono-pcm";

/** Timing owns the selected asset; missing metadata denotes historical MP3. */
export function narrationFile(id: string, audio: { audioFile?: string }) {
  const file = audio.audioFile ?? `${id}.mp3`;
  if (file !== `${id}.mp3` && file !== `${id}.wav`)
    throw Error(`Invalid narration file: ${id}`);
  return file;
}
