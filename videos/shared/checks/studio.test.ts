import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

test("isolated layout Studio startup and cleanup", async (t) => {
  type FakeChild = EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
    pid: number;
    exitCode: number | null;
    signalCode: string | null;
  };
  const children: FakeChild[] = [];
  const calls: string[][] = [];
  let scenarios: string[] = [];
  const killed: number[] = [];
  const childMock = mock.module("node:child_process", {
    namedExports: {
      spawn: (
        command: string,
        args: string[],
        options: { detached: boolean },
      ) => {
        assert.equal(command, "pnpm");
        assert.equal(options.detached, true);
        calls.push(args);
        const child = Object.assign(new EventEmitter(), {
          stdout: new PassThrough(),
          stderr: new PassThrough(),
          pid: 880000 + children.length,
          exitCode: null as number | null,
          signalCode: null as string | null,
        });
        children.push(child);
        const port = args.find((arg) => arg.startsWith("--port="))!.slice(7);
        const scenario = scenarios.shift() ?? "ready";
        queueMicrotask(() => {
          if (scenario === "collision") {
            child.stderr.write(`Port ${port} is busy, trying another.\n`);
          } else if (scenario === "existing") {
            child.stdout.write("Already running at http://localhost:3000\n");
          } else if (scenario === "error") {
            child.emit("error", Error("spawn failed"));
          } else {
            child.stdout.write(
              `Server ready\nLocal: http://localhost:${port}\n`,
            );
          }
        });
        return child;
      },
    },
  });
  const killMock = mock.method(process, "kill", (pid: number) => {
    killed.push(pid);
    const child = children.find((entry) => entry.pid === -pid)!;
    queueMicrotask(() => {
      child.signalCode = "SIGTERM";
      child.emit("close");
    });
    return true;
  });
  try {
    const { startLayoutStudio } = await import("./studio.ts");
    await t.test(
      "port collision retries with a dedicated instance",
      async () => {
        scenarios = ["collision", "ready"];
        const studio = await startLayoutStudio("/isolated-test");
        assert.match(studio.url, /^http:\/\/127\.0\.0\.1:\d+$/);
        assert.equal(calls.length, 2);
        assert.deepEqual(killed, [-children[0].pid]);
        for (const args of calls) {
          assert(args.includes("--force-new"));
          assert(args.includes("--ipv4"));
          assert(args.includes("--no-open"));
          assert(
            Number(args.find((arg) => arg.startsWith("--port="))!.slice(7)) >
              3100,
          );
        }
        studio.assertRunning();
        await studio.close();
        assert.throws(studio.assertRunning, /Studio exited/);
      },
    );
    await t.test(
      "existing Studio is rejected, never accepted as ready",
      async () => {
        scenarios = ["existing"];
        const count = calls.length;
        await assert.rejects(
          startLayoutStudio("/isolated-test"),
          /Refusing an existing Studio/,
        );
        assert.equal(calls.length, count + 1);
      },
    );
    await t.test("ordinary launch errors are not retried", async () => {
      scenarios = ["error"];
      const count = calls.length;
      await assert.rejects(startLayoutStudio("/isolated-test"), /spawn failed/);
      assert.equal(calls.length, count + 1);
    });
    await t.test(
      "persistent collisions stop after three attempts",
      async () => {
        scenarios = ["collision", "collision", "collision"];
        const count = calls.length;
        await assert.rejects(
          startLayoutStudio("/isolated-test"),
          /Audit port collision/,
        );
        assert.equal(calls.length, count + 3);
        assert.deepEqual(
          killed,
          children.map((child) => -child.pid),
        );
      },
    );
  } finally {
    killMock.mock.restore();
    childMock.restore();
  }
});
