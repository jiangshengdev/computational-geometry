import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const instruction =
  "Run pnpm --config.verify-deps-before-run=false run video:preflight before exporting.";
const recordPath = (root: string) => join(root, "out/export-preflight.json");

// Hash inputs, not mtimes or generated outputs. Public audio is included in full.
function fingerprint(root: string, browser: string) {
  const hash = createHash("sha256");
  const add = (label: string, data: string | Buffer) => {
    hash.update(JSON.stringify(label));
    hash.update(createHash("sha256").update(data).digest());
  };
  const visit = (path: string, label: string, ancestors: string[] = []) => {
    if (!existsSync(path)) {
      add(label, "missing");
      return;
    }
    const real = realpathSync(path);
    if (ancestors.includes(real)) throw Error(`Cyclic input: ${label}`);
    if (statSync(path).isDirectory()) {
      add(label, "directory");
      for (const name of readdirSync(path).sort())
        visit(join(path, name), `${label}/${name}`, [...ancestors, real]);
    } else {
      add(label, readFileSync(path));
    }
  };
  add("schema", "1");
  add("root", realpathSync(root));
  add(
    "runtime",
    JSON.stringify([process.version, process.platform, process.arch]),
  );
  add("NODE_ENV", process.env.NODE_ENV ?? "");
  for (const name of ["src", "scripts", "public"])
    visit(join(root, name), name);
  // Include all project-root configuration files (also newly added config files).
  for (const name of readdirSync(root).sort()) {
    if (/\.(json|yaml|yml|ts|js|mjs|cjs)$/.test(name))
      visit(join(root, name), name);
  }
  visit(resolve(root, "../shared"), "shared");
  visit(join(root, "node_modules/.pnpm/lock.yaml"), "installed-lock");
  visit(join(root, "node_modules/.modules.yaml"), "installed-modules");
  add("browser-path", realpathSync(browser));
  visit(browser, "browser-binary");
  return hash.digest("hex");
}

type Record = {
  schema: number;
  attempt: string;
  status: "running" | "passed";
  fingerprint: string;
};

function readRecord(root: string): Record | undefined {
  try {
    return JSON.parse(readFileSync(recordPath(root), "utf8"));
  } catch {
    return undefined;
  }
}

function saveRecord(root: string, record: Record) {
  mkdirSync(join(root, "out"), { recursive: true });
  const temporary = `${recordPath(root)}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(record, null, 2) + "\n");
  renameSync(temporary, recordPath(root));
}

export function requirePreflight(root: string, browser: string) {
  const record = readRecord(root);
  if (record?.schema !== 1 || record.status !== "passed")
    throw Error(`No completed preflight record. ${instruction}`);
  if (record.fingerprint !== fingerprint(root, browser))
    throw Error(`Preflight inputs have changed. ${instruction}`);
  console.log("Preflight record matches current inputs; checks are not rerun.");
}

export function runPreflight(root: string, browser: string) {
  const attempt = randomUUID();
  // Invalidate prior success before starting, including on failure/interruption.
  saveRecord(root, { schema: 1, attempt, status: "running", fingerprint: "" });
  const before = fingerprint(root, browser);
  for (const [script, ...options] of [
    ["check-content.ts", "--decode"],
    ["check-layout.ts"],
  ]) {
    const checked = spawnSync(
      process.execPath,
      [`scripts/${script}`, ...options],
      {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, REMOTION_BROWSER_EXECUTABLE: browser },
      },
    );
    if (checked.error) throw checked.error;
    if (checked.status !== 0)
      throw Error(`${script} failed; preflight not saved`);
  }
  if (before !== fingerprint(root, browser))
    throw Error(`Inputs changed during preflight. ${instruction}`);
  if (readRecord(root)?.attempt !== attempt)
    throw Error("Another preflight replaced this attempt; result not saved");
  saveRecord(root, {
    schema: 1,
    attempt,
    status: "passed",
    fingerprint: before,
  });
  console.log("Preflight passed. PNG and audio exports can use this record.");
}
