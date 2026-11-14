import { useCurrentFrame } from "remotion";
import { rows, visualAt } from "./timeline";
import { TeachingPage } from "./TeachingPage";
export const MyComposition = () => {
  const frame = useCurrentFrame();
  const row = rows.findLast((r) => r.from <= frame) ?? rows[0];
  return <TeachingPage row={row} state={visualAt(row, frame - row.from)} />;
};
