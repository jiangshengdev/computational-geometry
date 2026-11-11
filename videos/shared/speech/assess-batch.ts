import { failureDiagnostic } from "./request-diagnostic.ts";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import type * as SpeechSdk from "microsoft-cognitiveservices-speech-sdk";
import { createAlignmentTools } from "./azure-alignment.ts";
import { audioSha256 } from "./audio.ts";
import type { AudioTiming } from "./timing.ts";

export async function assessBatch(
  sdk: typeof SpeechSdk,
  configureSpeechConfig?: (config: SpeechSdk.SpeechConfig) => void,
) {
  const args = process.argv.slice(2);
  assert(
    args.filter((arg) => arg.startsWith("--staging=")).length === 1 &&
      args.filter((arg) => arg.startsWith("--shots=")).length <= 1 &&
      args.filter((arg) => arg === "--dry-run").length <= 1 &&
      args.every(
        (arg) =>
          arg.startsWith("--staging=") ||
          arg.startsWith("--shots=") ||
          arg === "--dry-run",
      ),
    "Use --staging=<batch> [--shots=id,...] [--dry-run]",
  );
  const root = resolve(
    args
      .find((arg) => arg.startsWith("--staging="))!
      .slice("--staging=".length),
  );
  const batch = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  const requested = args
    .find((arg) => arg.startsWith("--shots="))
    ?.slice(8)
    .split(",");
  if (requested)
    assert(
      requested.length > 0 &&
        new Set(requested).size === requested.length &&
        requested.every((id) =>
          batch.requests.some((r: { id: string }) => r.id === id),
        ),
      "Unknown or repeated assessment shot",
    );
  const selected = requested
    ? batch.requests.filter((r: { id: string }) => requested.includes(r.id))
    : batch.requests;
  // Older batches have no per-record reservation. Their request states remain
  // authoritative, including an attempted request with no final response file.
  for (const name of readdirSync(root).filter((name) =>
    /^assessment-manifest(?:-[a-f0-9]+)?\.json$/.test(name),
  )) {
    const previous = JSON.parse(readFileSync(join(root, name), "utf8"));
    assert(
      Array.isArray(previous.requests),
      `Incomplete assessment ledger: ${name}`,
    );
    for (const record of previous.requests) {
      if (selected.some((request: { id: string }) => request.id === record.id))
        assert.equal(
          record.status,
          "not-started",
          `${record.id}: assessment previously attempted (${record.status}); inspect ${name}, do not replay`,
        );
    }
  }
  assert(
    selected.length &&
      selected.every(
        (r: { status: string }) => r.status === "synthesized-and-decoded",
      ),
    "Synthesis batch is incomplete",
  );
  const selectionHash = createHash("sha256")
    .update(selected.map((r: { id: string }) => r.id).join(","))
    .digest("hex")
    .slice(0, 16);
  const manifestPath = join(
    root,
    requested
      ? `assessment-manifest-${selectionHash}.json`
      : "assessment-manifest.json",
  );
  assert(
    !existsSync(manifestPath),
    "Assessment already started; inspect saved state, do not replay",
  );
  const { alignAudio } = createAlignmentTools(sdk, {
    configureSpeechConfig,
    allowReviewedPronunciation: false,
    deferPronunciationReview: true,
  });
  const records: {
    id: string;
    status: string;
    audioSha256: string;
    fingerprint: string;
    flags?: Record<string, number>;
    startedAt?: string;
    endedAt?: string;
    diagnostic?: string;
  }[] = [];
  // Validate the entire batch before sending any request.
  const audios: { id: string; path: string; audio: AudioTiming }[] =
    selected.map((request: { id: string; fingerprint: string }) => {
      const audio = JSON.parse(
        readFileSync(join(root, `${request.id}.json`), "utf8"),
      ) as AudioTiming;
      const path = join(root, `${request.id}.wav`);
      for (const name of [
        `${request.id}.assessment-request.json`,
        `${request.id}.aligned.json`,
        `${request.id}.wav.assessment.json`,
      ])
        assert(
          !existsSync(join(root, name)),
          `${request.id}: assessment already attempted or saved; reuse its evidence, do not replay`,
        );
      assert.equal(audio.audioSha256, audioSha256(path));
      assert.equal(audio.fingerprint, request.fingerprint);
      records.push({
        id: request.id,
        status: "not-started",
        audioSha256: audio.audioSha256!,
        fingerprint: request.fingerprint,
      });
      return { id: request.id, path, audio };
    });
  if (args.includes("--dry-run")) {
    console.log(
      JSON.stringify(
        { mode: "dry-run", requests: records, serviceCalls: 0 },
        null,
        2,
      ),
    );
    return;
  }
  const save = () =>
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          planSha256: batch.planSha256,
          automaticRetries: 0,
          published: false,
          listening: "not-performed",
          requests: records,
        },
        null,
        2,
      ) + "\n",
    );
  writeFileSync(manifestPath, "{}\n", { flag: "wx" });
  save();
  for (const { id, path, audio } of audios) {
    const record = records.find((r) => r.id === id)!;
    // Exclusive per-record reservation also blocks overlapping subset batches.
    writeFileSync(
      join(root, `${id}.assessment-request.json`),
      JSON.stringify({
        manifest: manifestPath,
        audioSha256: audio.audioSha256,
        fingerprint: audio.fingerprint,
      }) + "\n",
      { flag: "wx" },
    );
    record.status = "started";
    record.startedAt = new Date().toISOString();
    save();
    console.log(`${id}: assessment started`);
    let aligned: AudioTiming | undefined;
    try {
      aligned = await alignAudio(audio, path);
    } catch (error) {
      record.diagnostic = failureDiagnostic(error);
      // A successful response can still fail strict timing checks. Preserve it
      // for listening; only a missing/failed response stops later requests.
    }
    record.endedAt = new Date().toISOString();
    const responsePath = `${path}.assessment.json`;
    const response = existsSync(responsePath)
      ? JSON.parse(readFileSync(responsePath, "utf8"))
      : null;
    if (
      response?.RecognitionStatus !== "Success" ||
      !response.NBest?.[0]?.Words?.length
    ) {
      record.status = "request-failed-or-uncertain";
      save();
      throw Error(
        `${id}: assessment stopped; inspect saved response/state; no retry`,
      );
    }
    const counts: Record<string, number> = {
      Mispronunciation: 0,
      Omission: 0,
      Insertion: 0,
    };
    for (const word of response.NBest[0].Words) {
      const type = word.PronunciationAssessment?.ErrorType;
      if (type && type !== "None") counts[type] = (counts[type] ?? 0) + 1;
    }
    record.flags = counts;
    record.status = aligned
      ? "assessed-timing-available"
      : "assessed-timing-needs-review";
    if (aligned)
      writeFileSync(
        join(root, `${id}.aligned.json`),
        JSON.stringify(aligned, null, 2) + "\n",
        { flag: "wx" },
      );
    save();
    // Remove only disposable recognition copies made by alignAudio; keep the
    // original WAV and all raw/chunk response JSON evidence.
    for (const name of readdirSync(root)) {
      if (
        name === `${id}.wav.wav` ||
        (name.startsWith(`${id}.wav.assessment-chunk-`) &&
          name.endsWith(".wav"))
      )
        rmSync(join(root, name));
    }
    console.log(`${id}: ${record.status}; ${JSON.stringify(counts)}`);
  }
  console.log(
    "Assessment finished; automatic flags are not listening conclusions; no formal assets adopted",
  );
}
