import { useCurrentFrame } from "remotion";
import { TeachingPage } from "./TeachingPage";
import { rowAt, visualAt } from "./timeline";

/** Silent production scene. No provisional data is accepted as audio timing. */
export const MyComposition = () => {
  const frame = useCurrentFrame();
  const row = rowAt(frame);
  return (
    <>
      <TeachingPage row={row} state={visualAt(row, frame - row.from)} />
      <div
        style={{
          position: "absolute",
          right: 40,
          bottom: 140,
          fontSize: 20,
          color: "#64748b",
        }}
      >
        文案画面预览 · 暂定阅读计时 · 无配音
      </div>
    </>
  );
};
