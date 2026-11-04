import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import {
  speechComparisonText,
  validateWords,
  type AudioTiming,
  type WordBoundary,
} from "../../../shared/speech/timing.ts";
import { auditionRoot, buildAuditionPlan } from "./audition.ts";

// Offline only. Retain every raw flag; never infer a listening decision or timing.
const source = new URL("../out/synthesis-39f9c1e2fc2d/", import.meta.url);
const root = new URL("../out/assessment-39f9c1e2fc2d/", import.meta.url);
const run = new URL("run/", root);
const parse = (url: URL) => JSON.parse(readFileSync(url, "utf8"));
const sha256 = (url: URL) => audioSha256(fileURLToPath(url));
const synthesisPlanSha256 =
  "39f9c1e2fc2ddfbdf890b3c4f5f189c62694eabe590a8c505a0b65aa56641a45";
const assessmentPlanSha256 =
  "a74d5bde109d0e08cc24fce7c357960559fad4c54b277aeb480967f390fc5636";
const approved = new URL("approved-plan.json", source);
assert.equal(sha256(approved), synthesisPlanSha256);
assert(
  execFileSync(process.execPath, [
    fileURLToPath(new URL("./plan-narration.ts", import.meta.url)),
  ]).equals(readFileSync(approved)),
  "Current speech differs from the assessed source",
);
const plan = parse(new URL("plan.json", root));
assert.equal(sha256(new URL("plan.json", root)), assessmentPlanSha256);
assert.equal(plan.synthesisPlanSha256, synthesisPlanSha256);
assert.equal(plan.requestCount, 57);
const manifest = parse(new URL("manifest.json", run));
assert.equal(manifest.planSha256, assessmentPlanSha256);
assert.equal(manifest.entries.length, plan.requests.length);
const synthesis = parse(approved);
const audition = process.argv.includes("--audition=ipa-chinese-v1")
  ? buildAuditionPlan()
  : null;
const reportRoot = audition ? auditionRoot : root;
const auditionPlanSha256 = audition
  ? sha256(new URL("plan.json", auditionRoot))
  : null;
if (audition)
  assert.equal(
    readFileSync(new URL("plan.json", auditionRoot), "utf8"),
    JSON.stringify(audition, null, 2) + "\n",
  );
const auditionSynthesis = audition
  ? parse(new URL("synthesis/manifest.json", auditionRoot))
  : null;
const auditionAssessment = audition
  ? parse(new URL("assessment/manifest.json", auditionRoot))
  : null;
const baseline = audition
  ? parse(new URL("assessment-summary.json", root))
  : null;
if (audition) {
  assert.equal(auditionSynthesis.planSha256, auditionPlanSha256);
  assert.equal(auditionAssessment.planSha256, auditionPlanSha256);
  assert.equal(
    auditionAssessment.assessmentPlanSha256,
    sha256(new URL("assessment-plan.json", auditionRoot)),
  );
  assert.equal(auditionSynthesis.entries.length, audition.documents.length);
  assert.equal(auditionAssessment.entries.length, audition.documents.length);
}
const { assessmentWords, verifyAlignment } = createAlignmentTools(sdk, {
  allowReviewedPronunciation: false,
  deferPronunciationReview: true,
});
const counts = { Mispronunciation: 0, Omission: 0, Insertion: 0 };
type RawWord = {
  Word: string;
  Offset?: number | null;
  Duration?: number | null;
  PronunciationAssessment: { ErrorType: string };
};
const aligned: Record<string, AudioTiming> = {};
type Request = {
  id: string;
  audioFile: string;
  audioSha256: string;
  audioSeconds: number;
  referenceText: string;
  synthesisFingerprint: string;
};
const requests = (plan.requests as Request[]).map((original, index) => {
  const variant = audition?.documents.find(
    (document) => document.id === original.id,
  );
  const synthesisEntry = variant
    ? auditionSynthesis.entries.find(
        (entry: { id: string }) => entry.id === original.id,
      )
    : null;
  if (variant) {
    assert(synthesisEntry);
    assert.equal(synthesisEntry.state, "complete");
    assert.equal(synthesisEntry.fingerprint, variant.fingerprint);
  }
  return {
    ...original,
    ...(variant
      ? {
          audioSha256: synthesisEntry.audioSha256 as string,
          audioSeconds: synthesisEntry.duration as number,
          referenceText: variant.text,
          synthesisFingerprint: variant.fingerprint,
        }
      : {}),
    variant,
    sourceRoot: variant ? new URL("synthesis/", auditionRoot) : source,
    responseRoot: variant ? new URL("assessment/", auditionRoot) : run,
    entry: variant
      ? auditionAssessment.entries.find(
          (entry: { id: string }) => entry.id === original.id,
        )
      : manifest.entries[index],
    document: variant ?? synthesis.documents[index],
  };
});
const results = requests.map((request) => {
  const entry = request.entry;
  const document = request.document;
  assert.equal(entry.id, request.id);
  assert.equal(document.id, request.id);
  assert.equal(entry.state, "complete");
  assert.equal(document.text, request.referenceText);
  assert.equal(document.fingerprint, request.synthesisFingerprint);
  assert.equal(entry.fingerprint, request.synthesisFingerprint);
  assert.equal(entry.audioSha256, request.audioSha256);
  const audio = new URL(request.audioFile, request.sourceRoot);
  assert.equal(sha256(audio), request.audioSha256);
  assert.equal(
    sha256(new URL(request.audioFile, request.responseRoot)),
    request.audioSha256,
  );
  const responseFile = new URL(
    `${request.audioFile}.assessment.json`,
    request.responseRoot,
  );
  assert.equal(sha256(responseFile), entry.responseSha256);
  const response = parse(responseFile);
  assert.equal(response.RecognitionStatus, "Success");
  assert(response.NBest?.[0]?.Words?.length);
  const raw = response.NBest[0].Words as RawWord[];
  // Locate reference clauses in text only. These are never audio timestamps.
  let textCursor = 0;
  const referenceContexts = raw.map((word) => {
    if (word.PronunciationAssessment.ErrorType === "Insertion") return null;
    textCursor += request.referenceText
      .slice(textCursor)
      .match(/^[\p{P}\p{Z}\s]*/u)![0].length;
    if (
      !speechComparisonText(request.referenceText).startsWith(
        speechComparisonText(word.Word),
        textCursor,
      )
    )
      return null;
    const offset = textCursor;
    textCursor += word.Word.length;
    let from = offset,
      to = textCursor;
    while (from > 0 && !/[。！？]/.test(request.referenceText[from - 1]))
      from--;
    while (
      to < request.referenceText.length &&
      !/[。！？]/.test(request.referenceText[to - 1])
    )
      to++;
    return request.referenceText.slice(from, to);
  });
  const flags = raw.flatMap((word, wordIndex) => {
    const errorType = word.PronunciationAssessment.ErrorType;
    if (errorType === "None") return [];
    assert(
      Object.prototype.hasOwnProperty.call(counts, errorType),
      `Unknown flag ${errorType}`,
    );
    counts[errorType as keyof typeof counts]++;
    return [
      {
        wordIndex,
        text: word.Word,
        errorType,
        // Omission has no measured position. Never convert null into zero.
        startMs: typeof word.Offset === "number" ? word.Offset / 10000 : null,
        durationMs:
          typeof word.Duration === "number" ? word.Duration / 10000 : null,
        referenceContext:
          referenceContexts[wordIndex] ??
          referenceContexts[wordIndex + 1] ??
          null,
        recognitionContext: raw
          .slice(Math.max(0, wordIndex - 3), wordIndex + 4)
          .map((part) => part.Word)
          .join(" / "),
      },
    ];
  });
  const synthesisResponse: {
    words: WordBoundary[];
    audioSha256: string;
    fingerprint: string;
  } = parse(new URL(`${request.id}.response.json`, request.sourceRoot));
  assert.equal(synthesisResponse.audioSha256, request.audioSha256);
  assert.equal(synthesisResponse.fingerprint, request.synthesisFingerprint);
  const original: AudioTiming = {
    audioFile: request.audioFile,
    outputFormat: synthesis.outputFormat,
    audioSha256: request.audioSha256,
    duration: request.audioSeconds,
    words: synthesisResponse.words,
    speech: request.referenceText,
    voice: synthesis.voice,
    fingerprint: request.synthesisFingerprint,
  };
  let alignmentError: string | null = null;
  try {
    const timing: AudioTiming = {
      ...original,
      words: assessmentWords(original, response),
      alignment: {
        method: "azure-pronunciation-assessment",
        audioSha256: request.audioSha256,
        synthesisWords: original.words,
        response,
        pronunciationReview: "pending-listening",
      },
    };
    validateWords(timing);
    verifyAlignment(timing, fileURLToPath(audio));
    aligned[request.id] = timing;
  } catch (error) {
    alignmentError = error instanceof Error ? error.message : String(error);
  }
  return {
    id: request.id,
    audioFile: request.variant
      ? `synthesis/${request.audioFile}`
      : `../synthesis-39f9c1e2fc2d/${request.audioFile}`,
    variant: request.variant ? "ipa-chinese-v1" : "original",
    changes: request.variant?.changes ?? [],
    audioSha256: request.audioSha256,
    fingerprint: request.synthesisFingerprint,
    responseSha256: entry.responseSha256,
    referenceText: request.referenceText,
    aligned: alignmentError === null,
    alignmentError,
    flags,
    listening: "pending",
  };
});
const summary = {
  synthesisPlanSha256,
  assessmentPlanSha256,
  ...(audition
    ? {
        auditionPlanSha256,
        auditionAssessmentPlanSha256: auditionAssessment.assessmentPlanSha256,
        regenerated: audition.documents.length,
        reused: 57 - audition.documents.length,
        baselineCounts: baseline.counts,
        delta: Object.fromEntries(
          Object.entries(counts).map(([key, value]) => [
            key,
            value - baseline.counts[key],
          ]),
        ),
      }
    : {}),
  narrationSha256: synthesis.narrationSha256,
  total: results.length,
  assessed: results.length,
  missingOrFailed: 0,
  noAutomaticFlags: results.filter((result) => !result.flags.length).length,
  aligned: Object.keys(aligned).length,
  counts,
  serviceRequestsAdded: 0,
  published: false,
  listening: "pending",
  exportBlocked: counts.Omission > 0 || counts.Insertion > 0,
  results,
};
if (process.argv.includes("--write")) {
  // Derived reports may be regenerated; source responses remain untouched.
  for (const [name, value] of [
    ["assessment-summary", summary],
    ["aligned-timing", aligned],
  ] as const)
    writeFileSync(
      new URL(`${name}.json`, reportRoot),
      JSON.stringify(value, null, 2) + "\n",
    );
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  const cards = results
    .map(
      (result) => `<article id="${result.id}">
<h2>${result.id} · ${result.variant === "original" ? "原始配音" : "IPA／中文标注微调试音版"} · 待完整语境试听</h2>
<p class="text">${escape(result.referenceText)}</p>
<audio controls preload="none" src="${escape(result.audioFile)}"></audio>
<p>口播文字及语速未改。${result.variant === "original" ? "此段复用原始音频及检测。" : "此段仅微调字母 IPA 或中文读音标注，完整重新合成并评估；未正式采用。"}下列均为原始自动标记，尚未听辨确认。漏读条目没有可靠时间位置。</p>
${result.variant === "original" ? "" : `<details><summary>本段读音试验的具体改动</summary><pre>${escape(JSON.stringify(result.changes, null, 2))}</pre></details><p>对照原版（上方全文同样适用）：</p><audio controls preload="none" src="../synthesis-39f9c1e2fc2d/${result.id}.wav"></audio>`}
${result.flags.length ? `<table><thead><tr><th>类型</th><th>字词</th><th>实测位置</th><th>应读短句或附近应读短句</th><th>服务词序及邻近文字</th></tr></thead><tbody>${result.flags.map((flag) => `<tr><td>${escape(flag.errorType)}</td><td>${escape(flag.text)}</td><td>${flag.startMs === null ? "无实测位置" : `${(flag.startMs / 1000).toFixed(2)} 秒`}</td><td>${escape(flag.referenceContext ?? "见完整口播，未建立可靠局部对应")}</td><td>#${flag.wordIndex} ${escape(flag.recognitionContext)}</td></tr>`).join("")}</tbody></table>` : "<p>服务未标异常；仍待整句试听。</p>"}
<p>应读内容为上方完整口播；插入标记只表示服务识别出的疑似额外字词，不加入应读稿。</p>
${result.alignmentError ? `<p class="blocked">时间对齐被阻断：${escape(result.alignmentError)}</p>` : "<p>实测时间已离线核验，尚未采用到正式播放。</p>"}
<details><summary>版本绑定</summary><p>音频 SHA-256：${result.audioSha256}</p><p>请求指纹：${result.fingerprint}</p><p>评估响应 SHA-256：${result.responseSha256}</p></details>
</article>`,
    )
    .join("\n");
  writeFileSync(
    new URL("review.html", reportRoot),
    `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>上集配音与检测复核</title>
<style>body{font:17px/1.7 system-ui,sans-serif;max-width:1000px;margin:32px auto;padding:0 24px;color:#172c45;background:#f6f8fb}article{background:white;padding:24px;margin:24px 0;border:1px solid #cbd5e1;border-radius:12px;scroll-margin-top:12px}audio{width:100%}.text{white-space:pre-wrap;font-size:20px}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #cbd5e1;padding:8px;overflow-wrap:anywhere}details{overflow-wrap:anywhere}.blocked{color:#9a3412}nav{display:flex;flex-wrap:wrap;gap:12px}h1{font-size:28px}</style>
<h1>第四章上集：${audition ? "IPA／中文标注微调试音版" : "原始配音"}与检测复核</h1>
<p>57/57 段已检测；Mispronunciation=${counts.Mispronunciation}，Omission=${counts.Omission}，Insertion=${counts.Insertion}。这些是程序标记条数，不能视为已听辨确认的错误数量。</p>
${audition ? `<p>整集候选组合：${audition.documents.length} 段重新生成／评估，${57 - audition.documents.length} 段复用未变原音频及原评估。原始计数：Mispronunciation=${baseline.counts.Mispronunciation}，Omission=${baseline.counts.Omission}，Insertion=${baseline.counts.Insertion}。</p>` : ""}
<p>所有 WAV 完整、原速播放；试听候选尚未正式采用。所有片段尚待完整语境试听，当前不提供导出。完整响应及汇总保留在本目录。本页不写入任何验收结论。</p>
<p>有漏读或插入标记的片段：</p><nav>${results
      .filter((result) =>
        result.flags.some((flag) =>
          ["Omission", "Insertion"].includes(flag.errorType),
        ),
      )
      .map((result) => `<a href="#${result.id}">${result.id}</a>`)
      .join("")}</nav>
${cards}</html>\n`,
  );
}
console.log(
  JSON.stringify(
    {
      ...summary,
      results: undefined,
      alignmentFailures: results
        .filter((result) => result.alignmentError)
        .map((result) => ({ id: result.id, error: result.alignmentError })),
    },
    null,
    2,
  ),
);
if (summary.exportBlocked || summary.aligned !== summary.total)
  process.exitCode = 1;
