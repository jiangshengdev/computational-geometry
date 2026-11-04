import { Config } from "@remotion/cli/config";
import { configureVideo } from "../../shared/config/remotion";

configureVideo(Config, {
  overwriteOutput: true,
});
