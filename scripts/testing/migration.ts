import { z } from "zod";
import {
  assertPrerequisiteGuardPatch,
  prerequisiteGuardSchema,
} from "./migration-guards.ts";
import { dirname, fromFileUrl, join, normalize, toFileUrl } from "@std/path";
import {
  assertHealthyModuleGraph,
  assertTestInventory,
  discoveredTestModules,
} from "./contracts.ts";

const moveSchema = z.object({ old: z.string().min(1), new: z.string().min(1) });
const editSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  before: z.string(),
  after: z.string(),
  kind: z.enum(["import", "resource", "repository-path", "markdown-link"]),
});
export const migrationProofSchema = z.object({
  version: z.literal(1),
  moves: z.array(moveSchema),
  files: z.array(moveSchema.extend({
    beforeSource: z.string(),
    afterSource: z.string(),
    edits: z.array(editSchema),
  })),
  resources: z.array(z.object({
    oldFile: z.string(),
    newFile: z.string(),
    beforeLiteral: z.string(),
    afterLiteral: z.string(),
    beforeResolved: z.string(),
    afterResolved: z.string(),
    beforeTarget: z.string().optional(),
    afterTarget: z.string().optional(),
  })),
  testModules: z.object({
    before: z.array(z.string()),
    after: z.array(z.string()),
  }),
  inventory: z.object({
    before: z.array(z.string()),
    after: z.array(z.string()),
  })
    .optional(),
  additions: z.array(z.object({ path: z.string(), reason: z.string().min(1) }))
    .default([]),
  intentionalChanges: z.array(z.object({
    path: z.string(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    reason: z.string().min(1),
  })).default([]),
  originalManifest: z.record(z.string().regex(/^[a-f0-9]{64}$/)).optional(),
  prerequisiteGuards: z.array(prerequisiteGuardSchema).default([]),
});
export type MigrationProof = z.infer<typeof migrationProofSchema>;

const reviewedToolingPaths = new Set([
  "product_board.md",
  "docs/mef/ty2025/readiness/ty2025-readiness-execution-2026-10-07.md",
  "scripts/maintenance/parse-rules.ts",
  "benchmark/run_benchmark.ts",
  "benchmark/run_all.ts",
  "benchmark/run_case.ts",
  "benchmark/harness.ts",
  "benchmark/harness.test.ts",
  "scripts/testing/contracts.ts",
  "scripts/testing/contracts.test.ts",
  "scripts/testing/repository.ts",
  "scripts/testing/run.ts",
  "scripts/testing/permissions.ts",
  "scripts/testing/full-lock.ts",
  "scripts/testing/full-lock.test.ts",
  "scripts/testing/migration.ts",
  "scripts/testing/migration.test.ts",
]);

/** Reviewed functional tooling changes have an explicit exact-byte boundary. */
export async function assertMigrationActualSources(
  proofValue: unknown,
  actualSources: ReadonlyMap<string, string>,
): Promise<number> {
  const proof = migrationProofSchema.parse(proofValue);
  assertUnique(
    proof.intentionalChanges.map((change) => change.path),
    "intentional changes",
  );
  const intentional = new Map(
    proof.intentionalChanges.map((change) => [change.path, change]),
  );
  const mapping = new Map(proof.moves.map((move) => [move.old, move.new]));
  const originalPaths = new Set(
    Object.keys(proof.originalManifest ?? {}).map((path) =>
      mapping.get(path) ?? path
    ),
  );
  assertUnique(
    proof.prerequisiteGuards.map((guard) => guard.file),
    "prerequisite guard files",
  );
  const guards = new Map(
    proof.prerequisiteGuards.map((guard) => [guard.file, guard]),
  );
  for (const guard of proof.prerequisiteGuards) {
    assertPrerequisiteGuardPatch(guard);
    if (
      await sourceHash(guard.beforeSource) !== guard.beforeSha256 ||
      await sourceHash(guard.afterSource) !== guard.afterSha256
    ) {
      throw new Error(`Prerequisite guard source hash differs: ${guard.file}`);
    }
    const record = proof.files.find((file) => file.new === guard.file);
    if (record && guard.beforeSource !== record.afterSource) {
      throw new Error(
        `Guard baseline differs from migrated source: ${guard.file}`,
      );
    }
    if (!record && !originalPaths.has(guard.file)) {
      throw new Error(
        `Guard absent from original source baseline: ${guard.file}`,
      );
    }
    if (actualSources.get(guard.file) !== guard.afterSource) {
      throw new Error(
        `Actual prerequisite guard source differs: ${guard.file}`,
      );
    }
  }
  for (const change of proof.intentionalChanges) {
    if (!reviewedToolingPaths.has(change.path)) {
      throw new Error(
        `Intentional change outside reviewed tooling/documentation boundary: ${change.path}`,
      );
    }
    if (
      !proof.files.some((file) => file.new === change.path) &&
      !originalPaths.has(change.path)
    ) {
      throw new Error(
        `Intentional change absent from source proof: ${change.path}`,
      );
    }
  }
  if (proof.originalManifest) {
    if (Object.keys(proof.originalManifest).length === 0) {
      throw new Error("Empty original source manifest");
    }
    const records = new Map(proof.files.map((file) => [file.old, file]));
    for (
      const [oldPath, originalHash] of Object.entries(proof.originalManifest)
    ) {
      const path = mapping.get(oldPath) ?? oldPath;
      const actual = actualSources.get(path);
      if (actual === undefined) {
        throw new Error(`Original source missing: ${path}`);
      }
      const record = records.get(oldPath);
      if (record && await sourceHash(record.beforeSource) !== originalHash) {
        throw new Error(
          `Source proof does not match original manifest: ${oldPath}`,
        );
      }
      if (!record) {
        const guard = guards.get(path);
        if (guard && guard.beforeSha256 !== originalHash) {
          throw new Error(`Untouched guard baseline differs: ${path}`);
        }
        const expected = guard?.afterSha256 ?? intentional.get(path)?.sha256 ??
          originalHash;
        if (await sourceHash(actual) !== expected) {
          throw new Error(`Untouched original source changed: ${path}`);
        }
      }
    }
  }
  for (const file of proof.files) {
    const actual = actualSources.get(file.new);
    if (actual === undefined) {
      throw new Error(`Migrated source missing: ${file.new}`);
    }
    const change = intentional.get(file.new);
    if (!change) {
      if (actual !== (guards.get(file.new)?.afterSource ?? file.afterSource)) {
        throw new Error(
          `Actual migrated source differs from proof: ${file.new}`,
        );
      }
      continue;
    }
    const digest = await sourceHash(actual);
    if (digest !== change.sha256) {
      throw new Error(`Intentional source hash differs: ${file.new}`);
    }
  }
  return proof.intentionalChanges.length;
}

async function sourceHash(source: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(source),
  );
  return Array.from(
    new Uint8Array(hash),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function assertMigrationDiskSources(
  proofValue: unknown,
  root: string,
): Promise<number> {
  const proof = migrationProofSchema.parse(proofValue);
  const mapping = new Map(proof.moves.map((move) => [move.old, move.new]));
  const paths = [
    ...new Set([
      ...proof.files.map((file) => file.new),
      ...Object.keys(proof.originalManifest ?? {}).map((path) =>
        mapping.get(path) ?? path
      ),
    ]),
  ];
  const sources = await Promise.all(
    paths.map(async (path) =>
      [path, await Deno.readTextFile(join(root, path))] as const
    ),
  );
  return assertMigrationActualSources(proof, new Map(sources));
}

/** Dynamic module/JSON filenames are absent from Deno's static dependency graph. */
export function assertMigrationLiteralPaths(proofValue: unknown): number {
  const proof = migrationProofSchema.parse(proofValue);
  if (!proof.inventory) {
    throw new Error("Literal path coverage requires inventory");
  }
  const original = new Set(proof.inventory.before);
  const final = new Set(proof.inventory.after);
  const mapping = new Map(proof.moves.map((move) => [move.old, move.new]));
  let checked = 0;
  for (const file of proof.files.filter((file) => file.old.endsWith(".ts"))) {
    const literals = file.beforeSource.matchAll(
      /(["'`])([^\s"'`]*\.(?:[cm]?[jt]sx?|json|mjs))\1/g,
    );
    for (const match of literals) {
      const before = match[2];
      if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/)/.test(before)) continue;
      const beforeTarget = normalize(join(dirname(file.old), before));
      if (!original.has(beforeTarget)) continue;
      const literalStart = match.index + 1;
      const delta = file.edits.filter((edit) => edit.end <= literalStart)
        .reduce(
          (sum, edit) => sum + edit.after.length - (edit.end - edit.start),
          0,
        );
      const afterStart = literalStart + delta;
      const quote = match[1];
      const end = file.afterSource.indexOf(quote, afterStart);
      const after = file.afterSource.slice(afterStart, end);
      const expected = mapping.get(beforeTarget) ?? beforeTarget;
      const afterTarget = normalize(join(dirname(file.new), after));
      if (
        end < afterStart || afterTarget !== expected || !final.has(afterTarget)
      ) {
        throw new Error(
          `Dynamic or literal path target changed: ${file.old}: ${before}`,
        );
      }
      checked++;
    }
  }
  return checked;
}

/** Checks the literal URLs themselves, rather than trusting recorded resolutions. */
export function assertMigrationResourceResolution(
  proofValue: unknown,
  repositoryRoot: string,
): void {
  const proof = migrationProofSchema.parse(proofValue);
  for (const resource of proof.resources) {
    if (
      resource.beforeLiteral.endsWith("/") !==
        resource.afterLiteral.endsWith("/")
    ) {
      throw new Error(
        `Resource directory URL semantics changed: ${resource.oldFile}`,
      );
    }
    const before = new URL(
      resource.beforeLiteral,
      toFileUrl(join(repositoryRoot, resource.oldFile)),
    );
    const after = new URL(
      resource.afterLiteral,
      toFileUrl(join(repositoryRoot, resource.newFile)),
    );
    const beforeResolved = before.protocol === "file:"
      ? normalize(fromFileUrl(before)).replace(/\/$/, "")
      : before.href;
    const afterResolved = after.protocol === "file:"
      ? normalize(fromFileUrl(after)).replace(/\/$/, "")
      : after.href;
    const beforeRecorded = before.protocol === "file:"
      ? normalize(resource.beforeResolved).replace(/\/$/, "")
      : resource.beforeResolved;
    const afterRecorded = after.protocol === "file:"
      ? normalize(resource.afterResolved).replace(/\/$/, "")
      : resource.afterResolved;
    if (
      beforeResolved !== beforeRecorded ||
      afterResolved !== afterRecorded
    ) {
      throw new Error(
        `Resource literal resolution mismatch: ${resource.oldFile}`,
      );
    }
  }
}

/** A healthy partial graph cannot prove that every migrated module resolves. */
export function assertMigrationGraphCoverage(
  proofValue: unknown,
  graphValue: unknown,
  repositoryRoot: string,
): void {
  const proof = migrationProofSchema.parse(proofValue);
  if (!proof.inventory) throw new Error("Graph coverage requires inventory");
  assertHealthyModuleGraph(graphValue);
  const graph = z.object({
    modules: z.array(z.object({ specifier: z.string() }).passthrough()),
  }).passthrough().parse(graphValue);
  const modules = new Set(graph.modules.map((module) => module.specifier));
  const missing = proof.inventory.after.filter((path) =>
    path.endsWith(".ts") &&
    !modules.has(toFileUrl(join(repositoryRoot, path)).href)
  );
  if (missing.length) {
    throw new Error(`Migration graph omits modules: ${missing.join(", ")}`);
  }
}

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`Duplicate ${label}`);
  }
}

/** Replays only documented path edits; all other source characters must match. */
export function assertMigrationProof(value: unknown, graph?: unknown) {
  const proof = migrationProofSchema.parse(value);
  assertUnique(proof.moves.map((move) => move.old), "original migration paths");
  assertUnique(
    proof.moves.map((move) => move.new),
    "destination migration paths",
  );
  assertUnique(proof.files.map((file) => file.old), "source proof paths");
  assertUnique(
    proof.files.map((file) => file.new),
    "source proof destinations",
  );
  assertUnique(proof.additions.map((file) => file.path), "added paths");
  const mapping = new Map(proof.moves.map((move) => [move.old, move.new]));
  const sources = new Map(proof.files.map((file) => [file.old, file]));
  for (const move of proof.moves) {
    if (sources.get(move.old)?.new !== move.new) {
      throw new Error(`Missing source proof for move ${move.old}`);
    }
  }
  for (const file of proof.files) {
    if ((mapping.get(file.old) ?? file.old) !== file.new) {
      throw new Error(`Undeclared move ${file.old}`);
    }
    const edits = [...file.edits].sort((a, b) => b.start - a.start);
    let source = file.beforeSource;
    let boundary = source.length;
    for (const edit of edits) {
      const isPath = (literal: string) =>
        !/[\r\n]/.test(literal) &&
        /(?:\/|\.[A-Za-z][A-Za-z0-9]*(?:["'`?#]|$)|^#|^(?:node|npm|jsr):)/
          .test(literal);
      if (!isPath(edit.before) || !isPath(edit.after)) {
        throw new Error(`Non-path edit in migration proof: ${file.old}`);
      }
      if (edit.end < edit.start || edit.end > boundary) {
        throw new Error(`Invalid or overlapping edits in ${file.old}`);
      }
      if (source.slice(edit.start, edit.end) !== edit.before) {
        throw new Error(`Original path edit does not match ${file.old}`);
      }
      source = source.slice(0, edit.start) + edit.after +
        source.slice(edit.end);
      boundary = edit.start;
    }
    if (source !== file.afterSource) {
      throw new Error(
        `Source changed outside documented path edits: ${file.old}`,
      );
    }
  }
  for (const resource of proof.resources) {
    if (
      (mapping.get(resource.oldFile) ?? resource.oldFile) !== resource.newFile
    ) {
      throw new Error(`Undeclared resource owner move ${resource.oldFile}`);
    }
    if (
      resource.beforeTarget !== undefined || resource.afterTarget !== undefined
    ) {
      if (
        resource.beforeTarget === undefined ||
        resource.afterTarget === undefined
      ) {
        throw new Error(
          `Incomplete resource target proof: ${resource.oldFile}`,
        );
      }
      const target = mapping.get(resource.beforeTarget) ??
        resource.beforeTarget;
      const beforeSuffix = `/${resource.beforeTarget}`;
      const afterSuffix = `/${resource.afterTarget}`;
      if (
        target !== resource.afterTarget ||
        !resource.beforeResolved.endsWith(beforeSuffix) ||
        !resource.afterResolved.endsWith(afterSuffix) ||
        resource.beforeResolved.slice(0, -beforeSuffix.length) !==
          resource.afterResolved.slice(0, -afterSuffix.length)
      ) {
        throw new Error(`Resource target changed: ${resource.oldFile}`);
      }
    } else if (resource.beforeResolved !== resource.afterResolved) {
      throw new Error(`Resource target changed: ${resource.oldFile}`);
    }
  }
  const added = new Set(proof.additions.map((file) => file.path));
  const expectedTests = proof.testModules.before.map((path) =>
    mapping.get(path) ?? path
  );
  const actualOriginalTests = proof.testModules.after.filter((path) =>
    !added.has(path)
  );
  assertTestInventory(expectedTests, actualOriginalTests);
  if (proof.inventory) {
    assertTestInventory(
      discoveredTestModules(proof.inventory.before),
      proof.testModules.before,
    );
    assertTestInventory(
      discoveredTestModules(proof.inventory.after),
      proof.testModules.after,
    );
    assertUnique(proof.inventory.before, "original inventory paths");
    assertUnique(proof.inventory.after, "destination inventory paths");
    const expected = proof.inventory.before.map((path) =>
      mapping.get(path) ?? path
    );
    assertUnique(expected, "mapped inventory destinations");
    const actual = proof.inventory.after.filter((path) => !added.has(path));
    if (
      JSON.stringify(expected.sort()) !== JSON.stringify([...actual].sort())
    ) {
      throw new Error("Repository migration inventory is not bijective");
    }
    for (const move of proof.moves) {
      if (!proof.inventory.before.includes(move.old)) {
        throw new Error(`Move absent from original inventory: ${move.old}`);
      }
    }
    for (const path of added) {
      if (
        !proof.inventory.after.includes(path) ||
        proof.inventory.before.includes(path)
      ) {
        throw new Error(`Invalid declared addition: ${path}`);
      }
    }
  }
  const graphModules = graph === undefined
    ? undefined
    : assertHealthyModuleGraph(graph);
  return {
    movedFiles: proof.moves.length,
    verifiedSources: proof.files.length,
    verifiedResources: proof.resources.length,
    retainedTestModules: expectedTests.length,
    graphModules,
  };
}

if (import.meta.main) {
  const [proofPath, graphPath] = Deno.args;
  if (!proofPath || !graphPath) {
    throw new Error("Usage: migration.ts PROOF.json MODULE_GRAPH.json");
  }
  const proof: unknown = JSON.parse(await Deno.readTextFile(proofPath));
  const graph: unknown = JSON.parse(await Deno.readTextFile(graphPath));
  if (!migrationProofSchema.parse(proof).inventory) {
    throw new Error(
      "CLI verification requires exhaustive before/after inventory",
    );
  }
  const root = await Deno.realPath(Deno.cwd());
  if (!migrationProofSchema.parse(proof).originalManifest) {
    throw new Error("CLI verification requires original source SHA manifest");
  }
  assertMigrationGraphCoverage(proof, graph, root);
  assertMigrationResourceResolution(proof, root);
  assertMigrationLiteralPaths(proof);
  const intentionallyChangedFiles = await assertMigrationDiskSources(
    proof,
    root,
  );
  console.log(
    JSON.stringify({
      ...assertMigrationProof(proof, graph),
      intentionallyChangedFiles,
      prerequisiteGuardFiles:
        migrationProofSchema.parse(proof).prerequisiteGuards.length,
      originalSourceHashesVerified:
        Object.keys(migrationProofSchema.parse(proof).originalManifest ?? {})
          .length,
      intentionallyChangedPaths: migrationProofSchema.parse(proof)
        .intentionalChanges.map((change) => change.path),
    }),
  );
}
