import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { narrationFile, synthesisFormat } from "./source.ts";
import { audioSha256, verifyPcmSource, decodeAudio } from "./audio.ts";

// A small PCM fixture, not synthesized narration or rendered timeline audio.
function wav() {
  const data = Buffer.alloc(44 + 9600);
  data.write("RIFF");
  data.writeUInt32LE(data.length - 8, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(48000, 24);
  data.writeUInt32LE(96000, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(9600, 40);
  return data;
}

test("concurrent synthesis waits for in-flight work and publishes no partial batch", () => {
  const root = mkdtempSync(join(tmpdir(), "pcm-batch-"));
  const staging = mkdtempSync(join(tmpdir(), "shear-speech-"));
  try {
    mkdirSync(join(root, "src"));
    writeFileSync(
      join(root, "src/speech-text.json"),
      JSON.stringify({ a: "甲。", b: "乙。", c: "丙。" }),
    );
    const runner = join(root, "run.mjs");
    writeFileSync(
      runner,
      `
      import assert from "node:assert/strict";
      import {writeFileSync} from "node:fs";
      import {runNarration} from ${JSON.stringify(new URL("./narration.ts", import.meta.url).href)};
      const started=[],finished=[];
      await assert.rejects(runNarration({
        root:${JSON.stringify(root)}, shots:[{id:"a",caption:"甲。"},{id:"b",caption:"乙。"},{id:"c",caption:"丙。"}],
        buildSpeechDocument:text=>({text,ssml:text,fingerprint:text}),
        synthesize:async(text,path)=>{
          started.push(text);
          if(text==="甲。")throw Error("request failed");
          await new Promise(resolve=>setTimeout(resolve,20));
          writeFileSync(path,Buffer.from(${JSON.stringify(wav().toString("base64"))},"base64"));
          finished.push(text);
          return [{text:"乙",textOffset:0,wordLength:1,startMs:0,durationMs:100}];
        },
        voice:"test",alignAudio:async a=>a,verifyAlignment:()=>{},
        requireTimingFile:false,validateClauses:true,concurrency:2
      }),/request failed/);
      assert.deepEqual(started,["甲。","乙。"]);
      assert.deepEqual(finished,["乙。"]);
    `,
    );
    execFileSync(process.execPath, [runner, `--resume=${staging}`], {
      stdio: "pipe",
    });
    assert.equal(existsSync(join(root, "src/audio-timing.json")), false);
    assert.equal(existsSync(join(root, "public/narration")), false);
    assert.equal(existsSync(join(staging, "b.json")), true);
  } finally {
    rmSync(root, { recursive: true });
    rmSync(staging, { recursive: true });
  }
});

test("asset selection uses timing, never a neighboring file", () => {
  assert.equal(narrationFile("x", {}), "x.mp3");
  assert.equal(narrationFile("x", { audioFile: "x.wav" }), "x.wav");
  assert.throws(() => narrationFile("x", { audioFile: "../x.wav" }));
});

test("PCM validation inspects bytes rather than extension", () => {
  const dir = mkdtempSync(join(tmpdir(), "pcm-check-"));
  try {
    const path = join(dir, "audio.wav");
    writeFileSync(path, wav());
    verifyPcmSource(path);
    decodeAudio(path);
    const wrong = wav();
    wrong.writeUInt32LE(24000, 24);
    writeFileSync(path, wrong);
    assert.throws(() => verifyPcmSource(path));
  } finally {
    rmSync(dir, { recursive: true });
  }
});

for (const mode of [
  "valid",
  "old-format",
  "changed-bytes",
  "changed-speech",
] as const) {
  test(`narration resume: ${mode}`, () => {
    const root = mkdtempSync(join(tmpdir(), "pcm-project-"));
    const staging = mkdtempSync(join(tmpdir(), "shear-speech-"));
    try {
      mkdirSync(join(root, "src"));
      mkdirSync(join(root, "scripts"));
      writeFileSync(
        join(root, "src/speech-text.json"),
        JSON.stringify({ x: "甲。" }),
      );
      writeFileSync(join(root, "scripts/captions.ts"), "");
      const path = join(staging, "x.wav");
      writeFileSync(path, wav());
      const words = [
        {
          text: "甲",
          startMs: 0,
          durationMs: 100,
          textOffset: 0,
          wordLength: 1,
        },
      ];
      writeFileSync(
        join(staging, "x.json"),
        JSON.stringify({
          fingerprint: mode === "changed-speech" ? "old" : "current",
          outputFormat: mode === "old-format" ? "mp3" : synthesisFormat,
          audioSha256: mode === "changed-bytes" ? "stale" : audioSha256(path),
          words,
        }),
      );
      const runner = join(root, "run.mjs");
      writeFileSync(
        runner,
        `
        import { runNarration } from ${JSON.stringify(new URL("./narration.ts", import.meta.url).href)};
        import { writeFileSync } from "node:fs";
        await runNarration({
          root: ${JSON.stringify(root)}, shots: [{id:"x",caption:"甲。"}],
          buildSpeechDocument: () => ({text:"甲。",ssml:"test",fingerprint:"current"}),
          synthesize: async (_, path) => { console.log("SYNTHESIZED"); writeFileSync(path, Buffer.from(${JSON.stringify(wav().toString("base64"))}, "base64")); return ${JSON.stringify(words)}; },
          voice:"test", alignAudio: async a => a, verifyAlignment: () => {},
          requireTimingFile:false, validateClauses:true
        });
      `,
      );
      const result = execFileSync(
        process.execPath,
        [runner, `--resume=${staging}`],
        { encoding: "utf8" },
      );
      assert.equal(result.includes("SYNTHESIZED"), mode !== "valid");
      const timing = JSON.parse(
        readFileSync(join(root, "src/audio-timing.json"), "utf8"),
      ).x;
      assert.equal(timing.audioFile, "x.wav");
      assert.equal(timing.outputFormat, synthesisFormat);
      assert.equal(
        timing.audioSha256,
        audioSha256(join(root, "public/narration/x.wav")),
      );
      verifyPcmSource(join(root, "public/narration/x.wav"));
    } finally {
      rmSync(root, { recursive: true });
      rmSync(staging, { recursive: true, force: true });
    }
  });
}
