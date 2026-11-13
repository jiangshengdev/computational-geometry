import { pageList, shots, type Step } from "./storyboard.ts";
import { events, emptyState, initialQueue, results } from "./example.ts";
import audioData from "./audio-timing.json" with { type: "json" };
import captionData from "./captions.json" with { type: "json" };
import sentences from "./sentence-plan.json" with { type: "json" };
import { measuredShotRows } from "../../../shared/speech/measured-shot-rows.ts";
import {
  phraseTime,
  type AudioTiming,
  type Caption,
} from "../../../shared/speech/timing.ts";
export const fps = 60;
export const audioLeadFrames = 30;
export const timingKind = "measured-narration" as const;
export const audio = audioData as Record<string, AudioTiming>;
export const rows = measuredShotRows({
  shots,
  pages: Object.fromEntries(
    pageList.map((page) => [page.id, { holdAfterSeconds: 2 }]),
  ),
  audio,
  captions: captionData as Record<string, (Caption & { source: number })[]>,
  fps,
  audioLeadFrames,
  betweenShotPauseSeconds: 0.5,
});
export const durationInFrames = rows.reduce(
  (sum, row) => sum + row.durationInFrames,
  0,
);
export type TimelineRow = (typeof rows)[number];
/** Whole semantic operations follow measured speech, not subtitle character counts. */
const operationAnchors: Record<string, [string, string]> = {
  CS33: ["令绿色直线的高度为零", "得到候选 x 坐标为三"],
  CS13: ["现在只为看清对应关系", "显示八分之一系数的放大示意"],
  CS38: ["但最远右端", "从二延长到四"],
  CS41: ["现在把新增交点", "加入待处理清单"],
  CS61: ["绿色到下方", "红色到上方"],
  CS64: ["统一变换后", "用 Q 撇表示这个新位置"],
  CS74: ["令青色的新高度为零", "得到候选新 x 坐标为五"],
};
export const motionCue = (row: TimelineRow) => {
  const firstSentence = (sentences as Record<string, { speech: string[] }[]>)[
    row.id
  ][0].speech.join("");
  const [from, to] = operationAnchors[row.id] ?? [firstSentence, firstSentence];
  return {
    start:
      audioLeadFrames +
      Math.floor((phraseTime(audio[row.id], from, "start") * fps) / 1000),
    end:
      audioLeadFrames +
      Math.ceil((phraseTime(audio[row.id], to, "end") * fps) / 1000),
  };
};
export function visualAt(row: TimelineRow, frame: number) {
  const cue = motionCue(row),
    motion = Math.max(
      0,
      Math.min(1, (frame - cue.start) / (cue.end - cue.start)),
    );
  const n = row.event ?? 0,
    evt = events[n - 1],
    previous = events[n - 2] ?? emptyState;
  const updated = row.phase === "update" || row.phase === "check";
  const order = evt && updated ? evt.order : previous.order;
  const members = evt && updated ? evt.members : previous.members;
  const count =
    row.phase === "read" ? 0 : row.phase === "report" ? (row.reported ?? 0) : 3;
  const currentResults = evt
    ? results
        .filter((r) => r.event < n)
        .concat(results.filter((r) => r.event === n).slice(0, count))
    : [];
  const registered =
    Number(row.id.slice(2)) > 41 || (row.id === "CS41" && motion >= 1);
  const queue = (registered ? events.map((e) => e.n) : initialQueue).filter(
    (e) => e > n,
  );
  const captionIndex = row.captions.findLastIndex((c) => frame >= c.start);
  const caption = row.captions[captionIndex]?.text ?? row.previousCaption;
  return {
    visibleStep: row.step,
    thinking: false,
    caption,
    motion,
    active: motion > 0 && motion < 1,
    order,
    members,
    previous: {
      order: previous.order,
      members: previous.members,
      right: previous.right,
    },
    results: currentResults,
    queue,
    right: evt && updated ? evt.right : previous.right,
    updated,
    completed: row.view === "ledger" ? n : Math.max(0, n - 1),
  };
}
export type VisualState = ReturnType<typeof visualAt>;
export const shownInputs = (row: Pick<Step, "inputs">) =>
  row.inputs ?? ["A", "B", "C", "D", "V", "H", "Z"];
