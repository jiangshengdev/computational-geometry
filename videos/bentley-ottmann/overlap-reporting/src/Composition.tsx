import { useCurrentFrame } from "remotion";
import { TeachingPage } from "./TeachingPage";
import { rowAt, visualAt } from "./timeline";
/** #344 is silent. No provisional duration is represented as measured audio. */
export function MyComposition() {
  const frame = useCurrentFrame();
  const row = rowAt(frame);
  return <TeachingPage row={row} state={visualAt(row, frame - row.from)} />;
}
