import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { verifiedBrowser } from "../../../shared/tools/browser.ts";
import { timelineFor, fps } from "../src/timeline.ts";

// Diagnostic only: exercise the production Studio, including detached media.
const cwd = fileURLToPath(new URL("../", import.meta.url));
const output = `${cwd}out/audio-playback-diagnostic`;
if (process.argv.includes("--source-peaks")) {
  const require = createRequire(import.meta.url);
  const { createWaveformPeakProcessor } = require(
    join(
      dirname(require.resolve("@remotion/timeline-utils")),
      "audio-waveform/waveform-peak-processor.js",
    ),
  );
  const wav = readFileSync(`${cwd}public/narration/V-conditions.wav`);
  let rate = 0;
  let pcm: Buffer | undefined;
  for (let offset = 12; offset + 8 <= wav.length; ) {
    const length = wav.readUInt32LE(offset + 4);
    const tag = wav.toString("ascii", offset, offset + 4);
    if (tag === "fmt ") {
      if (
        wav.readUInt16LE(offset + 8) !== 1 ||
        wav.readUInt16LE(offset + 10) !== 1 ||
        wav.readUInt16LE(offset + 22) !== 16
      )
        throw Error("Expected mono PCM16");
      rate = wav.readUInt32LE(offset + 12);
    }
    if (tag === "data") pcm = wav.subarray(offset + 8, offset + 8 + length);
    offset += 8 + length + (length % 2);
  }
  if (!pcm || !rate) throw Error("Missing PCM data");
  const samples = new Float32Array(pcm.length / 2);
  for (let index = 0; index < samples.length; index++)
    samples[index] = pcm.readInt16LE(index * 2) / 32768;
  const waveformRate = fps * 30;
  const samplesPerPeak = Math.floor(rate / waveformRate);
  const processor = createWaveformPeakProcessor({
    totalPeaks: Math.ceil((samples.length / rate) * waveformRate),
    samplesPerPeak,
    progressIntervalInMs: Infinity,
    now: () => 0,
    onProgress: () => {},
  });
  processor.processSampleChunk(samples, 1, rate);
  processor.finalize();
  const cuts = timelineFor()
    .find((row) => row.id === "V-conditions")!
    .stages.slice(1)
    .map((stage) => {
      const time = stage.frame / fps;
      const peakIndex = Math.floor(time * waveformRate);
      const actualSourceTime = (peakIndex * samplesPerPeak) / rate;
      const trueCutPeak = samples
        .slice(
          Math.round((time - 0.02) * rate),
          Math.round((time + 0.02) * rate),
        )
        .reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);
      return {
        frame: stage.frame,
        intendedSourceTime: time,
        waveformSourceTime: actualSourceTime,
        errorSeconds: actualSourceTime - time,
        displayedPeak: processor.peaks[peakIndex],
        trueCutPeak,
      };
    });
  mkdirSync(output, { recursive: true });
  const report = { rate, waveformRate, samplesPerPeak, cuts };
  writeFileSync(
    `${output}/waveform-source.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
  process.exit(
    cuts.some((cut) => cut.trueCutPeak === 0 && cut.displayedPeak > 0.001)
      ? 1
      : 0,
  );
}
const browser = verifiedBrowser(new URL("../package.json", import.meta.url));
const session = `audio-diagnostic-${process.pid}`;
const prefix = ["--config.verify-deps-before-run=false", "exec"];
async function command(args: string[]) {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn("pnpm", [...prefix, ...args], { cwd });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data;
    });
    child.stderr.on("data", (data) => {
      stderr += data;
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(Error("Diagnostic command exceeded 90 seconds"));
    }, 90000);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(Error(stderr || stdout));
    });
  });
}
const cli = (...args: string[]) =>
  command(["playwright-cli", `-s=${session}`, "--raw", ...args]);
await command(["playwright-cli", "--version"]);
mkdirSync(output, { recursive: true });
writeFileSync(
  `${output}/browser.json`,
  JSON.stringify({
    browser: {
      browserName: "chromium",
      launchOptions: { executablePath: browser, headless: true },
    },
  }),
);
const allocator = createServer();
await new Promise<void>((resolve) => allocator.listen(0, "127.0.0.1", resolve));
const address = allocator.address();
if (!address || typeof address === "string") throw Error("No diagnostic port");
await new Promise<void>((resolve) => allocator.close(() => resolve()));
const url = `http://localhost:${address.port}`;
const activityLimit = process.argv
  .find((arg) => arg.startsWith("--activity-limit="))
  ?.split("=")[1];
const studio = spawn(
  "pnpm",
  [
    ...prefix,
    "remotion",
    "studio",
    `--port=${address.port}`,
    "--no-open",
    ...(activityLimit === undefined
      ? []
      : [`--sequence-activity-limit=${activityLimit}`]),
  ],
  { cwd, detached: true },
);
let serverLog = "";
studio.stdout.on("data", (data) => {
  serverLog += data;
});
studio.stderr.on("data", (data) => {
  serverLog += data;
});
const stages = timelineFor().map((row) => ({
  id: row.id,
  start: row.from,
  end: row.from + row.speechFrames,
  sourceStart: 0,
}));
const start = Number(
  process.argv.find((arg) => arg.startsWith("--start="))?.split("=")[1] ?? 45,
);
const seconds = Number(
  process.argv.find((arg) => arg.startsWith("--seconds="))?.split("=")[1] ?? 8,
);
try {
  const deadline = Date.now() + 60000;
  for (;;) {
    if (studio.exitCode !== null || Date.now() > deadline)
      throw Error(serverLog);
    try {
      if ((await fetch(url)).ok) break;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  await cli("open", `--config=${output}/browser.json`);
  await cli(
    "run-code",
    `async page => {
    await page.addInitScript(() => {
      const media = new Set();
      const samples = [];
      const events = [];
      let active = false;
      const frame = () => Number([...document.querySelectorAll('button.__remotion_input_dragger')].find(n => /^\\d+$/.test(n.getAttribute('aria-label') || ''))?.getAttribute('aria-label') ?? -1);
      const state = el => ({src: el.currentSrc || el.src, time: el.currentTime, paused: el.paused, ended: el.ended, muted: el.muted, volume: el.volume, rate: el.playbackRate, connected: el.isConnected, ready: el.readyState, display: getComputedStyle(el).display});
      for (const method of ['play', 'pause']) {
        const original = HTMLMediaElement.prototype[method];
        HTMLMediaElement.prototype[method] = function(...args) {
          media.add(this);
          if (active) events.push({method, frame: frame(), at: performance.now(), ...state(this)});
          return original.apply(this, args);
        };
      }
      setInterval(() => {
        if (!active) return;
        document.querySelectorAll('audio,video').forEach(el => media.add(el));
        samples.push({frame: frame(), at: performance.now(), media: [...media].map(state)});
      }, 25);
      window.__audioDiagnostic = {samples, events, start: () => {samples.length = 0; events.length = 0; active = true;}, stop: () => {active = false;}};
    });
    await page.goto(${JSON.stringify(url + "/WhyNeighbors")});
    await page.getByRole('button', {name:'Play', exact:true}).waitFor({timeout:45000});
    return await page.locator('body').ariaSnapshot();
  }`,
  ).then((snapshot) => writeFileSync(`${output}/snapshot.txt`, snapshot));
  const windows = process.argv.includes("--all")
    ? stages.map((stage) => ({
        start: stage.end / fps - 0.5,
        seconds: 1.5,
        target: stage,
      }))
    : [{ start, seconds, target: null }];
  const fromIndex = Number(
    process.argv
      .find((arg) => arg.startsWith("--from-index="))
      ?.split("=")[1] ?? 0,
  );
  const count = Number(
    process.argv.find((arg) => arg.startsWith("--count="))?.split("=")[1] ??
      windows.length,
  );
  windows.splice(fromIndex + count);
  windows.splice(0, fromIndex);
  const summaries = [];
  if (process.argv.includes("--resume")) {
    for (let index = windows.length - 1; index >= 0; index--) {
      const path = `${output}/run-${windows[index].start}-${activityLimit ?? "default"}.json`;
      if (existsSync(path)) {
        const saved = JSON.parse(readFileSync(path, "utf8"));
        if (saved.advanced) {
          const { overlaps, outside } = saved;
          const summary = Object.fromEntries(
            Object.entries(saved).filter(
              ([key]) =>
                ![
                  "samples",
                  "events",
                  "stages",
                  "overlaps",
                  "outside",
                ].includes(key),
            ),
          );
          summaries.push({
            ...summary,
            overlaps: overlaps.length,
            outside: outside.length,
          });
          if (overlaps.length || outside.length) process.exitCode = 1;
          windows.splice(index, 1);
        }
      }
    }
  }
  for (let batchStart = 0; batchStart < windows.length; batchStart += 8) {
    const batch = windows.slice(batchStart, batchStart + 8);
    const result = await cli(
      "run-code",
      `async page => {
    const results = [];
    for (const probe of ${JSON.stringify(batch)}) {
    await page.keyboard.press('g');
    const input = page.locator('input.__remotion_input_dragger_input');
    await input.fill(String(Math.round(probe.start * ${fps})));
    await input.press('Enter');
    await page.waitForTimeout(300);
    const waveforms = await page.evaluate(() => {
      const result = [];
      for (const canvas of document.querySelectorAll('canvas')) {
        let fiber = canvas[Object.keys(canvas).find(key => key.startsWith('__reactFiber$'))];
        while (fiber) {
          const p = fiber.memoizedProps;
          if (p?.src && typeof p.startFrom === 'number' && typeof p.displayDurationInFrames === 'number') {
            const peaks = fiber.memoizedState?.memoizedState;
            result.push({src:p.src, startFrom:p.startFrom, durationInFrames:p.durationInFrames, displayOffsetInFrames:p.displayOffsetInFrames, displayDurationInFrames:p.displayDurationInFrames, playbackRate:p.playbackRate, peakCount:peaks?.length, peaksAtCuts:peaks instanceof Float32Array ? [434,944,1781].map(frame=>({frame,peak:peaks[frame*30]})) : null});
            break;
          }
          fiber = fiber.return;
        }
      }
      return result;
    });
    await page.evaluate(() => window.__audioDiagnostic.start());
    await page.getByRole('button', {name:'Play', exact:true}).evaluate(el => el.click());
    await page.waitForTimeout(probe.seconds * 1000);
    await page.getByRole('button', {name:'Pause', exact:true}).evaluate(el => el.click());
    await page.waitForTimeout(250);
    const report = await page.evaluate(() => {
      window.__audioDiagnostic.stop();
      return {samples:window.__audioDiagnostic.samples, events:window.__audioDiagnostic.events};
    });
    results.push({...report, waveforms});
    }
    return results;
  }`,
    );
    const reports = JSON.parse(result) as {
      samples: {
        frame: number;
        media: {
          src: string;
          time: number;
          paused: boolean;
          muted: boolean;
          volume: number;
          ended: boolean;
          ready: number;
        }[];
      }[];
    }[];
    for (const [index, report] of reports.entries()) {
      const { start, seconds, target } = batch[index];
      const playing = (m: (typeof report.samples)[number]["media"][number]) =>
        !m.paused && !m.ended && !m.muted && m.volume > 0 && m.ready >= 2;
      const overlaps = report.samples.filter(
        (s) => s.media.filter(playing).length > 1,
      );
      const outside = report.samples.filter(
        (s) =>
          !stages.some(
            (stage) => s.frame >= stage.start - 2 && s.frame < stage.end + 2,
          ) && s.media.some(playing),
      );
      const advanced = report.samples.some(
        (s) => s.frame >= (start + seconds * 0.7) * fps,
      );
      const observedPlayback = report.samples.some(
        (s) => s.media.some(playing) && (!target || s.frame < target.end),
      );
      const summary = {
        start,
        seconds,
        target,
        activityLimit: activityLimit ?? "default",
        samples: report.samples.length,
        firstFrame: report.samples[0]?.frame,
        lastFrame: report.samples[report.samples.length - 1]?.frame,
        advanced,
        observedPlayback,
        overlaps: overlaps.length,
        outside: outside.length,
      };
      writeFileSync(
        `${output}/run-${start}-${activityLimit ?? "default"}.json`,
        JSON.stringify(
          { ...summary, stages, ...report, overlaps, outside },
          null,
          2,
        ),
      );
      summaries.push(summary);
      console.log(JSON.stringify(summary));
      if (!advanced || !observedPlayback || overlaps.length || outside.length)
        process.exitCode = 1;
    }
    if (batchStart + 8 < windows.length)
      await cli(
        "run-code",
        `async page => {
      await page.reload();
      await page.getByRole('button', {name:'Play', exact:true}).waitFor({timeout:45000});
    }`,
      );
  }
  writeFileSync(
    `${output}/summary-${activityLimit ?? "default"}-${process.argv.includes("--all") ? "all" : start}.json`,
    JSON.stringify(summaries, null, 2),
  );
} catch (error) {
  writeFileSync(`${output}/failure-${Date.now()}.txt`, String(error));
  throw error;
} finally {
  writeFileSync(`${output}/studio.log`, serverLog);
  try {
    await cli("close");
  } finally {
    if (studio.pid && studio.exitCode === null)
      process.kill(-studio.pid, "SIGTERM");
  }
}
