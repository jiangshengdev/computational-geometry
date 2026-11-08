import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Regional endpoints can serve several resources. Grouping by host is deliberately
// conservative and also coordinates the two keys of the same resource locally.
export function acquireSynthesisWindow(endpoint: string) {
  const identity = createHash("sha256")
    .update(
      new URL(endpoint).hostname.replace(
        /\.tts\.speech\.microsoft\.com$/,
        ".api.cognitive.microsoft.com",
      ),
    )
    .digest("hex");
  const path = join(tmpdir(), `azure-synthesis-window-${identity}.json`);
  const lock = `${path}.lock`;
  writeFileSync(lock, `${process.pid}\n`, { flag: "wx", mode: 0o600 });
  try {
    let starts: number[] = existsSync(path)
      ? JSON.parse(readFileSync(path, "utf8"))
      : [];
    assert(
      Array.isArray(starts) &&
        starts.every((n) => Number.isFinite(n) && n >= 0),
      "Invalid synthesis request ledger",
    );
    return {
      delay(now: number) {
        starts = starts.filter((time) => time > now - 60_000);
        return starts.length < 20 ? 0 : Math.min(...starts) + 60_000 - now;
      },
      record(now: number) {
        starts.push(now);
        writeFileSync(path, JSON.stringify(starts) + "\n", { mode: 0o600 });
      },
      release() {
        unlinkSync(lock);
      },
    };
  } catch (error) {
    unlinkSync(lock);
    throw error;
  }
}
