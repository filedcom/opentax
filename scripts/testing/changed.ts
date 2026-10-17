/** Local fast path: run the gates a change can reach. CI runs every gate in full. */
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath as fromFileUrl } from "node:url";
import * as sys from "../support/sys.ts";
import { changedFiles, touchesRuntime } from "./affected.ts";
import { type BenchRun, cachedBench } from "./bench-cached.ts";

const root = dirname(dirname(dirname(fromFileUrl(import.meta.url))));

/** Gates for a change, cheapest first; runtime gates only when the CLI loads a changed file. */
export function plan(
  base: string,
  changed: readonly string[],
  runtime: boolean,
): string[][] {
  const gates = [
    ["check:structure"],
    ["check:oracle", "--base", base],
    ["test:unit", "--changed", base],
    ["test:forms", "--changed", base, "--typechecked"],
  ];
  if (changed.some((path) => path.startsWith("benchmark/"))) {
    gates.splice(1, 0, ["check:cases"]);
  }
  if (changed.some((path) => /^(cli|scripts\/testing\/sandbox)/.test(path))) {
    gates.push(["check:sandbox"]);
  }
  if (runtime) gates.push(["check:mef"], ["check:cli"]);
  return gates;
}

const BENCH = ["--form", "f1040", "--year", "2025", "--json"];

/** Cases a bench run did not pass; null when the run printed no summary. */
export function failingCases(
  run: Pick<BenchRun, "stdout">,
): Set<string> | null {
  const line = run.stdout.trim().split("\n").at(-1) ?? "";
  try {
    return new Set(JSON.parse(line).failing as string[]);
  } catch {
    return null;
  }
}

/** Cases that pass at the base but not on this change. */
export function regressions(base: Set<string>, head: Set<string>): string[] {
  return [...head].filter((name) => !base.has(name)).sort();
}

async function git(...args: string[]) {
  const out = await new sys.Command("git", {
    args,
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  })
    .output();
  if (!out.success) throw new Error(`git ${args.join(" ")} exited ${out.code}`);
  return new TextDecoder().decode(out.stdout).trim();
}

/** Bench on the merge base, from a temporary worktree; cached once per base commit. */
async function baseBench(base: string): Promise<BenchRun> {
  const sha = await git("merge-base", base, "HEAD");
  const dir = await fs.mkdtemp(join(tmpdir(), "opentax-bench-base-"));
  await git("worktree", "add", "--detach", dir, sha);
  try {
    await fs.symlink(join(root, "node_modules"), join(dir, "node_modules"));
    return await cachedBench(dir, BENCH, false);
  } finally {
    await git("worktree", "remove", "--force", dir);
  }
}

/** Bench gate for a change: no case that passes on the base may fail. */
async function benchGate(base: string): Promise<number> {
  const [head, before] = await Promise.all([
    cachedBench(root, BENCH, false),
    baseBench(base),
  ]);
  const now = failingCases(head), then = failingCases(before);
  if (!now || !then) {
    console.error(
      `bench printed no summary:\n${(now ? before : head).stderr.slice(-2000)}`,
    );
    return 1;
  }
  const lost = regressions(then, now);
  const fixed = [...then].filter((name) => !now.has(name));
  console.log(
    `bench: ${now.size} failing (base ${then.size})${
      fixed.length ? `, fixed ${fixed.join(", ")}` : ""
    }${head.replayed ? ", replayed" : ""}`,
  );
  for (const name of lost) {
    console.error(`bench regression: ${name} passes on ${base}`);
  }
  return lost.length ? 1 : 0;
}

async function main(): Promise<number> {
  const base = process.argv[2] ?? "origin/main";
  const changed = await changedFiles(root, base);
  const gates = plan(base, changed, await touchesRuntime(root, base));
  console.log(
    `${changed.length} file(s) changed since ${base}; running ${
      gates.map((g) => g[0]).join(", ")
    }`,
  );
  for (const gate of gates) {
    const started = performance.now();
    const { code } = await new sys.Command("bun", {
      args: ["run", ...gate],
      cwd: root,
      stdout: "inherit",
      stderr: "inherit",
    }).output();
    const seconds = ((performance.now() - started) / 1000).toFixed(0);
    console.log(
      `${code === 0 ? "ok  " : "FAIL"} ${gate.join(" ")} (${seconds}s)`,
    );
    if (code !== 0) return code;
  }
  return gates.some((gate) => gate[0] === "check:cli")
    ? await benchGate(base)
    : 0;
}

if (import.meta.main) process.exit(await main());
