import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { audio, fps, timelineFor } from "../src/timeline.ts";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import { narrationFile } from "../../../shared/speech/source.ts";
import { buildSpeechDocument, verifyAlignment } from "./azure-speech.ts";

// Local listening material only. Never synthesize, assess, render or approve.
const root = fileURLToPath(new URL("../", import.meta.url));
const speech = JSON.parse(
  readFileSync(join(root, "src/speech-text.json"), "utf8"),
);
const rows = timelineFor();
const counts: Record<string, number> = {};
const sections = rows.map((row, index) => {
  const recording = audio[row.id];
  const path = join(root, "public/narration", narrationFile(row.id, recording));
  const document = buildSpeechDocument(speech[row.id], row.id);
  assert.equal(
    audioSha256(path),
    recording.audioSha256,
    `${row.id}: stale WAV`,
  );
  assert.equal(document.text, recording.speech, `${row.id}: stale text`);
  assert.equal(
    document.fingerprint,
    recording.fingerprint,
    `${row.id}: stale SSML`,
  );
  verifyAlignment(recording, path);
  const response = recording.alignment?.response as {
    RecognitionStatus: string;
    NBest: {
      Words: {
        Word: string;
        Offset?: number | null;
        Duration?: number;
        PronunciationAssessment: { ErrorType: string };
      }[];
    }[];
  };
  assert.equal(
    response?.RecognitionStatus,
    "Success",
    `${row.id}: missing assessment`,
  );
  const words = response.NBest[0]?.Words;
  assert(words?.length, `${row.id}: missing assessment words`);
  const flags = words.filter(
    (word) => word.PronunciationAssessment.ErrorType !== "None",
  );
  for (const word of flags) {
    const kind = word.PronunciationAssessment.ErrorType;
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
  const decisions =
    recording.alignment?.reviewedRecognition?.map(
      (review) => `- 已有局部确认：${review.decision}`,
    ) ?? [];
  if (
    row.id === "V-heights" &&
    recording.audioSha256 ===
      "865a1e36bf155aa7982a596db875fcf45d0b41e9c53b326409c8236ab4fa1dee"
  ) {
    decisions.push(
      "- 已有局部确认：用户接受末句‘差’的读音，保留原 WAV；不代表其他字词已经试听。",
    );
  }
  return [
    `## ${index + 1}. ${row.id} · ${row.action}`,
    `时间线起点 ${(row.from / fps).toFixed(3)} 秒；原音频 ${recording.duration.toFixed(3)} 秒。`,
    `WAV SHA-256：\`${recording.audioSha256}\`；SSML 指纹：\`${recording.fingerprint}\`。`,
    ...decisions,
    "完整片段试听状态：待核验。已有局部确认继续有效，不要求重复确认对应疑点。",
    flags.length
      ? "自动标记（不等于实际错误；时间相对本段原 WAV）：\n\n" +
        flags
          .map(
            (word) =>
              `- ${word.PronunciationAssessment.ErrorType}：‘${word.Word}’；${typeof word.Offset === "number" && Number.isFinite(word.Offset) && word.Offset >= 0 && (word.Duration ?? 0) > 0 ? `约 ${(word.Offset / 10000000).toFixed(2)} 秒` : "原始评估未提供可靠位置"}。`,
          )
          .join("\n")
      : "本段无自动标记；这不等于实际试听通过。",
    `> ${recording.speech}`,
    `![${row.id} · 当前正式原速 WAV](<${path}>)`,
  ].join("\n\n");
});
const report =
  [
    "# 第二章下集 · 完整试听材料",
    "对应 #306 / #314 / #315。逐段对照原速 WAV 与全文；只需反馈片段 ID、位置和实际问题。本文不写回任何验收状态。绝对路径只存在本地生成材料中，不上传任务记录。",
    `覆盖 ${rows.length}/${rows.length} 段，当前时间线 ${rows.reduce((sum, row) => sum + row.durationInFrames, 0) / fps} 秒。`,
    `原始程序标记：${JSON.stringify(counts)}。用户已确认的识别差异仍保留原始标记；现行零漏读/插入导出门禁尚未满足。`,
    "以下均为当前正式 WAV，未改稿、未重新合成、未调速。源音频试听不替代含阅读停留的连续成片验收。",
    ...sections,
  ].join("\n\n") + "\n";
mkdirSync(join(root, "out"), { recursive: true });
const destination = join(
  mkdtempSync(join(root, "out/listening-306-")),
  "listening.md",
);
writeFileSync(destination, report);
console.log(JSON.stringify({ destination, covered: rows.length, counts }));
