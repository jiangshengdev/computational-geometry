import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import type * as SDK from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "./azure-speech.ts";

test("successful audio without word events can be retained exclusively without weakening defaults", () => {
  // Credentials and files are isolated from the test process; the SDK is fake.
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
        import assert from 'node:assert/strict';
        import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
        import { tmpdir } from 'node:os';
        import { join } from 'node:path';
        import { createSpeechTools } from ${JSON.stringify(new URL("./azure-speech.ts", import.meta.url).href)};
        let calls = 0;
        const sdk = {
          SpeechConfig: { fromEndpoint: () => ({ setProperty() {} }) },
          SpeechSynthesisOutputFormat: { Riff48Khz16BitMonoPcm: 1 },
          PropertyId: { SpeechServiceResponse_RequestWordBoundary: 1 },
          ResultReason: { SynthesizingAudioCompleted: 1 },
          SpeechSynthesizer: class {
            speakSsmlAsync(_ssml, success) {
              calls++;
              success({ reason: 1, audioData: Buffer.from('original WAV bytes') });
            }
            close() {}
          },
        };
        const { synthesize } = createSpeechTools(sdk, {
          voice: 'test', commas: 'document', fingerprint: true,
        });
        const root = mkdtempSync(join(tmpdir(), 'speech-source-'));
        const destination = join(root, 'sample.wav');
        try {
          await assert.rejects(synthesize('测试。', destination), /no word boundaries/);
          assert.equal(existsSync(destination), false);
          const options = { requireWordBoundaries: false, exclusive: true };
          assert.deepEqual(await synthesize('测试。', destination, options), []);
          assert.equal(readFileSync(destination, 'utf8'), 'original WAV bytes');
          await assert.rejects(synthesize('测试。', destination, options), { code: 'EEXIST' });
          assert.equal(readFileSync(destination, 'utf8'), 'original WAV bytes');
          assert.equal(calls, 3);
        } finally { rmSync(root, { recursive: true, force: true }); }
      `,
    ],
    {
      env: {
        ...process.env,
        AZURE_SPEECH_KEY: "fake-test-key",
        AZURE_SPEECH_ENDPOINT: "https://test.api.cognitive.microsoft.com",
        AZURE_SPEECH_VOICE: "test",
      },
      stdio: "pipe",
    },
  );
});

test("explicit letter IPA preserves reference text and leaves default spelling unchanged", () => {
  const { buildSpeechDocument } = createSpeechTools({} as typeof SDK, {
    voice: "test",
    commas: "document",
    fingerprint: true,
  });
  const original = buildSpeechDocument("在 p 对应位置。U");
  const adopted = buildSpeechDocument([
    "在 ",
    { letter: "p", ipa: "piː" },
    " 对应位置。U",
  ]);
  assert.equal(adopted.text, original.text);
  assert.equal(
    adopted.ssml,
    original.ssml.replace(
      '<lang xml:lang="en-US"><say-as interpret-as="characters">P</say-as></lang>',
      '<lang xml:lang="en-US"><phoneme alphabet="ipa" ph="piː">p</phoneme></lang>',
    ),
  );
  assert.notEqual(adopted.fingerprint, original.fingerprint);
  for (const invalid of [
    { letter: "pp", ipa: "piː" },
    { letter: "p", ipa: "" },
    { letter: "p", ipa: '"/><break/>' },
    { letter: "p", ipa: "piː", rate: 1 },
  ])
    assert.throws(() => buildSpeechDocument([invalid]));
});

test("explicit English words retain word pronunciation without changing letter spelling", () => {
  const { buildSpeechDocument } = createSpeechTools({} as typeof SDK, {
    voice: "test",
    commas: "document",
    fingerprint: true,
  });
  const original = buildSpeechDocument("检查 Q。A");
  const adopted = buildSpeechDocument(["检查 ", { englishWord: "cue" }, "。A"]);
  assert.equal(adopted.text, "检查 cue。A");
  assert.equal(
    adopted.ssml,
    original.ssml.replace(
      '<lang xml:lang="en-US"><say-as interpret-as="characters">Q</say-as></lang>',
      '<lang xml:lang="en-US">cue</lang>',
    ),
  );
  assert.notEqual(adopted.fingerprint, original.fingerprint);
  for (const englishWord of ["", "two words", "<break/>", 1])
    assert.throws(() => buildSpeechDocument([{ englishWord }]), /englishWord/);
});

test("local pauses preserve text and letter spelling while binding the SSML fingerprint", () => {
  const { buildSpeechDocument } = createSpeechTools({} as typeof SDK, {
    voice: "test",
    commas: "document",
    fingerprint: true,
  });
  const original = buildSpeechDocument("记作 S。它");
  const paused = buildSpeechDocument([
    "记作 ",
    { breakMs: 20 },
    "S",
    { breakMs: 20 },
    "。它",
  ]);
  assert.equal(paused.text, original.text);
  assert.notEqual(paused.fingerprint, original.fingerprint);
  assert.equal(
    paused.ssml,
    original.ssml.replace(
      '<lang xml:lang="en-US"><say-as interpret-as="characters">S</say-as></lang>',
      '<break time="20ms"/><lang xml:lang="en-US"><say-as interpret-as="characters">S</say-as></lang><break time="20ms"/>',
    ),
  );
  for (const breakMs of [-1, 0.5, 5001, NaN, "20", '20"/>'])
    assert.throws(() => buildSpeechDocument(["S", { breakMs }]), /breakMs/);
  assert.throws(
    () => buildSpeechDocument([{ breakMs: 20, text: "S" }]),
    /expected Han/,
  );
});
