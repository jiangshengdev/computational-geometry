import { Config } from "@remotion/cli/config";
import { configureVideo } from "../../shared/config/remotion";

configureVideo(Config, {
  overwriteOutput: false,
  // Unmount completed sequences to preserve this episode's Studio audio behavior.
  sequenceActivityLimit: 0,
});
