import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { audioSha256 } from "../../../shared/speech/audio.ts";

const root = fileURLToPath(
  new URL("../out/synthesis-6eb84c2bf3a6/", import.meta.url),
);
const approvedHash =
  "8235e721c5b8052047f41f001c1def86e2a9ace5db6e32a830e26a574dcb3c90";
const bytes = readFileSync(join(root, "assessment-plan.json"));
if (createHash("sha256").update(bytes).digest("hex") !== approvedHash)
  throw Error("Approved assessment plan changed");
type Request = {
  id: string;
  audioFile: string;
  audioSha256: string;
  referenceText: string;
  synthesisFingerprint: string;
  audioSeconds: number;
};
const plan = JSON.parse(bytes.toString()) as {
  requests: Request[];
  target: string;
  totalAudioSeconds: number;
};
if (
  plan.requests.length !== 50 ||
  plan.target !==
    "wss://eastasia.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
)
  throw Error("Assessment scope differs from approval");
for (const request of plan.requests)
  if (audioSha256(join(root, request.audioFile)) !== request.audioSha256)
    throw Error(`${request.id}: approved audio changed`);
if (!process.argv.includes(`--execute-approved-plan=${approvedHash}`))
  console.log(
    JSON.stringify({
      mode: "dry-run",
      requests: 50,
      totalAudioSeconds: plan.totalAudioSeconds,
      planSha256: approvedHash,
      serviceCalls: 0,
    }),
  );
else {
  const key = process.env.SPEECH_KEY;
  const endpoint = process.env.SPEECH_ENDPOINT;
  if (
    !key ||
    !endpoint ||
    new URL(endpoint).hostname !== "eastasia.api.cognitive.microsoft.com"
  )
    throw Error("Configured Speech credential/endpoint unavailable or changed");
  type Entry = {
    id: string;
    audioSha256: string;
    fingerprint: string;
    state: "planned" | "started" | "complete" | "failed" | "uncertain";
    responseSha256?: string;
    error?: string;
  };
  const manifestPath = join(root, "assessment-manifest.json");
  const manifest: { planSha256: string; entries: Entry[] } = existsSync(
    manifestPath,
  )
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : {
        planSha256: approvedHash,
        entries: plan.requests.map((r) => ({
          id: r.id,
          audioSha256: r.audioSha256,
          fingerprint: r.synthesisFingerprint,
          state: "planned",
        })),
      };
  if (
    manifest.planSha256 !== approvedHash ||
    manifest.entries.length !== 50 ||
    manifest.entries.some(
      (e, i) =>
        e.id !== plan.requests[i].id ||
        e.audioSha256 !== plan.requests[i].audioSha256 ||
        e.fingerprint !== plan.requests[i].synthesisFingerprint,
    )
  )
    throw Error("Assessment staging does not match approved plan");
  const save = () =>
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  save();
  let lastStart = 0;
  for (const [i, request] of plan.requests.entries()) {
    const entry = manifest.entries[i];
    const output = join(root, `${request.id}.assessment.json`);
    if (entry.state === "complete") {
      if (
        !existsSync(output) ||
        createHash("sha256").update(readFileSync(output)).digest("hex") !==
          entry.responseSha256
      )
        throw Error(
          `${entry.id}: saved analysis missing or changed; do not repeat request`,
        );
      console.log(`${entry.id}: reuse saved response; no request`);
      continue;
    }
    if (entry.state !== "planned" || existsSync(output))
      throw Error(
        `${entry.id}: prior attempt or uncertain result; no automatic retry`,
      );
    const wait = Math.max(0, lastStart + 3200 - Date.now());
    if (wait) await new Promise((done) => setTimeout(done, wait));
    const config = sdk.SpeechConfig.fromEndpoint(new URL(plan.target), key);
    const proxy = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
    if (proxy) {
      const p = new URL(proxy);
      config.setProxy(
        p.hostname,
        Number(p.port || 80),
        decodeURIComponent(p.username),
        decodeURIComponent(p.password),
      );
    }
    config.speechRecognitionLanguage = "zh-CN";
    config.outputFormat = sdk.OutputFormat.Detailed;
    config.requestWordLevelTimestamps();
    const input = sdk.AudioConfig.fromWavFileInput(
      readFileSync(join(root, request.audioFile)),
    );
    const recognizer = new sdk.SpeechRecognizer(config, input);
    new sdk.PronunciationAssessmentConfig(
      request.referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Word,
      true,
    ).applyTo(recognizer);
    entry.state = "started";
    save();
    lastStart = Date.now();
    console.log(`${entry.id}: analysis ${i + 1}/50 started`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await new Promise<sdk.SpeechRecognitionResult>(
        (success, failure) => {
          timer = setTimeout(
            () => failure(Error("ASSESSMENT_TIMEOUT_UNCERTAIN")),
            240000,
          );
          recognizer.recognizeOnceAsync(success, () =>
            failure(Error("ASSESSMENT_TRANSPORT_FAILURE_UNCERTAIN")),
          );
        },
      );
      const raw = result.properties.getProperty(
        sdk.PropertyId.SpeechServiceResponse_JsonResult,
      );
      if (raw) writeFileSync(output, raw + "\n", { flag: "wx" });
      const response = raw ? JSON.parse(raw) : null;
      if (
        result.reason !== sdk.ResultReason.RecognizedSpeech ||
        response?.RecognitionStatus !== "Success" ||
        !response?.NBest?.[0]?.Words?.length
      ) {
        const cancel = sdk.CancellationDetails.fromResult(result);
        entry.state = "failed";
        entry.error = `SERVICE_RESULT_${result.reason}_CODE_${cancel.ErrorCode}`;
        save();
        throw Error(entry.error);
      }
      entry.responseSha256 = createHash("sha256")
        .update(readFileSync(output))
        .digest("hex");
      entry.state = "complete";
      save();
      const words = response.NBest[0].Words as {
        PronunciationAssessment?: { ErrorType?: string };
      }[];
      console.log(
        `${entry.id}: response saved; ${words.length} words; ${words.filter((w) => w.PronunciationAssessment?.ErrorType !== "None").length} automatic flags (not listening decisions)`,
      );
    } catch (error) {
      if (entry.state === "started") {
        entry.state = "uncertain";
        entry.error =
          error instanceof Error &&
          /^(ASSESSMENT_TIMEOUT_UNCERTAIN|ASSESSMENT_TRANSPORT_FAILURE_UNCERTAIN)$/.test(
            error.message,
          )
            ? error.message
            : "LOCAL_RESPONSE_CHECK_FAILED_AFTER_REQUEST";
        save();
      }
      throw Error(
        `${entry.id}: stopped (${entry.error}); no retry; existing results retained`,
      );
    } finally {
      clearTimeout(timer);
      recognizer.close();
      input.close();
    }
  }
  console.log(
    "50 combined recognition/assessment responses saved; no synthesis or retries",
  );
}
