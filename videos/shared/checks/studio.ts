import { spawn } from "node:child_process";
import { createServer } from "node:net";

export type LayoutStudio = Awaited<ReturnType<typeof startLayoutStudio>>;

// Each run owns a new Studio; never attach to the user's development server.
export async function startLayoutStudio(cwd: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const allocator = createServer();
    await new Promise<void>((resolve, reject) => {
      allocator.once("error", reject);
      allocator.listen(0, "0.0.0.0", resolve);
    });
    const address = allocator.address();
    if (!address || typeof address === "string")
      throw Error("Cannot allocate audit port");
    await new Promise<void>((resolve, reject) =>
      allocator.close((error) => (error ? reject(error) : resolve())),
    );
    const url = `http://127.0.0.1:${address.port}`;
    const child = spawn(
      "pnpm",
      [
        "--config.verify-deps-before-run=false",
        "exec",
        "remotion",
        "studio",
        `--port=${address.port}`,
        "--ipv4",
        "--force-new",
        "--no-open",
      ],
      { cwd, detached: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    let log = "";
    let launchError: Error | undefined;
    let closed = false;
    let portConflict = false;
    let reused = false;
    let ready = false;
    const exited = new Promise<void>((resolve) => {
      child.once("close", () => {
        closed = true;
        resolve();
      });
    });
    child.on("error", (error) => {
      launchError = error;
    });
    const record = (data: Buffer) => {
      log += data;
      portConflict =
        /Port \d+ (?:is busy|is already in use)|You specified port \d+.*not available/.test(
          log,
        );
      reused = log.includes("Already running at");
      ready =
        log.includes("Server ready") &&
        log.includes(`http://localhost:${address.port}`);
    };
    child.stdout.on("data", record);
    child.stderr.on("data", record);
    const assertRunning = () => {
      if (launchError) throw launchError;
      if (closed || child.exitCode !== null || child.signalCode !== null)
        throw Error(`Studio exited: ${log}`);
      if (reused) throw Error(`Refusing an existing Studio: ${log}`);
    };
    const close = async () => {
      if (!child.pid) return;
      const signal = (value: NodeJS.Signals) => {
        try {
          process.kill(-child.pid!, value);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
        }
      };
      signal("SIGTERM");
      if (closed) return;
      const timer = setTimeout(() => signal("SIGKILL"), 5000);
      try {
        await exited;
      } finally {
        clearTimeout(timer);
      }
    };
    try {
      const deadline = Date.now() + 60000;
      for (;;) {
        if (portConflict) throw Error(`Audit port collision: ${log}`);
        assertRunning();
        if (ready) return { url, assertRunning, close };
        if (Date.now() > deadline)
          throw Error(`Studio did not become ready: ${log}`);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } catch (error) {
      await close();
      if (!portConflict || attempt === 3 || reused) throw error;
      console.warn(
        `Audit port collision; allocating a new port (${attempt}/3)`,
      );
    }
  }
  throw Error("Cannot start isolated Studio");
}
