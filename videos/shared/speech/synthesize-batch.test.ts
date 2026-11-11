import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

for (const concurrency of [undefined, 2, 4]) {
  test(`synthesis settles its ${concurrency ?? 1} in-flight requests and preserves unstarted work`, (t) => {
    const root = mkdtempSync(join(tmpdir(), "synthesis-concurrency-test-"));
    t.after(() => rmSync(root, { recursive: true }));
    const result = spawnSync(process.execPath, ["--input-type=module", "-"], {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR,
        SPEECH_KEY: "test-only",
        SPEECH_ENDPOINT: `https://${root.split("/").at(-1)}.invalid`,
        SPEECH_VOICE: "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural",
      },
      input: `
        import assert from 'node:assert/strict';
        import {writeFileSync, readFileSync, existsSync} from 'node:fs';
        import {createHash} from 'node:crypto';
        import {synthesizeBatch} from ${JSON.stringify(new URL("./synthesize-batch.ts", import.meta.url).href)};
        import {createSpeechTools} from ${JSON.stringify(new URL("./azure-speech.ts", import.meta.url).href)};
        import {synthesisFormat} from ${JSON.stringify(new URL("./source.ts", import.meta.url).href)};
        const root=${JSON.stringify(root)};
        let active=0, maximum=0, started=0, closed=0;
        const sdk={
          SpeechConfig:{fromEndpoint:()=>({setProperty(){}})},
          PropertyId:{SpeechServiceResponse_RequestWordBoundary:0},
          SpeechSynthesisOutputFormat:{Riff48Khz16BitMonoPcm:0},
          SpeechSynthesizer:class {
            speakSsmlAsync(ssml, resolve, reject){
              const index=started++; active++; maximum=Math.max(maximum,active);
              setTimeout(()=>{active--; reject(Error('provider rejection key='+process.env.SPEECH_KEY+' endpoint='+process.env.SPEECH_ENDPOINT+' path='+process.env.HOME+'/private.wav'));},index===0?1:40);
            }
            close(){closed++;assert(existsSync(root+'/batch/synthesis.lock'));}
          }
        };
        const voice='zh-CN-Xiaoxiao:DragonHDFlashLatestNeural';
        const speech=Object.fromEntries(Array.from({length:6},(_,i)=>['T'+i,'测试。']));
        const tools=createSpeechTools(sdk,{voice,commas:'document',fingerprint:true});
        const documents=Object.entries(speech).map(([id,text])=>({id,audioFile:id+'.wav',...tools.buildSpeechDocument(text)}));
        const bytes=JSON.stringify({voice,outputFormat:synthesisFormat,automaticRetries:0,requests:6,documents});
        writeFileSync(root+'/plan.json',bytes);
        const args=['node','test','--plan='+root+'/plan.json','--plan-sha256='+createHash('sha256').update(bytes).digest('hex'),'--output='+root+'/batch'];
        process.argv=[...args];
        const options=${JSON.stringify(concurrency === undefined ? {} : { concurrency })};
        await assert.rejects(synthesizeBatch(sdk,speech,()=>{},options),/request-failed-or-uncertain/);
        assert.equal(active,0);assert.equal(started,${concurrency ?? 1});
        assert.equal(maximum,${concurrency ?? 1});assert.equal(closed,started);
        assert(!existsSync(root+'/batch/synthesis.lock'));
        const before=readFileSync(root+'/batch/manifest.json','utf8');
        process.argv=[...args,'--continue-unstarted','--dry-run','--concurrency=2'];
        await synthesizeBatch(sdk,speech,()=>{},options);
        assert.equal(readFileSync(root+'/batch/manifest.json','utf8'),before);
        assert.equal(started,${concurrency ?? 1});
        process.argv=[...args,'--dry-run','--concurrency=0'];
        await assert.rejects(synthesizeBatch(sdk,speech,()=>{},options),/positive safe integer/);
      `,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const manifest = JSON.parse(
      readFileSync(join(root, "batch/manifest.json"), "utf8"),
    );
    assert.deepEqual(
      manifest.requests.map((r: { status: string }) => r.status),
      Array.from({ length: 6 }, (_, i) =>
        i < (concurrency ?? 1) ? "request-failed-or-uncertain" : "not-started",
      ),
    );
    assert(!existsSync(join(root, "batch/T0.wav")));
    const diagnostic = manifest.requests[0].diagnostic;
    assert.match(diagnostic, /provider rejection/);
    assert.doesNotMatch(diagnostic, /key=test-only|https:\/\//);
    assert(!diagnostic.includes(process.env.HOME));
    assert.equal(manifest.automaticRetries, 0);
  });
}
