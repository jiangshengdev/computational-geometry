/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
// Rasterize the 1920×1080 logical layout at 3840×2160.
Config.setScale(2);
Config.setCodec("h265");
// Favor crisp equations while retaining common HEVC playback compatibility.
Config.setCrf(18);
Config.setPixelFormat("yuv420p");
Config.setHardwareAcceleration("disable");
Config.setVideoImageFormat("png");
Config.setAudioCodec("aac");
Config.setAudioBitrate("192k");
// Limit simultaneous 4K pages and PNG buffers; this is not a speed benchmark.
Config.setConcurrency(4);
