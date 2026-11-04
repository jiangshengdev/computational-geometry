import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import { applySentencePauses } from "../../../shared/speech/sentence-pauses.ts";
import {
  audioSha256,
  decodeAudio,
  measureAudio,
  verifyPcmSource,
} from "../../../shared/speech/audio.ts";
import type { AudioTiming } from "../../../shared/speech/timing.ts";
import speech from "../src/speech-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };
import { shots } from "../src/storyboard.ts";

export const auditionRoot = new URL(
  "../out/audition-ipa-chinese-v1/",
  import.meta.url,
);
const originalRoot = new URL("../out/synthesis-39f9c1e2fc2d/", import.meta.url);
const assessmentRoot = new URL(
  "../out/assessment-39f9c1e2fc2d/",
  import.meta.url,
);
const read = (url: URL) => JSON.parse(readFileSync(url, "utf8"));
const bytes = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const sha = (url: URL) => audioSha256(fileURLToPath(url));
type Part =
  | string
  | { text: string; pinyin: string }
  | { letter: string; ipa: string };
type Edit = {
  id: string;
  from: number;
  to: number;
  text: string;
  pinyin?: string;
  parts?: { text: string; pinyin: string }[];
  reason: string;
  evidence: unknown;
};
const ipa: Record<string, string> = {
  A: "eɪ",
  B: "biː",
  C: "siː",
  D: "diː",
  E: "iː",
  F: "ɛf",
  G: "dʒiː",
  H: "eɪtʃ",
  I: "aɪ",
  J: "dʒeɪ",
  K: "keɪ",
  L: "ɛl",
  M: "ɛm",
  N: "ɛn",
  O: "oʊ",
  P: "piː",
  Q: "kjuː",
  R: "ɑɹ",
  S: "ɛs",
  T: "tiː",
  U: "juː",
  V: "viː",
  W: "ˈdʌ.bəl.juː",
  X: "ɛks",
  Y: "waɪ",
  Z: "ziː",
};

// Keep unedited annotations whole; only split at explicitly reviewed edit edges.
function replaceParts(
  input: Part[],
  text: string,
  edits: { from: number; to: number; parts: Part[] }[],
) {
  let cursor = 0;
  const spans = input.map((part) => {
    const value =
      typeof part === "string"
        ? part
        : "text" in part
          ? part.text
          : part.letter;
    const span = { part, from: cursor, to: cursor + value.length };
    cursor = span.to;
    return span;
  });
  assert.equal(cursor, text.length);
  const output: Part[] = [];
  function unchanged(from: number, to: number) {
    for (const span of spans) {
      const start = Math.max(from, span.from),
        end = Math.min(to, span.to);
      if (end <= start) continue;
      if (start === span.from && end === span.to) output.push(span.part);
      else if (typeof span.part === "string")
        output.push(span.part.slice(start - span.from, end - span.from));
      else {
        assert("text" in span.part);
        output.push({
          text: span.part.text.slice(start - span.from, end - span.from),
          pinyin: span.part.pinyin
            .split(" ")
            .slice(start - span.from, end - span.from)
            .join(" "),
        });
      }
    }
  }
  cursor = 0;
  for (const edit of edits.sort((a, b) => a.from - b.from)) {
    assert(
      edit.from >= cursor && edit.to > edit.from && edit.to <= text.length,
    );
    unchanged(cursor, edit.from);
    output.push(...edit.parts);
    cursor = edit.to;
  }
  unchanged(cursor, text.length);
  return output;
}

export function buildAuditionPlan() {
  const originalBytes = readFileSync(
    new URL("approved-plan.json", originalRoot),
  );
  assert.equal(
    hash(originalBytes),
    "39f9c1e2fc2ddfbdf890b3c4f5f189c62694eabe590a8c505a0b65aa56641a45",
  );
  const original = JSON.parse(originalBytes.toString());
  const baseline = read(new URL("assessment-summary.json", assessmentRoot));
  const manifest = read(new URL("run/manifest.json", assessmentRoot));
  assert.equal(baseline.assessed, 57);
  assert.equal(baseline.missingOrFailed, 0);
  const chinese = read(
    new URL("./audition-chinese-edits.json", import.meta.url),
  ) as Edit[];
  const { buildSpeechDocument } = createSpeechTools(sdk, {
    voice: original.voice,
    commas: "document",
    fingerprint: true,
  });
  const documents = shots.flatMap((shot, index) => {
    const source = original.documents[index];
    const result = baseline.results[index];
    const record = manifest.entries[index];
    assert.equal(shot.id, source.id);
    assert.equal(result.id, source.id);
    assert.equal(record.id, source.id);
    assert.equal(result.fingerprint, source.fingerprint);
    assert.equal(record.audioSha256, result.audioSha256);
    assert.equal(
      sha(new URL(source.audioFile, originalRoot)),
      result.audioSha256,
    );
    const responseFile = new URL(
      `run/${source.audioFile}.assessment.json`,
      assessmentRoot,
    );
    assert.equal(sha(responseFile), result.responseSha256);
    const raw = read(responseFile).NBest[0].Words as {
      Word: string;
      PronunciationAssessment: { ErrorType: string };
    }[];
    assert.deepEqual(
      result.flags.map(
        (f: { wordIndex: number; text: string; errorType: string }) => [
          f.wordIndex,
          f.text,
          f.errorType,
        ],
      ),
      raw.flatMap((word, i) =>
        word.PronunciationAssessment.ErrorType === "None"
          ? []
          : [[i, word.Word, word.PronunciationAssessment.ErrorType]],
      ),
    );
    const input = speech[shot.id as keyof typeof speech];
    const sentencePlan = sentences[shot.id as keyof typeof sentences];
    const before = buildSpeechDocument(
      applySentencePauses(
        shot.captions.join(""),
        input,
        source.text,
        sentencePlan,
      ),
    );
    assert.equal(before.ssml, source.ssml);
    if (!result.flags.length) return [];
    const contexts = [
      ...new Set(
        result.flags.map(
          (flag: { referenceContext: string }) => flag.referenceContext,
        ),
      ),
    ] as string[];
    const letterEdits = contexts.flatMap((context) => {
      assert(context && source.text.includes(context));
      const start = source.text.indexOf(context);
      assert.equal(
        source.text.indexOf(context, start + 1),
        -1,
        `${shot.id}: ambiguous clause`,
      );
      return [...context.matchAll(/(?<![A-Za-z])[A-Za-z](?![A-Za-z])/g)].map(
        (match) => ({
          from: start + match.index,
          to: start + match.index + 1,
          parts: [
            { letter: match[0], ipa: ipa[match[0].toUpperCase()] },
          ] as Part[],
          reason: "IPA for letters in an automatically flagged clause",
          context,
        }),
      );
    });
    const chineseEdits = chinese
      .filter((edit) => edit.id === shot.id)
      .map((edit) => {
        assert.equal(source.text.slice(edit.from, edit.to), edit.text);
        assert.match(edit.text, /^[\u3400-\u9fff]+$/);
        const parts = edit.parts ?? [{ text: edit.text, pinyin: edit.pinyin! }];
        assert.equal(parts.map((part) => part.text).join(""), edit.text);
        assert(edit.reason && edit.evidence);
        return { ...edit, parts: parts as Part[] };
      });
    const changes = [...letterEdits, ...chineseEdits];
    assert(changes.length, `${shot.id}: flagged source has no audition change`);
    const changed = replaceParts(input, source.text, changes);
    const parts = applySentencePauses(
      shot.captions.join(""),
      changed,
      source.text,
      sentencePlan,
    );
    const document = buildSpeechDocument(parts, shot.id);
    assert.equal(document.text, source.text);
    assert.notEqual(document.ssml, source.ssml);
    assert(!/<prosody\b|\brate=/.test(document.ssml));
    return [
      {
        id: shot.id,
        audioFile: `${shot.id}.wav`,
        ...document,
        input: parts,
        baselineAudioSha256: result.audioSha256,
        baselineFingerprint: source.fingerprint,
        changes,
      },
    ];
  });
  assert.equal(
    documents.length,
    baseline.results.filter((r: { flags: unknown[] }) => r.flags.length).length,
  );
  assert(
    chinese.every((edit) =>
      documents.some((document) => document.id === edit.id),
    ),
  );
  return {
    version: "ipa-chinese-v1",
    scope: "independent full-clip auditions only; no formal adoption",
    synthesisPlanSha256: hash(originalBytes),
    baselineReportSha256: sha(
      new URL("assessment-summary.json", assessmentRoot),
    ),
    chineseEditsSha256: sha(
      new URL("./audition-chinese-edits.json", import.meta.url),
    ),
    narrationSha256: original.narrationSha256,
    voice: original.voice,
    outputFormat: original.outputFormat,
    synthesisRequests: documents.length,
    assessmentRequests: documents.length,
    concurrency: 1,
    automaticRetries: 0,
    documents,
  };
}

async function run() {
  const plan = buildAuditionPlan();
  const planBytes = bytes(plan),
    planSha256 = hash(planBytes);
  if (process.argv.includes("--write-plan")) {
    mkdirSync(auditionRoot);
    writeFileSync(new URL("plan.json", auditionRoot), planBytes, {
      flag: "wx",
    });
  }
  const synthesize = process.argv.includes(`--synthesize=${planSha256}`);
  const assess = process.argv.find((arg) => arg.startsWith("--assess="));
  if (
    !synthesize &&
    !assess &&
    !process.argv.includes("--write-assessment-plan")
  ) {
    console.log(
      JSON.stringify(
        { ...plan, documents: undefined, planSha256, serviceCalls: 0 },
        null,
        2,
      ),
    );
    return;
  }
  assert.equal(
    readFileSync(new URL("plan.json", auditionRoot), "utf8"),
    planBytes,
  );
  if (synthesize || assess) {
    const key = process.env.AZURE_SPEECH_KEY ?? process.env.SPEECH_KEY;
    const endpoint =
      process.env.AZURE_SPEECH_ENDPOINT ?? process.env.SPEECH_ENDPOINT;
    assert(key && endpoint, "Configured Speech credentials unavailable");
    const url = new URL(endpoint);
    assert(
      url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.search,
    );
    process.env.AZURE_SPEECH_KEY = key;
    process.env.AZURE_SPEECH_ENDPOINT = endpoint;
  }
  if (synthesize) {
    const root = new URL("synthesis/", auditionRoot);
    mkdirSync(root);
    const { synthesize: request } = createSpeechTools(sdk, {
      voice: plan.voice,
      commas: "document",
      fingerprint: true,
    });
    const entries: {
      id: string;
      fingerprint: string;
      state: string;
      audioSha256?: string;
      duration?: number;
      error?: string;
    }[] = plan.documents.map((d) => ({
      id: d.id,
      fingerprint: d.fingerprint,
      state: "planned",
    }));
    const save = () =>
      writeFileSync(
        new URL("manifest.json", root),
        bytes({ planSha256, entries }),
      );
    save();
    for (const [index, document] of plan.documents.entries()) {
      const entry = entries[index];
      entry.state = "started";
      save();
      console.log(
        `${entry.id}: audition synthesis ${index + 1}/${entries.length}`,
      );
      try {
        const path = fileURLToPath(new URL(document.audioFile, root));
        const words = await request(document.input, path, {
          requireWordBoundaries: false,
          exclusive: true,
        });
        entry.audioSha256 = audioSha256(path);
        writeFileSync(
          new URL(`${entry.id}.response.json`, root),
          bytes({
            words,
            audioSha256: entry.audioSha256,
            fingerprint: entry.fingerprint,
          }),
          { flag: "wx" },
        );
        verifyPcmSource(path);
        decodeAudio(path);
        entry.duration = measureAudio(path);
        assert(entry.duration > 0 && entry.duration < 30);
        entry.state = "complete";
        save();
      } catch (error) {
        writeFileSync(
          new URL(`${entry.id}.diagnostic.json`, root),
          bytes({
            stage: "synthesis-or-local-check",
            error: error instanceof Error ? error.message : String(error),
            automaticRetries: 0,
          }),
          { flag: "wx" },
        );
        entry.state = "uncertain";
        entry.error = "SYNTHESIS_OR_CHECK_FAILED_NO_RETRY";
        save();
        throw Error(`${entry.id}: stopped; no retry; originals retained`);
      }
      if (index + 1 < entries.length)
        await new Promise((done) => setTimeout(done, 3200));
    }
    return;
  }
  const synthesisRoot = new URL("synthesis/", auditionRoot);
  const synthesized = read(new URL("manifest.json", synthesisRoot));
  assert.equal(synthesized.planSha256, planSha256);
  const assessmentPlan = {
    planSha256,
    language: "zh-CN",
    gradingSystem: "HundredMark",
    granularity: "Word",
    enableMiscue: true,
    concurrency: 1,
    automaticRetries: 0,
    requests: plan.documents.map((d, i) => {
      const entry = synthesized.entries[i];
      assert.equal(entry.id, d.id);
      assert.equal(entry.state, "complete");
      assert.equal(entry.fingerprint, d.fingerprint);
      assert.equal(sha(new URL(d.audioFile, synthesisRoot)), entry.audioSha256);
      return {
        id: d.id,
        audioFile: d.audioFile,
        audioSha256: entry.audioSha256 as string,
        duration: entry.duration as number,
        fingerprint: d.fingerprint,
        referenceText: d.text,
      };
    }),
  };
  const assessmentBytes = bytes(assessmentPlan),
    assessmentPlanSha256 = hash(assessmentBytes);
  if (process.argv.includes("--write-assessment-plan")) {
    writeFileSync(
      new URL("assessment-plan.json", auditionRoot),
      assessmentBytes,
      { flag: "wx" },
    );
    console.log(
      JSON.stringify(
        {
          ...assessmentPlan,
          requests: undefined,
          requestCount: assessmentPlan.requests.length,
          assessmentPlanSha256,
          serviceCalls: 0,
        },
        null,
        2,
      ),
    );
    return;
  }
  assert.equal(assess, `--assess=${assessmentPlanSha256}`);
  assert.equal(
    readFileSync(new URL("assessment-plan.json", auditionRoot), "utf8"),
    assessmentBytes,
  );
  const root = new URL("assessment/", auditionRoot);
  mkdirSync(root);
  const entries: {
    id: string;
    fingerprint: string;
    audioSha256: string;
    state: string;
    responseSha256?: string;
    alignmentError?: string;
  }[] = assessmentPlan.requests.map((r) => ({
    id: r.id,
    fingerprint: r.fingerprint,
    audioSha256: r.audioSha256,
    state: "planned",
  }));
  const save = () =>
    writeFileSync(
      new URL("manifest.json", root),
      bytes({ planSha256, assessmentPlanSha256, entries }),
    );
  save();
  const { alignAudio } = createAlignmentTools(sdk, {
    allowReviewedPronunciation: false,
    deferPronunciationReview: true,
  });
  for (const [index, request] of assessmentPlan.requests.entries()) {
    const entry = entries[index];
    const path = new URL(request.audioFile, root);
    copyFileSync(
      new URL(request.audioFile, synthesisRoot),
      path,
      constants.COPYFILE_EXCL,
    );
    const raw = read(new URL(`${request.id}.response.json`, synthesisRoot));
    const audio: AudioTiming = {
      audioFile: request.audioFile,
      audioSha256: request.audioSha256,
      outputFormat: plan.outputFormat,
      duration: request.duration,
      voice: plan.voice,
      fingerprint: request.fingerprint,
      speech: request.referenceText,
      words: raw.words,
    };
    entry.state = "started";
    save();
    console.log(
      `${entry.id}: audition assessment ${index + 1}/${entries.length}`,
    );
    try {
      const timing = await alignAudio(audio, fileURLToPath(path));
      writeFileSync(new URL(`${request.id}.timing.json`, root), bytes(timing), {
        flag: "wx",
      });
    } catch (error) {
      entry.alignmentError =
        error instanceof Error ? error.message : "Alignment requires review";
    }
    const responseFile = new URL(`${request.audioFile}.assessment.json`, root);
    const response = existsSync(responseFile) ? read(responseFile) : null;
    if (
      response?.RecognitionStatus !== "Success" ||
      !response.NBest?.[0]?.Words?.length
    ) {
      entry.state = "uncertain";
      entry.alignmentError = "ASSESSMENT_FAILED_NO_RETRY";
      save();
      throw Error(`${entry.id}: stopped; no retry`);
    }
    assert.equal(sha(path), request.audioSha256);
    entry.responseSha256 = sha(responseFile);
    entry.state = "complete";
    save();
    const flags = response.NBest[0].Words.filter(
      (w: { PronunciationAssessment: { ErrorType: string } }) =>
        w.PronunciationAssessment.ErrorType !== "None",
    );
    console.log(
      `${entry.id}: response saved; ${flags.length} automatic flags; ${entry.alignmentError ? "timing pending review" : "timing validated"}`,
    );
    if (index + 1 < entries.length)
      await new Promise((done) => setTimeout(done, 3200));
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await run();
