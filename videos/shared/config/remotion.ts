import { resolve } from "node:path";

type RspackConfig = { resolve?: { modules?: string[] } };
type VideoConfig = {
  setRspack(value: boolean): void;
  setVideoImageFormat(value: "png"): void;
  setOverwriteOutput(value: boolean): void;
  setDefaultPremountInSeconds(value: number): void;
  setSequenceActivityLimit(value: number): void;
  setScale(value: number): void;
  setCodec(value: "h265"): void;
  setPixelFormat(value: "yuv420p"): void;
  setHardwareAcceleration(value: "required"): void;
  setAudioCodec(value: "pcm-16"): void;
  setSampleRate(value: number): void;
  setConcurrency(value: number): void;
  overrideRspackConfig(
    override: <T extends RspackConfig>(config: T) => T,
  ): void;
};

/** Apply the common policy to the caller's installed Remotion configuration. */
export function configureVideo(
  Config: VideoConfig,
  {
    overwriteOutput,
    sequenceActivityLimit,
  }: { overwriteOutput: boolean; sequenceActivityLimit?: number },
) {
  Config.setRspack(true);
  Config.setVideoImageFormat("png");
  Config.setOverwriteOutput(overwriteOutput);
  Config.setDefaultPremountInSeconds(2);
  if (sequenceActivityLimit !== undefined)
    Config.setSequenceActivityLimit(sequenceActivityLimit);
  Config.setScale(2);
  Config.setCodec("h265");
  Config.setPixelFormat("yuv420p");
  Config.setHardwareAcceleration("required");
  Config.setAudioCodec("pcm-16");
  Config.setSampleRate(48000);
  Config.setConcurrency(4);
  Config.overrideRspackConfig((config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      modules: [
        resolve("node_modules"),
        ...(config.resolve?.modules ?? ["node_modules"]),
      ],
    },
  }));
}
