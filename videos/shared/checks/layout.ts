import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Inspect DOM in an isolated headless Studio. No video/still export, installs,
// shared development server or font/spacing snapshot assertions.
export async function checkLayout({
  cwd,
  screenshotPages,
  reportAll = false,
  viewport,
  inspectPageErrors = true,
  browserExecutable,
  searchParams,
  screenshotDirectory,
}: {
  cwd: string;
  screenshotPages?: string[];
  reportAll?: boolean;
  viewport?: { width: number; height: number };
  inspectPageErrors?: boolean;
  browserExecutable?: string;
  searchParams?: Record<string, string>;
  screenshotDirectory?: string;
}) {
  const session = `layout-check-${process.pid}`;
  const pnpmArgs = ["--config.verify-deps-before-run=false", "exec"];
  const command = (args: string[], timeout = 60000) =>
    new Promise<string>((resolve, reject) => {
      const child = spawn("pnpm", [...pnpmArgs, ...args], {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      let error = "";
      child.stdout.on("data", (data: Buffer) => {
        output += data;
      });
      child.stderr.on("data", (data: Buffer) => {
        error += data;
      });
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Timed out: ${args[0]}`));
      }, timeout);
      child.on("error", (cause) => {
        clearTimeout(timer);
        reject(cause);
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(output);
        else
          reject(new Error(`${args[0]} failed (${code}): ${error || output}`));
      });
    });
  const cli = (...args: string[]) =>
    command(["playwright-cli", `-s=${session}`, "--raw", ...args]);

  // Fail before starting anything if the existing CLI is unavailable.
  await command(["playwright-cli", "--version"]);
  const allocator = createServer();
  await new Promise<void>((resolve) =>
    allocator.listen(0, "127.0.0.1", resolve),
  );
  const address = allocator.address();
  if (!address || typeof address === "string")
    throw new Error("Cannot allocate audit port");
  await new Promise<void>((resolve) => allocator.close(() => resolve()));
  const url = `http://localhost:${address.port}`;
  const checkUrl = new URL(`${url}/LayoutCheck`);
  for (const [key, value] of Object.entries(searchParams ?? {}))
    checkUrl.searchParams.set(key, value);
  const studio = spawn(
    "pnpm",
    [...pnpmArgs, "remotion", "studio", `--port=${address.port}`, "--no-open"],
    {
      cwd,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let studioLog = "";
  studio.stdout.on("data", (data: Buffer) => {
    studioLog += data;
  });
  studio.stderr.on("data", (data: Buffer) => {
    studioLog += data;
  });
  let studioError: Error | undefined;
  studio.on("error", (error) => {
    studioError = error;
  });
  try {
    const deadline = Date.now() + 60000;
    for (;;) {
      if (studioError) throw studioError;
      if (studio.exitCode !== null)
        throw new Error(`Studio exited: ${studioLog}`);
      if (Date.now() > deadline)
        throw new Error(`Studio did not become ready: ${studioLog}`);
      try {
        if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) break;
      } catch {
        /* wait for this server */
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (browserExecutable) {
      const directory = mkdtempSync(join(tmpdir(), "video-browser-"));
      const config = join(directory, "cli.config.json");
      writeFileSync(
        config,
        JSON.stringify({
          browser: {
            browserName: "chromium",
            launchOptions: {
              executablePath: browserExecutable,
              headless: true,
            },
          },
        }),
      );
      await cli("open", `--config=${config}`);
    } else {
      await cli("open", checkUrl.href, "--browser=chrome");
    }
    const output = await cli(
      "run-code",
      `async (page) => {
    const errors = [];
    if (${inspectPageErrors}) page.on('pageerror', error => errors.push(error.message));
    ${browserExecutable ? `await page.goto(${JSON.stringify(checkUrl.href)}, {waitUntil: 'domcontentloaded'});` : ""}
    ${viewport ? `await page.setViewportSize(${JSON.stringify(viewport)});` : ""}
    if (page.url() !== ${JSON.stringify(checkUrl.href)}) throw new Error('Wrong check page');
    try { await page.waitForFunction(() => {
      const result = document.querySelector('[data-layout-report]');
      return result && result.textContent !== 'pending';
    }, null, {timeout: 45000}); } catch (error) {
      const state = await page.evaluate(() => ({progress: document.querySelector('[data-layout-progress]')?.getAttribute('data-layout-progress'), pages: document.querySelectorAll('[data-layout-page]').length, body: document.body.innerText.slice(0, 1600)}));
      throw new Error(error.message + '; ' + JSON.stringify({state, errors}));
    }
    const report = await page.locator('[data-layout-report]').evaluate(node => JSON.parse(node.textContent));
    if (errors.length) throw new Error(errors.join('; '));
    return report;
  }`,
    );
    const report = JSON.parse(output) as {
      ok: boolean;
      results: { page: string; errors: string[] }[];
    };
    if (!report.results?.length) throw new Error("No pages were checked");
    for (const result of report.results.filter(
      (result) => reportAll || result.errors.length,
    )) {
      console.log(
        `${result.errors.length ? "FAIL" : "PASS"} ${result.page}${result.errors.length ? `: ${result.errors.join("; ")}` : ""}`,
      );
    }
    console.log(
      `Checked ${report.results.length} pages; ${report.ok ? "PASS" : "FAIL"}`,
    );
    if (!report.ok) process.exitCode = 1;
    if (screenshotPages && process.argv.includes("--screenshots")) {
      const directory =
        screenshotDirectory ?? mkdtempSync(join(tmpdir(), "shear-layout-"));
      const pages = screenshotPages;
      await cli(
        "run-code",
        `async (page) => {
      for (const id of ${JSON.stringify(pages)}) {
        await page.locator('[data-layout-page^="' + id + '-"]').last().screenshot({path: ${JSON.stringify(directory)} + '/' + id + '.png'});
      }
    }`,
      );
      console.log(`Browser screenshots: ${directory}`);
    }
    return report.results.length;
  } finally {
    try {
      await cli("close");
    } finally {
      if (studio.pid && studio.exitCode === null) {
        process.kill(-studio.pid, "SIGTERM");
      }
    }
  }
}
