import { failureDiagnostic } from "./request-diagnostic.ts";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import type * as SpeechSdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "./azure-speech.ts";
import {
  audioSha256,
  decodeAudio,
  measureAudio,
  verifyPcmSource,
} from "./audio.ts";
import { synthesisFormat } from "./source.ts";
import type { buildBatchPlan } from "./plan-batch.ts";
import { acquireSynthesisWindow } from "./request-window.ts";

export async function synthesizeBatch(
  sdk: typeof SpeechSdk,
  speech: Record<string, unknown>,
  validateSource: () => void,
  {
    concurrency: defaultConcurrency = 1,
    configureSpeechConfig,
  }: {
    concurrency?: number;
    configureSpeechConfig?: (config: SpeechSdk.SpeechConfig) => void;
  } = {},
) {
  const args = process.argv.slice(2);
  const concurrencyArgs = args.filter((arg) =>
    arg.startsWith("--concurrency="),
  );
  assert(concurrencyArgs.length <= 1, "Repeated --concurrency");
  const concurrency = concurrencyArgs.length
    ? Number(concurrencyArgs[0].slice("--concurrency=".length))
    : defaultConcurrency;
  assert(
    Number.isSafeInteger(concurrency) && concurrency >= 1,
    "Synthesis concurrency must be a positive safe integer",
  );
  const flags = ["--continue-unstarted", "--dry-run"];
  for (const flag of flags)
    assert(args.filter((arg) => arg === flag).length <= 1);
  const names = ["plan", "plan-sha256", "output"];
  assert.equal(
    args.filter((arg) => !flags.includes(arg) && !concurrencyArgs.includes(arg))
      .length,
    names.length,
    "Require --plan, --plan-sha256 and --output",
  );
  const options = Object.fromEntries(
    names.map((name) => {
      const matches = args.filter((arg) => arg.startsWith(`--${name}=`));
      assert.equal(matches.length, 1, `Require exactly one --${name}`);
      const value = matches[0].slice(name.length + 3);
      assert(value, `Empty --${name}`);
      return [name, value];
    }),
  );
  const bytes = readFileSync(options.plan);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    options["plan-sha256"],
    "Approved plan changed",
  );
  const plan: ReturnType<typeof buildBatchPlan> = JSON.parse(bytes.toString());
  const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
  assert.equal(plan.voice, voice);
  assert.equal(plan.outputFormat, synthesisFormat);
  assert.equal(plan.automaticRetries, 0);
  assert.equal(plan.requests, plan.documents.length);
  assert.deepEqual(
    plan.documents.map((d: { id: string }) => d.id),
    Object.keys(speech),
  );
  validateSource();
  const { buildSpeechDocument, synthesize } = createSpeechTools(sdk, {
    configureSpeechConfig,
    voice,
    commas: "document",
    fingerprint: true,
  });
  for (const doc of plan.documents) {
    const actual = buildSpeechDocument(
      speech[doc.id as keyof typeof speech],
      doc.id,
    );
    assert.equal(actual.ssml, doc.ssml, `${doc.id}: SSML changed`);
    assert.equal(actual.text, doc.text, `${doc.id}: text changed`);
    assert.equal(
      actual.fingerprint,
      doc.fingerprint,
      `${doc.id}: fingerprint changed`,
    );
    assert.equal(doc.audioFile, `${doc.id}.wav`);
  }
  const output = resolve(options.output);
  const fresh = {
    planSha256: options["plan-sha256"],
    voice,
    outputFormat: synthesisFormat,
    automaticRetries: 0,
    published: false,
    requests: plan.documents.map(
      (doc: { id: string; fingerprint: string }) => ({
        id: doc.id,
        fingerprint: doc.fingerprint,
        status: "not-started",
        startedAt: "",
        endedAt: "",
        diagnostic: "",
      }),
    ),
  };
  const continuing = args.includes("--continue-unstarted");
  const manifest: typeof fresh = continuing
    ? JSON.parse(readFileSync(join(output, "manifest.json"), "utf8"))
    : fresh;
  if (continuing) {
    assert.equal(
      readFileSync(join(output, "request-plan.json"), "utf8"),
      bytes.toString(),
      "Staged plan differs",
    );
    for (const field of [
      "planSha256",
      "voice",
      "outputFormat",
      "automaticRetries",
      "published",
    ] as const)
      assert.equal(manifest[field], fresh[field]);
    assert.deepEqual(
      manifest.requests.map(({ id, fingerprint }) => ({ id, fingerprint })),
      fresh.requests.map(({ id, fingerprint }) => ({ id, fingerprint })),
    );
    for (const record of manifest.requests) {
      assert(
        [
          "not-started",
          "synthesized-and-decoded",
          "request-failed-or-uncertain",
          "received-validation-failed",
        ].includes(record.status),
        `${record.id}: active or unknown status; stop without replay`,
      );
      if (record.status === "synthesized-and-decoded") {
        const saved = JSON.parse(
          readFileSync(join(output, `${record.id}.json`), "utf8"),
        );
        assert.equal(saved.fingerprint, record.fingerprint);
        assert.equal(
          saved.audioSha256,
          audioSha256(join(output, `${record.id}.wav`)),
        );
      }
    }
  } else
    assert(
      !existsSync(output),
      "Output already exists; inspect its request state",
    );
  const selected = plan.documents.filter(
    (doc: { id: string }) =>
      manifest.requests.find((record) => record.id === doc.id)!.status ===
      "not-started",
  );
  for (const doc of selected)
    for (const suffix of [".wav", ".json", ".words.json"])
      assert(
        !existsSync(join(output, doc.id + suffix)),
        `${doc.id}: unexpected existing result; stop without replay`,
      );
  if (args.includes("--dry-run")) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          concurrency,
          requests: selected.map((doc: { id: string }) => doc.id),
          skipped: manifest.requests.filter(
            (record) => record.status !== "not-started",
          ),
          serviceCalls: 0,
        },
        null,
        2,
      ),
    );
    return;
  }
  assert(
    process.env.SPEECH_KEY && process.env.SPEECH_ENDPOINT,
    "Azure credentials missing",
  );
  assert(new URL(process.env.SPEECH_ENDPOINT).protocol === "https:");
  assert(
    !process.env.SPEECH_VOICE || process.env.SPEECH_VOICE === voice,
    "Voice override differs",
  );
  if (!continuing) {
    mkdirSync(dirname(output), { recursive: true });
    mkdirSync(output);
    writeFileSync(join(output, "request-plan.json"), bytes, { flag: "wx" });
  }
  const lock = join(output, "synthesis.lock");
  writeFileSync(lock, `${process.pid}\n`, { flag: "wx" });
  try {
    if (continuing)
      assert.deepEqual(
        JSON.parse(readFileSync(join(output, "manifest.json"), "utf8")),
        manifest,
        "Request state changed before the exclusive lock; stop without replay",
      );
    const save = () =>
      writeFileSync(
        join(output, "manifest.json"),
        JSON.stringify(manifest, null, 2) + "\n",
      );
    save();
    const produce = async (doc: (typeof selected)[number]) => {
      const record = manifest.requests.find(
        (r: { id: string }) => r.id === doc.id,
      )!;
      record.status = "started";
      record.startedAt = new Date().toISOString();
      save();
      console.log(`${doc.id}: started`);
      let received = false;
      try {
        const path = join(output, doc.audioFile);
        const words = await synthesize(
          speech[doc.id as keyof typeof speech],
          path,
          { exclusive: true, requireWordBoundaries: false },
        );
        received = true;
        // Persist original events before any validation that could fail.
        writeFileSync(
          join(output, `${doc.id}.words.json`),
          JSON.stringify(words, null, 2) + "\n",
          { flag: "wx" },
        );
        verifyPcmSource(path);
        decodeAudio(path);
        const duration = measureAudio(path);
        assert(Number.isFinite(duration) && duration > 0);
        writeFileSync(
          join(output, `${doc.id}.json`),
          JSON.stringify(
            {
              audioFile: doc.audioFile,
              outputFormat: synthesisFormat,
              audioSha256: audioSha256(path),
              duration,
              words,
              speech: doc.text,
              voice,
              fingerprint: doc.fingerprint,
            },
            null,
            2,
          ) + "\n",
          { flag: "wx" },
        );
        record.status = "synthesized-and-decoded";
        record.endedAt = new Date().toISOString();
        save();
        console.log(
          `${doc.id}: saved ${duration.toFixed(3)}s; ${words.length} original word events`,
        );
      } catch (error) {
        record.status = received
          ? "received-validation-failed"
          : "request-failed-or-uncertain";
        record.endedAt = new Date().toISOString();
        record.diagnostic = failureDiagnostic(error);
        save();
        // Keep a redacted cause in the request ledger without replaying or
        // changing the unknown-result classification. Never print raw errors.
        throw Error(
          `${doc.id}: ${record.status}; stopped without retry; inspect ${output}`,
        );
      }
    };
    const window = acquireSynthesisWindow(process.env.SPEECH_ENDPOINT!);
    const active = new Set<Promise<void>>();
    let failure: unknown;
    try {
      for (const doc of selected) {
        while (
          !failure &&
          (active.size >= concurrency || window.delay(Date.now()) > 0)
        ) {
          await Promise.race([
            ...active,
            new Promise<void>((resolve) => setTimeout(resolve, 250)),
          ]);
        }
        if (failure) break;
        window.record(Date.now());
        const pending = produce(doc)
          .catch((error: unknown) => {
            failure ??= error;
          })
          .finally(() => active.delete(pending));
        active.add(pending);
      }
    } finally {
      await Promise.allSettled(active);
      window.release();
    }
    if (failure) throw failure;
    console.log(
      `Staged ${manifest.requests.filter((record) => record.status === "synthesized-and-decoded").length}/${manifest.requests.length} complete original WAV files: ${output}; not adopted or listened; unresolved requests are preserved`,
    );
  } finally {
    unlinkSync(lock);
  }
}
