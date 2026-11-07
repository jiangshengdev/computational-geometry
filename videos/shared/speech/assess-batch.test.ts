import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("subset assessment rejects legacy uncertain requests before creating a client or changing evidence", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "assessment-ledger-test-"));
  t.after(() => rmSync(directory, { recursive: true }));
  writeFileSync(
    join(directory, "manifest.json"),
    JSON.stringify({
      requests: [
        {
          id: "OR01",
          fingerprint: "test-only",
          status: "synthesized-and-decoded",
        },
      ],
    }),
  );
  writeFileSync(
    join(directory, "assessment-manifest.json"),
    JSON.stringify({
      requests: [{ id: "OR01", status: "request-failed-or-uncertain" }],
    }),
  );
  const evidence = "test-only partial response";
  writeFileSync(
    join(directory, "OR01.wav.assessment-chunk-0.wav.assessment.json"),
    evidence,
  );
  const before = readdirSync(directory).sort();
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-",
      `--staging=${directory}`,
      "--shots=OR01",
      "--dry-run",
    ],
    {
      input: `import {assessBatch} from ${JSON.stringify(new URL("./assess-batch.ts", import.meta.url).href)}; await assessBatch({});`,
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /OR01: assessment previously attempted \(request-failed-or-uncertain\)/,
  );
  assert.deepEqual(readdirSync(directory).sort(), before);
  assert.equal(
    readFileSync(
      join(directory, "OR01.wav.assessment-chunk-0.wav.assessment.json"),
      "utf8",
    ),
    evidence,
  );
});
