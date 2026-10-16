/**
 * The binary's sandbox, as a check. The runtime has no permission model, so
 * this walks every module `cli/main.ts` can load, dependencies included, and fails on
 * anything that could run a process, load native code, open a socket or
 * load code it cannot see. With fetch the only network path left,
 * `cli/network.ts` decides which hosts the binary reaches.
 *
 * Usage: bun scripts/testing/sandbox.ts [--json]
 */
import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const ENTRY = "cli/main.ts";

/** Built-in modules the binary must never load. */
export const FORBIDDEN_MODULES: readonly string[] = [
  "child_process",
  "cluster",
  "dgram",
  "dns",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "repl",
  "tls",
  "vm",
  "worker_threads",
  "bun:ffi",
  "bun:sqlite",
  "bun:jsc",
];

/** Globals that reach the same capabilities without an import. */
export const FORBIDDEN_CALLS: readonly RegExp[] = [
  /\bBun\.(spawn|spawnSync|\$|connect|listen|serve|udpSocket|dlopen|plugin|Worker)\b/,
  /\bnew\s+(WebSocket|Worker|SharedWorker)\b/,
  /\bprocess\.(binding|dlopen|_linkedBinding)\b/,
  /\bnew\s+Function\s*\(/,
  /\beval\s*\(/,
];

export type SandboxProblem = {
  readonly module: string;
  readonly problem: string;
};

/** The built-in a specifier names (`node:fs/promises` → `fs`), if any. */
function builtin(specifier: string): string | undefined {
  if (specifier.startsWith("bun:") || specifier === "bun") return specifier;
  const bare = specifier.replace(/^node:/, "").split("/")[0];
  return specifier.startsWith("node:") || builtinModules.includes(bare)
    ? bare
    : undefined;
}

function scanner(path: string): Bun.Transpiler {
  const loader = path.endsWith(".ts")
    ? "ts"
    : path.endsWith(".tsx")
    ? "tsx"
    : "js";
  return new Bun.Transpiler({ loader });
}

/** Every module reachable from the entry, and every rule it breaks. */
export function inspectSandbox(root = ROOT, entry = ENTRY) {
  const seen = new Set<string>();
  const problems: SandboxProblem[] = [];
  const pending = [join(root, entry)];
  while (pending.length > 0) {
    const file = pending.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const name = relative(root, file);
    if (/\.(pdf|json)$/.test(file)) continue; // embedded data, not code
    // The transpiler API rejects a leading #! line that `bun` itself skips.
    const source = readFileSync(file, "utf8").replace(/^#!.*/, "");
    // Dependencies ship minified comments too; only first-party code is held
    // to the call rules, every module to the import rules.
    if (!name.startsWith("node_modules/")) {
      const code = scanner(file).transformSync(source);
      for (const rule of FORBIDDEN_CALLS) {
        if (rule.test(code)) {
          problems.push({ module: name, problem: `uses ${rule.source}` });
        }
      }
      if (/\bimport\s*\(\s*[^"'`\s]/.test(code)) {
        problems.push({ module: name, problem: "has a non-literal import()" });
      }
    }
    for (const { path: specifier } of scanner(file).scanImports(source)) {
      const module = builtin(specifier);
      if (module !== undefined) {
        if (FORBIDDEN_MODULES.includes(module)) {
          problems.push({ module: name, problem: `imports ${specifier}` });
        }
        continue;
      }
      try {
        pending.push(Bun.resolveSync(specifier, dirname(file)));
      } catch (error) {
        problems.push({
          module: name,
          problem: `cannot resolve ${specifier}: ${(error as Error).message}`,
        });
      }
    }
  }
  return {
    modules: [...seen].map((file) => relative(root, file)).sort(),
    problems,
  };
}

if (import.meta.main) {
  const { modules, problems } = inspectSandbox();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ modules: modules.length, problems }, null, 2));
  } else {
    for (const { module, problem } of problems) {
      console.error(
        `${module}: ${problem}. Fix: keep subprocess, native, socket and eval ` +
          `capabilities out of the binary; network goes through fetch, ` +
          `which cli/network.ts restricts.`,
      );
    }
    console.log(
      `${modules.length} shipped modules, ${problems.length} problems`,
    );
  }
  process.exit(problems.length === 0 ? 0 : 1);
}
