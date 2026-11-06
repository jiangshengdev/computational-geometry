import { useCurrentFrame } from "remotion";
import { TeachingPage } from "./TeachingPage";
import { rowAt, visualAt } from "./timeline";

/** Silent visual rehearsal; no audio source. */
export function MyComposition() {
  const frame = useCurrentFrame();
  const row = rowAt(frame);
  return <TeachingPage row={row} state={visualAt(row, frame - row.from)} />;
}
