import { pageList, type Step } from "./storyboard.ts";
import { events, emptyState, initialQueue, results } from "./example.ts";
export const fps = 60;
/** Reading estimates only. Replace with measured timing in the separately authorized audio stage. */
export const timingKind = "provisional-visuals" as const;
export const rows = pageList.flatMap((p) =>
  p.steps.map((step, i) => {
    let end = 0;
    const captions = step.captions.map((text) => {
      const start = end;
      end += Math.max(240, Math.ceil((text.length / 4.3) * fps));
      return { text, start, end };
    });
    return {
      ...step,
      page: p.id,
      step: i + 1,
      from: 0,
      readingFrames: end,
      durationInFrames: end + (i === p.steps.length - 1 ? 120 : 30),
      pauseAfter: i === p.steps.length - 1 ? 2 : 0,
      revealMs: 0,
      stages: [],
      captions,
    };
  }),
);
let cursor = 0;
for (const row of rows) {
  row.from = cursor;
  cursor += row.durationInFrames;
}
export const durationInFrames = cursor;
export type TimelineRow = (typeof rows)[number];
export const motionCue = (row: TimelineRow) => ({
  start: Math.min(90, row.readingFrames / 5),
  end: Math.min(row.readingFrames - 90, row.captions[0].end - 30, 420),
});
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
  const caption =
    row.captions.find((c) => frame >= c.start && frame < c.end)?.text ??
    row.captions.at(-1)!.text;
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
