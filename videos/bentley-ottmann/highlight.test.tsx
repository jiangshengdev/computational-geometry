import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TeachingPage as UpperPage } from "./intersection-goals/src/TeachingPage";
import { TeachingPage as LowerPage } from "./pairwise-baseline/src/TeachingPage";
import * as upper from "./intersection-goals/src/timeline";
import * as lower from "./pairwise-baseline/src/timeline";
import { InputDiagram } from "./intersection-goals/src/InputDiagram";
import { PairingDiagram } from "./pairwise-baseline/src/PairingDiagram";

test("body emphasis stays steady while diagrams follow semantic cues", () => {
  for (const episode of [upper, lower]) {
    for (const row of episode.timelineFor()) {
      // Sample throughout speech, including word boundaries and gaps. Compare
      // only frames with the same revealed content and selected input objects.
      const states = new Map<string, string>();
      for (
        let frame = episode.audioLeadFrames + 30;
        frame < row.speechFrames;
        frame += 17
      ) {
        if (row.page === "opening" && episode === upper) continue;
        if (["ordered", "unordered", "substitution"].includes(row.page))
          continue;
        const state = episode.visualAt(row as never, frame);
        const key = JSON.stringify([
          state.visibleStep,
          "activeInputs" in state ? state.activeInputs : [],
          "shift" in state ? state.shift : 0,
        ]);
        const props = { ...state, shot: row, caption: "" };
        const html =
          episode === upper
            ? renderToStaticMarkup(
                <UpperPage {...(props as Parameters<typeof UpperPage>[0])} />,
              )
            : renderToStaticMarkup(
                <LowerPage {...(props as Parameters<typeof LowerPage>[0])} />,
              );
        const body = html
          .split('<section data-main-column="true"')[1]
          ?.split("</section>")[0];
        assert.ok(body, `${row.id}: production teaching column exists`);
        const previous = states.get(key);
        if (previous !== undefined)
          assert.equal(
            body,
            previous,
            `${row.id}: unchanged teaching state must not flash`,
          );
        states.set(key, body);
      }
    }
  }
});

test("every authored phrase resolves to a visible production cue, then stops", () => {
  for (const episode of [upper, lower]) {
    for (const [id, cues] of Object.entries(episode.lessonCues.timings)) {
      const row = episode.timelineFor().find((row) => row.id === id)!;
      for (const cue of cues) {
        const frame =
          episode.audioLeadFrames +
          ((cue.start + (cue.end - cue.start) * 0.4) * episode.fps) / 1000;
        const state = episode.visualAt(row as never, frame);
        assert.equal(state.lessonFocus?.phrase, cue.phrase, id);
        assert.equal(state.lessonFocus?.active, true, id);
        const props = { ...state, shot: row, caption: "" };
        const html =
          episode === upper
            ? renderToStaticMarkup(
                <UpperPage {...(props as Parameters<typeof UpperPage>[0])} />,
              )
            : renderToStaticMarkup(
                <LowerPage {...(props as Parameters<typeof LowerPage>[0])} />,
              );
        assert.equal(
          (html.match(/data-attention-marks="true"/g) ?? []).length,
          Object.keys(cue.panels ?? {}).length,
          `${id}: ${cue.phrase} must reach every named panel`,
        );
        if (cue.keys?.length)
          assert.match(
            html,
            /outline:3px solid #b45309/,
            `${id}: ${cue.phrase} must select a visible object`,
          );
      }
      assert.equal(
        episode.lessonCues.at(id, cues[cues.length - 1].end + 1)?.active,
        false,
      );
    }
  }
});

test("bounds compare candidates, choose an endpoint, then introduce its name", () => {
  for (const [id, name] of [
    ["U36", "L"],
    ["U37", "R"],
  ]) {
    const cues = upper.lessonCues.timings[id];
    const choice = cues.find((cue) => cue.phrase.startsWith("选"))!;
    const named = cues.find((cue) => cue.name === name)!;
    const chosen = upper.lessonCues.at(id, (choice.start + choice.end) / 2)!;
    assert.equal(chosen.panels?.bounds.length, 1);
    assert.equal(chosen.reached.includes(name), false);
    assert.ok(upper.lessonCues.at(id, named.start + 1)?.reached.includes(name));
    const row = upper.timelineFor().find((row) => row.id === id)!;
    const htmlAt = (ms: number) =>
      renderToStaticMarkup(
        <UpperPage
          {...upper.visualAt(
            row,
            upper.audioLeadFrames + (ms * upper.fps) / 1000,
          )}
          shot={row}
        />,
      );
    const x = name === "L" ? 240 : 510;
    assert.ok(!htmlAt(choice.start + 1).includes(`x1="${x}" y1="65"`));
    assert.ok(htmlAt(named.start + 1).includes(`x1="${x}" y1="65"`));
  }
});

test("the sample retains its animated diamond cue during its phrase", () => {
  const row = upper.timelineFor().find((row) => row.id === "U03")!;
  let highlightedFrames = 0;
  for (let frame = 0; frame < row.durationInFrames; frame++) {
    const state = upper.visualAt(row, frame);
    if (state.focus?.target !== "diamond") continue;
    const html = renderToStaticMarkup(<UpperPage {...state} shot={row} />);
    assert.match(html, /M185 165 L205 185 L185 205 L165 185 Z/);
    highlightedFrames++;
  }
  assert.ok(highlightedFrames > 0, "U03 must retain its spoken diamond cue");
  const frames = [0.25, 0.5, 0.75].map((progress) =>
    renderToStaticMarkup(
      <InputDiagram
        animateFocus
        inputs={[3]}
        focus={{ target: "diamond", progress }}
      />,
    ),
  );
  assert.match(frames[0], /M185 165 L205 185 L185 205 L165 185 Z/);
  assert.notEqual(frames[0], frames[1]);
  assert.notEqual(frames[1], frames[2]);
  assert.notEqual(
    frames[0],
    renderToStaticMarkup(<InputDiagram inputs={[3]} />),
  );
});

test("the sample retains animated input identity emphasis", () => {
  const frames = [0.25, 0.375, 0.5].map((progress) =>
    renderToStaticMarkup(
      <UpperPage
        shot={{ page: "opening" }}
        visibleStep={3}
        activeInput={3}
        caption=""
        focus={{ target: "identity", progress }}
      />,
    ),
  );
  assert.notEqual(frames[0], frames[1]);
  assert.notEqual(frames[1], frames[2]);
});

test("ordered selection retains all four highlights and pair merging", () => {
  const row = lower.timelineFor().find((row) => row.id === "D26")!;
  const selected = new Set<number>();
  for (let frame = 0; frame < row.durationInFrames; frame++) {
    const state = lower.visualAt(row, frame);
    if (state.pairing.first) selected.add(state.pairing.first);
  }
  assert.deepEqual([...selected], [1, 2, 3, 4]);
  const html = renderToStaticMarkup(
    <PairingDiagram
      page="ordered"
      visibleStep={5}
      shift={1}
      state={{ first: 4, selection: 1, merge: 0 }}
    />,
  );
  assert.match(html, /border:3px solid #b45309/);
  assert.match(html, /background:#fff4e8/);
  const merge = lower.timelineFor().find((row) => row.id === "D27")!;
  let previous = 0;
  for (let frame = 0; frame < merge.durationInFrames; frame++) {
    const current = lower.visualAt(merge, frame).pairing.merge;
    assert.ok(current >= previous);
    previous = current;
  }
  assert.equal(previous, 1);
});
