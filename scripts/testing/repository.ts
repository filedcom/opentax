import { join, toFileUrl } from "@std/path";
import {
  assertGraphCoverage,
  assertHealthyModuleGraph,
  discoveredTestModules,
} from "./contracts.ts";

export async function repositoryFiles(root: string): Promise<string[]> {
  const result = await new Deno.Command("git", {
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
    path.endsWith(".ts") || path === "deno.json" || path === "deno.lock" ||
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
      await Deno.readFile(join(root, path)),
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

export async function graphPreflight(
  root: string,
  evidenceDirectory: string,
): Promise<number> {
  const paths = (await repositoryFiles(root)).filter((path) =>
    path.endsWith(".ts")
  );
  const entry = join(evidenceDirectory, "all-modules.ts");
  await Deno.writeTextFile(
    entry,
    paths.map((path) =>
      `import ${JSON.stringify(toFileUrl(join(root, path)).href)};`
    ).join("\n"),
    { createNew: true, mode: 0o600 },
  );
  const result = await new Deno.Command("deno", {
    args: [
      "info",
      "--frozen",
      "--json",
      "--config",
      join(root, "deno.json"),
      entry,
    ],
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).output();
  await Deno.writeFile(
    join(evidenceDirectory, "module-graph.json"),
    result.stdout,
    { createNew: true, mode: 0o600 },
  );
  await Deno.writeFile(
    join(evidenceDirectory, "module-graph.stderr.log"),
    result.stderr,
    { createNew: true, mode: 0o600 },
  );
  if (!result.success) {
    throw new Error(`Module graph command exited ${result.code}`);
  }
  const graph: unknown = JSON.parse(new TextDecoder().decode(result.stdout));
  const count = assertHealthyModuleGraph(graph);
  assertGraphCoverage(
    paths.map((path) => toFileUrl(join(root, path)).href),
    graph,
  );
  return count;
}

export async function testInventory(root: string): Promise<string[]> {
  return discoveredTestModules(await repositoryFiles(root));
}
