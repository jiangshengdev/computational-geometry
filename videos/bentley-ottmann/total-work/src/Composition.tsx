import { useCurrentFrame } from "remotion";
import { rows, visualAt } from "./timeline";
import { TeachingPage } from "./TeachingPage";
export function MyComposition() {
  const frame = useCurrentFrame();
  const row = rows.findLast((r) => frame >= r.from) ?? rows[0];
  return <TeachingPage row={row} state={visualAt(row, frame - row.from)} />;
}
