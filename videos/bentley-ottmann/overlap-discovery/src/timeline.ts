import { shots, pages } from "./storyboard.ts";
import { clauses } from "../../../shared/speech/timing.ts";
import { groupCaptionClauses } from "../../../shared/speech/captions.ts";

export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "silent-inspection-only";
// Changes follow reviewed subtitle phrases even in this silent draft. #348
// binds the same teaching operations to measured speech, not these estimates.
const phaseAnchors: Record<string, string[]> = {
  OD20: ["也不超过另一组的六", "并预约这个真实交点"],
  OD23: ["到候选点时", "到候选点时"],
  OD24: ["到 x 坐标六处", "到七处"],
  OD28: ["到一处", "到一处"],
  OD37: ["上下边界", "以及空块移走后"],
  OD47: ["至少一个原来不足的组延长了覆盖", "检查时两组已经同时够到目标"],
};
let cursor = 0;
export const rows = shots.map((shot, index) => {
  let end = audioLeadFrames;
  const visible = clauses(shot.captions.join(""));
  const captions = groupCaptionClauses(visible, visible).map(({ text }) => {
    const start = end;
    // Reading windows are explicitly provisional. No synthetic audio timings.
    end += Math.ceil(Math.max(4, text.length / 4.5) * fps);
    return { text, start, end };
  });
  const pauseAfter = Math.max(
    shot.thinkAfter ?? 1,
    shots[index + 1]?.page !== shot.page
      ? pages[shot.page].holdAfterSeconds
      : 0,
  );
  const row = {
    ...shot,
    from: cursor,
    captions,
    phaseStarts: (phaseAnchors[shot.id] ?? []).map((anchor) => {
      const caption = captions.find((c) => c.text.includes(anchor));
      if (!caption) throw Error(`${shot.id}: missing visual phrase ${anchor}`);
      return (
        caption.start +
        Math.floor(
          (caption.text.indexOf(anchor) / caption.text.length) *
            (caption.end - caption.start),
        )
      );
    }),
    readingFrames: end - audioLeadFrames,
    durationInFrames: end + pauseAfter * fps,
    pauseAfter,
    revealMs: -500,
    stages: [] as { ms: number }[],
    previousCaption:
      shots[index - 1]?.page === shot.page
        ? (() => {
            const previous = clauses(shots[index - 1].captions.join(""));
            const grouped = groupCaptionClauses(previous, previous);
            return grouped[grouped.length - 1].text;
          })()
        : "",
  };
  cursor += row.durationInFrames;
  return row;
});
export type TimelineRow = (typeof rows)[number];
export const durationInFrames = cursor;
export function visualAt(row: TimelineRow, frame: number) {
  const end = audioLeadFrames + row.readingFrames;
  const introduced = row.captions.filter((c) => frame >= c.start);
  const progress = Math.max(
    0,
    Math.min(1, (frame - audioLeadFrames) / row.readingFrames),
  );
  const phase = row.phaseStarts.filter((start) => frame >= start).length;
  const operationStart = phase ? row.phaseStarts[phase - 1] : audioLeadFrames;
  const operationEnd = row.phaseStarts[phase] ?? end;
  return {
    visibleStep: row.visibleStep,
    caption: introduced[introduced.length - 1]?.text ?? row.previousCaption,
    thinking: frame >= end,
    active: frame >= audioLeadFrames && frame < end,
    progress,
    phase,
    operationProgress: Math.max(
      0,
      Math.min(
        1,
        (frame - operationStart) / Math.max(1, operationEnd - operationStart),
      ),
    ),
  };
}
export type VisualState = ReturnType<typeof visualAt>;
