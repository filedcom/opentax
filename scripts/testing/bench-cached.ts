/** `bench` that replays its last result when nothing the benchmark can read has changed. */
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath as fromFileUrl } from "node:url";
import * as sys from "../support/sys.ts";
import { closure, type Graph, importGraph } from "./affected.ts";
import { repositoryFiles } from "./repository.ts";

// Outside the checkout so worktrees of the same commit share results.
const CACHE = join(homedir(), ".cache/opentax-bench");

export type BenchRun = {
  code: number;
  stdout: string;
  stderr: string;
  replayed: boolean;
};

// The only commands the benchmark runs; the rest of the CLI is loaded but not executed.
const BENCH_COMMANDS = new Set([
  "cli/commands/return.ts",
  "cli/commands/form.ts",
]);

/**
 * Every file the benchmark's results can depend on: the commands it runs, the CLI entry,
 * runtime data and the cases. A module that fails to load elsewhere in the CLI is caught by
 * check:cli, which runs before the benchmark in verify:changed.
 */
export function benchInputs(
  files: readonly string[],
  graph: Graph,
  form: string,
  year: string,
): string[] {
  const entry = [...(graph.get("cli/main.ts") ?? [])].filter((path) =>
    !path.startsWith("cli/commands/") || BENCH_COMMANDS.has(path)
  );
  const loaded = new Set([
    "cli/main.ts",
    ...entry.flatMap((path) => [...closure(graph, path)]),
    ...closure(graph, "benchmark/run_benchmark.ts"),
  ]);
  const data = files.filter((path) =>
    !path.endsWith(".ts") && !path.endsWith(".md") &&
    /^(cli|core|forms)\//.test(path)
  );
  const cases = files.filter((path) =>
    path.startsWith(`benchmark/cases/${form}/${year}/`) ||
    path === "benchmark/cases/baseline.json"
  );
  const config = ["package.json", "bun.lock", "bunfig.toml", "tsconfig.json"]
    .filter((path) => files.includes(path));
  return [...new Set([...loaded, ...data, ...cases, ...config])].sort();
}

function flag(args: readonly string[], name: string, fallback: string): string {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
}

export async function cacheKey(
  root: string,
  args: readonly string[],
): Promise<string> {
  const files = await repositoryFiles(root);
  const inputs = benchInputs(
    files,
    importGraph(root, files),
    flag(args, "--form", "f1040"),
    flag(args, "--year", "2025"),
  );
  const hash = createHash("sha256");
  // Case baselines expire by date, so a result is reused only on the day it ran.
  hash.update(
    JSON.stringify([Bun.version, args, new Date().toISOString().slice(0, 10)]),
  );
  for (const path of inputs) {
    hash.update(`\0${path}\0`);
    hash.update(await fs.readFile(join(root, path)).catch(() => "missing"));
  }
  return hash.digest("hex");
}

async function tee(
  stream: ReadableStream<Uint8Array>,
  sink?: NodeJS.WriteStream,
): Promise<string> {
  let text = "";
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  for (let read = await reader.read(); !read.done; read = await reader.read()) {
    sink?.write(read.value);
    text += decoder.decode(read.value, { stream: true });
  }
  return text;
}

/** Runs the benchmark in `root`, or replays the stored run for identical inputs. */
export async function cachedBench(
  root: string,
  args: readonly string[],
  echo = true,
): Promise<BenchRun> {
  const key = await cacheKey(root, args);
  const file = join(CACHE, `${key}.json`);
  const hit = await fs.readFile(file, "utf8").then(
    (t) => JSON.parse(t),
    () => null,
  );
  if (hit) return { ...hit, replayed: true };
  const child = new sys.Command(process.execPath, {
    args: [join(root, "benchmark/run_benchmark.ts"), ...args],
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const [stdout, stderr] = await Promise.all([
    tee(child.stdout, echo ? process.stdout : undefined),
    tee(child.stderr, echo ? process.stderr : undefined),
  ]);
  const { code } = await child.status;
  // Inputs edited during the run make the result unattributable, so it is not kept.
  if (await cacheKey(root, args) === key) {
    await fs.mkdir(CACHE, { recursive: true, mode: 0o700 });
    await sys.writeText(file, JSON.stringify({ code, stdout, stderr }), {
      mode: 0o600,
    });
  }
  return { code, stdout, stderr, replayed: false };
}

async function main(args: string[]): Promise<number> {
  const root = dirname(dirname(dirname(fromFileUrl(import.meta.url))));
  const run = await cachedBench(root, args);
  if (run.replayed) {
    process.stdout.write(run.stdout);
    process.stderr.write(run.stderr);
    console.error(
      "bench: replayed the stored result; no benchmark input changed",
    );
  }
  return run.code;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
