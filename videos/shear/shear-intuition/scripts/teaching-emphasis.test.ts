import assert from "node:assert/strict";
import test from "node:test";
import { renderToString } from "katex";
import { pages, shots } from "../src/storyboard.ts";
import {
  captionNumberRoles,
  captionNumbers,
  colorMath,
  lineMarks,
  pageRoles,
  paintMath,
} from "../src/teaching-emphasis.ts";

test("primed objects follow the operation while the fixed point keeps its identity", () => {
  for (const role of ["movement", "coordinates"] as const) {
    assert.equal(
      colorMath("P+x'+sy", role),
      `${paintMath("P", "original")}+${paintMath("x'", role)}+${paintMath("sy", "movement")}`,
    );
  }
  assert.equal(
    colorMath("P+x'", undefined),
    `${paintMath("P", "original")}+x'`,
  );
});

test("a short caption retains the roles of repeated values in the full sentence", () => {
  const shot = shots.find((s) => s.id === "205-06")!;
  const cue = "新横坐标是 3，新纵坐标是 2。";
  assert.deepEqual(
    captionNumbers(shot.caption, cue, captionNumberRoles[shot.id]),
    ["coordinates", "coordinates"],
  );
  assert.deepEqual(
    captionNumbers(
      shot.caption,
      "原横坐标是 2，原纵坐标是 2。",
      captionNumberRoles[shot.id],
    ),
    ["original", "original"],
  );
  assert.throws(() => captionNumbers(shot.caption, "missing", []));
});

test("all authored math annotations resolve and remain valid KaTeX", () => {
  for (const [id, page] of Object.entries(pages)) {
    assert.ok(pageRoles[id], id);
    for (const [index, line] of page.lines.entries()) {
      if (!line.math) continue;
      const colored = colorMath(
        line.math,
        pageRoles[id],
        lineMarks[id]?.[index],
      );
      assert.doesNotThrow(
        () => renderToString(colored, { throwOnError: true, strict: "error" }),
        `${id}:${index}`,
      );
    }
  }
  assert.throws(() =>
    colorMath("x=2", "movement", [{ text: "3", role: "original" }]),
  );
});

test("caption annotations account for every authored numeric occurrence", () => {
  for (const [id, roles] of Object.entries(captionNumberRoles)) {
    const shot = shots.find((s) => s.id === id);
    assert.ok(shot, id);
    assert.equal(
      [...shot.caption.matchAll(/\d+(?:\.\d+)?/g)].length,
      roles.length,
      id,
    );
  }
});
