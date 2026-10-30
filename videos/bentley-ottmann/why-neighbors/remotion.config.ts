/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { resolve } from "node:path";

Config.setRspack(true);
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(false);
Config.setDefaultPremountInSeconds(2);
// Remotion 4.0.539 can keep hidden Sequence audio playing in Studio.
// Unmount completed sequences so narration cannot overlap the next segment.
Config.setSequenceActivityLimit(0);
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
