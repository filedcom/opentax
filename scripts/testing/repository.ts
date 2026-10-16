import * as sys from "../support/sys.ts";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL as toFileUrl } from "node:url";
import {
  assertGraphCoverage,
  assertHealthyModuleGraph,
  discoveredTestModules,
} from "./contracts.ts";

export async function repositoryFiles(root: string): Promise<string[]> {
  const result = await new sys.Command("git", {
    args: ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!result.success) {
    throw new Error(
      `Repository inventory failed: ${new TextDecoder().decode(result.stderr)}`,
    );
  }
  return [
    ...new Set(
      new TextDecoder().decode(result.stdout).split("\0").filter(Boolean),
    ),
  ].sort();
}

export function verificationInputPaths(paths: string[]): string[] {
  return paths.filter((path) =>
    path.endsWith(".ts") ||
    ["package.json", "bun.lock", "bunfig.toml", "tsconfig.json"].includes(
      path,
    ) ||
    (path.endsWith(".json") &&
      [
        "forms/",
        "benchmark/",
        "core/",
        "cli/",
        ".state/field-dumps/",
        "scripts/testing/",
      ].some((
        prefix,
      ) => path.startsWith(prefix)))
  );
}

export async function runtimeSnapshot(
  root: string,
): Promise<Record<string, string>> {
  const paths = verificationInputPaths(await repositoryFiles(root));
  const entries = await Promise.all(paths.map(async (path) => {
    const hash = await crypto.subtle.digest(
      "SHA-256",
      await sys.readBytes(join(root, path)),
    );
    return [
      path,
      Array.from(
        new Uint8Array(hash),
        (byte) => byte.toString(16).padStart(2, "0"),
      ).join(""),
    ] as const;
  }));
  return Object.fromEntries(entries);
}

type GraphModule = {
  readonly specifier: string;
  readonly error?: string;
  readonly dependencies: { specifier: string; code: { error?: string } }[];
};

/** Every runtime import of every module, resolved the way Bun will load it. */
export function moduleGraph(root: string, paths: string[]): GraphModule[] {
  const transpiler = new Bun.Transpiler({ loader: "ts" });
  return paths.map((path) => {
    const file = join(root, path);
    const specifier = toFileUrl(file).href;
    let imports: { path: string }[];
    try {
      // The transpiler API rejects a leading #! line that `bun` itself skips.
      imports = transpiler.scanImports(
        readFileSync(file, "utf8").replace(/^#!.*/, ""),
      );
    } catch (error) {
      return {
        specifier,
        error: `${path}: ${(error as Error).message}`,
        dependencies: [],
      };
    }
    const dependencies = imports
      .filter((entry) => !/^(node|bun):/.test(entry.path))
      .map((entry) => {
        try {
          Bun.resolveSync(entry.path, dirname(file));
          return { specifier: entry.path, code: {} };
        } catch (error) {
          return {
            specifier: entry.path,
            code: { error: `${path}: ${(error as Error).message}` },
          };
        }
      });
    return { specifier, dependencies };
  });
}

/** Resolves every runtime import and type-checks every module with tsconfig.json. */
export async function graphPreflight(
  root: string,
  evidenceDirectory: string,
): Promise<number> {
  const paths = (await repositoryFiles(root)).filter((path) =>
    path.endsWith(".ts")
  );
  const graph = { modules: moduleGraph(root, paths) };
  await sys.writeText(
    join(evidenceDirectory, "module-graph.json"),
    JSON.stringify(graph, null, 2),
    { createNew: true, mode: 0o600 },
  );
  const count = assertHealthyModuleGraph(graph);
  assertGraphCoverage(
    paths.map((path) => toFileUrl(join(root, path)).href),
    graph,
  );
  const typecheck = await new sys.Command(process.execPath, {
    args: [
      join(root, "node_modules/typescript/bin/tsc"),
      "--project",
      join(root, "tsconfig.json"),
      "--pretty",
      "false",
    ],
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).output();
  await sys.writeBytes(
    join(evidenceDirectory, "typecheck.log"),
    new Uint8Array([...typecheck.stdout, ...typecheck.stderr]),
    { createNew: true, mode: 0o600 },
  );
  if (!typecheck.success) {
    const errors = new TextDecoder().decode(typecheck.stdout)
      .split("\n").filter((line) => line.includes("error TS"));
    throw new Error(
      `Type check failed with ${errors.length} error(s): ${
        errors.slice(0, 20).join("; ")
      }`,
    );
  }
  return count;
}

export async function testInventory(root: string): Promise<string[]> {
  return discoveredTestModules(await repositoryFiles(root));
}
