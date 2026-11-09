import { selectNarrationShots } from "../../../shared/speech/selection.ts";
import { shots } from "../src/storyboard.ts";
export const { selectedShots, selectedSource } = selectNarrationShots(shots);
