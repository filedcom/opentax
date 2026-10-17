/** Local fast path: which tests and gates a change can reach. CI still runs everything. */
import { readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import * as sys from "../support/sys.ts";
import { repositoryFiles } from "./repository.ts";

/** Files every test depends on without importing them; a change here selects everything. */
const EVERYTHING = new Set([
  "package.json",
  "bun.lock",
  "bunfig.toml",
  "tsconfig.json",
  "scripts/testing/run.ts",
  "scripts/testing/contracts.ts",
  "scripts/testing/repository.ts",
  "scripts/testing/affected.ts",
]);

const NOT_RUNTIME = /\.(md|txt)$|^docs\/|^\.github\/|^\.claude\//;

export type Graph = ReadonlyMap<string, ReadonlySet<string>>;

/** Repository-relative imports of every TypeScript file, resolved the way Bun loads them. */
export function importGraph(root: string, files: readonly string[]): Graph {
  const transpiler = new Bun.Transpiler({ loader: "ts" });
  const graph = new Map<string, Set<string>>();
  for (const path of files.filter((file) => file.endsWith(".ts"))) {
    const file = join(root, path);
    const deps = new Set<string>();
    let imports: { path: string }[] = [];
    try {
      imports = transpiler.scanImports(
        readFileSync(file, "utf8").replace(/^#!.*/, ""),
      );
    } catch {
      // Unparseable modules fail the type check; the graph only narrows tests.
    }
    for (const entry of imports) {
      if (/^(node|bun):/.test(entry.path)) continue;
      try {
        const resolved = relative(
          root,
          Bun.resolveSync(entry.path, dirname(file)),
        );
        if (
          !resolved.startsWith("..") && !resolved.startsWith("node_modules/")
        ) {
          deps.add(resolved);
        }
      } catch {
        // Unresolved imports fail the module-graph preflight.
      }
    }
    graph.set(path, deps);
  }
  return graph;
}

/** Every file a module loads, itself included. */
export function closure(graph: Graph, start: string): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  for (let path = stack.pop(); path !== undefined; path = stack.pop()) {
    if (seen.has(path)) continue;
    seen.add(path);
    stack.push(...(graph.get(path) ?? []));
  }
  return seen;
}

/** TypeScript modules a changed file reaches: itself, or the modules naming a data file. */
export function changedModules(
  root: string,
  graph: Graph,
  changed: readonly string[],
  exists: (path: string) => boolean,
): Set<string> | "everything" {
  const seeds = new Set<string>();
  for (const path of changed) {
    if (EVERYTHING.has(path)) return "everything";
    if (NOT_RUNTIME.test(path)) continue;
    if (path.endsWith(".ts")) {
      // A deleted module breaks its importers, which the type check names.
      if (!exists(path)) return "everything";
      seeds.add(path);
      continue;
    }
    const name = basename(path);
    const readers = [...graph.keys()].filter((module) =>
      readFileSync(join(root, module), "utf8").includes(name)
    );
    // Data read through a computed path cannot be traced, so it selects everything.
    if (readers.length === 0) return "everything";
    for (const reader of readers) seeds.add(reader);
  }
  return seeds;
}

/** Tests whose import closure reaches a changed module. */
export function affectedTests(
  graph: Graph,
  tests: readonly string[],
  seeds: Set<string> | "everything",
): string[] {
  if (seeds === "everything") return [...tests];
  return tests.filter((test) =>
    [...closure(graph, test)].some((path) => seeds.has(path))
  );
}

async function git(root: string, ...args: string[]): Promise<string> {
  const out = await new sys.Command("git", {
    args,
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  })
    .output();
  if (!out.success) {
    throw new Error(
      `git ${args.join(" ")}: ${new TextDecoder().decode(out.stderr)}`,
    );
  }
  return new TextDecoder().decode(out.stdout);
}

/** Files changed since the merge base with `base`, including uncommitted and untracked work. */
export async function changedFiles(
  root: string,
  base: string,
): Promise<string[]> {
  const mergeBase = (await git(root, "merge-base", base, "HEAD")).trim();
  const lines = [
    await git(root, "diff", "--name-only", "-z", mergeBase),
    await git(root, "ls-files", "--others", "--exclude-standard", "-z"),
  ].join("\0");
  // A node_modules symlink in a worktree escapes the `node_modules/` ignore pattern.
  return [
    ...new Set(
      lines.split("\0").filter((path) => path && path !== "node_modules"),
    ),
  ]
    .sort();
}

/** Tests a change can affect, from the given candidates. */
export async function selectAffected(
  root: string,
  base: string,
  candidates: readonly string[],
): Promise<{ changed: string[]; tests: string[]; everything: boolean }> {
  const files = await repositoryFiles(root);
  const graph = importGraph(root, files);
  const changed = await changedFiles(root, base);
  const present = new Set(files);
  const seeds = changedModules(
    root,
    graph,
    changed,
    (path) => present.has(path),
  );
  return {
    changed,
    tests: affectedTests(graph, candidates, seeds),
    everything: seeds === "everything",
  };
}

/** Whether any changed file is in what the product CLI loads, so bench, MeF and CLI gates apply. */
export async function touchesRuntime(
  root: string,
  base: string,
): Promise<boolean> {
  const files = await repositoryFiles(root);
  const graph = importGraph(root, files);
  const present = new Set(files);
  const seeds = changedModules(
    root,
    graph,
    await changedFiles(root, base),
    (p) => present.has(p),
  );
  if (seeds === "everything") return true;
  const runtime = closure(graph, "cli/main.ts");
  return [...seeds].some((path) =>
    runtime.has(path) || path.startsWith("benchmark/")
  );
}
