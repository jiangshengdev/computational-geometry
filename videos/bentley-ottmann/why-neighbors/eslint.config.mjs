import { config } from "@remotion/eslint-config-flat";
import { componentPolicy } from "../../shared/checks/component-policy.ts";

export default [...config, componentPolicy];
