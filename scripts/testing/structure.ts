/** Structure contract: where tax nodes live, and that every node is registered and reachable. */
import { dirname, fromFileUrl, join, toFileUrl } from "@std/path";
import { z } from "zod";
import { TaxNode } from "../../core/types/tax-node.ts";
import type { FormDefinition } from "../../core/types/form-definition.ts";
import { repositoryFiles } from "./repository.ts";

export const ROLES = ["inputs", "intermediate", "outputs"] as const;
export const INTERMEDIATE_KINDS = [
  "aggregation",
  "forms",
  "worksheets",
] as const;
export const SECTIONS = [
  "general",
  "income",
  "adjustments",
  "deductions",
  "credits",
  "taxes",
  "payments",
] as const;

export const BASELINE_PATH = "scripts/testing/structure-baseline.json";

const baselineEntrySchema = z.object({
  path: z.string().min(1),
  nodeType: z.string().min(1).optional(),
  reason: z.string().min(1),
  expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  approvedBy: z.string().min(1),
});
export const baselineSchema = z.array(baselineEntrySchema);
export type Baseline = z.infer<typeof baselineSchema>;
type BaselineEntry = Baseline[number];

export type Problem = {
  readonly kind:
    | "placement"
    | "registry-key"
    | "not-in-registry"
    | "unreachable"
    | "expired-baseline"
    | "stale-baseline";
  readonly path: string;
  readonly nodeType?: string;
  readonly message: string;
  readonly fix: string;
};

export type Placement =
  | { readonly ok: true }
  | { readonly ok: false; readonly expected: string };

const NODE_SOURCE = /\bextends\s+TaxNode\b/;
// The year's composite input node is wiring, like nodes/config, and stays with its year.
const YEAR_START = /^forms\/[^/]+\/\d{4}\/return-processing\/start\.ts$/;

function oneOf<T extends readonly string[]>(
  values: T,
  value: string | undefined,
): value is T[number] {
  return value !== undefined && (values as readonly string[]).includes(value);
}

function expectedPath(form: string): string {
  return `forms/${form}/nodes/<${ROLES.join("|")}>/[${
    INTERMEDIATE_KINDS.join("|")
  }/]<${SECTIONS.join("|")}>/<group>/<name>/<file>.ts`;
}

/** Rule (a): nodes are shared per form; a year owns only config and wiring. */
export function nodePlacement(path: string): Placement {
  if (YEAR_START.test(path)) return { ok: true };
  const [forms, form, nodes, role, ...rest] = path.split("/");
  const expected = expectedPath(form || "<form>");
  if (forms !== "forms" || !form || nodes !== "nodes" || !oneOf(ROLES, role)) {
    return { ok: false, expected };
  }
  const segments = role === "intermediate"
    ? oneOf(INTERMEDIATE_KINDS, rest[0]) ? rest.slice(1) : undefined
    : rest;
  if (!segments) return { ok: false, expected };
  const [section, group, name, file, ...extra] = segments;
  if (!oneOf(SECTIONS, section) || !group || !name || !file || extra.length) {
    return { ok: false, expected };
  }
  return { ok: true };
}

export function isNodeSource(text: string): boolean {
  return NODE_SOURCE.test(text);
}

/** Node class files under forms/, excluding tests and fixtures. */
export function nodeCandidates(paths: readonly string[]): string[] {
  return paths.filter((path) =>
    path.startsWith("forms/") && path.endsWith(".ts") &&
    !path.endsWith(".test.ts") && !path.endsWith(".fixture.ts")
  );
}

export async function nodeFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  for (const path of nodeCandidates(await repositoryFiles(root))) {
    if (isNodeSource(await Deno.readTextFile(join(root, path)))) {
      found.push(path);
    }
  }
  return found;
}

export function placementProblems(paths: readonly string[]): Problem[] {
  return paths.flatMap((path) => {
    const placement = nodePlacement(path);
    if (placement.ok) return [];
    return [{
      kind: "placement" as const,
      path,
      message: "Tax node outside the canonical node tree",
      fix: `Move it under ${placement.expected}`,
    }];
  });
}

export function exportedNodes(module: Record<string, unknown>): TaxNode[] {
  return Object.values(module).filter((value): value is TaxNode =>
    value instanceof TaxNode
  );
}

const registryPath = (definition: FormDefinition) =>
  `forms/${definition.formType}/${definition.taxYear}/registry.ts`;

/** The executor resolves registry[nodeType], so any other key hides the node. */
export function registryKeyProblems(
  definitions: readonly FormDefinition[],
): Problem[] {
  return definitions.flatMap((definition) =>
    Object.entries(definition.registry)
      .filter(([key, node]) => key !== node.nodeType)
      .map(([key, node]) => ({
        kind: "registry-key" as const,
        path: registryPath(definition),
        nodeType: key,
        message:
          `Registry key '${key}' differs from its node type '${node.nodeType}', so the executor cannot resolve it`,
        fix:
          `Register it as ${node.nodeType}: ${key} (the key must be the node type)`,
      }))
  );
}

export type Graph = {
  /** Node types the registries resolve, across every catalog year. */
  readonly registered: ReadonlySet<string>;
  /** Public input names the CLI accepts. */
  readonly inputs: ReadonlySet<string>;
  /** Node types some registered node routes to. */
  readonly targets: ReadonlySet<string>;
};

export function graphOf(definitions: readonly FormDefinition[]): Graph {
  const nodes = definitions.flatMap((definition) =>
    Object.values(definition.registry)
  );
  // The start node's routing is derived from inputNodes, so it cannot vouch for reachability.
  const routers = nodes.filter((node) => node.nodeType !== "start");
  return {
    registered: new Set(nodes.map((node) => node.nodeType)),
    inputs: new Set(
      definitions.flatMap((definition) =>
        definition.inputNodes.flatMap((entry) => [
          entry.node.nodeType,
          ...(entry.inputKey ? [entry.inputKey] : []),
        ])
      ),
    ),
    targets: new Set(routers.flatMap((node) => [...node.outputNodeTypes])),
  };
}

/** A node class no registry holds can never run. */
export function unregisteredNodeProblems(
  nodesByPath: ReadonlyMap<string, readonly TaxNode[]>,
  graph: Graph,
): Problem[] {
  return [...nodesByPath].flatMap(([path, nodes]) => {
    const form = path.split("/")[1];
    return nodes
      .filter((node) => !graph.registered.has(node.nodeType))
      .map((node) => ({
        kind: "not-in-registry" as const,
        path,
        nodeType: node.nodeType,
        message:
          `Node '${node.nodeType}' is not in any catalog year's registry`,
        fix:
          `Add ${node.nodeType} to forms/${form}/<year>/registry.ts, keyed by its node type`,
      }));
  });
}

/** A registered node that is neither a CLI input nor routed to is silently ignored. */
export function unreachableProblems(
  definitions: readonly FormDefinition[],
  graph: Graph,
): Problem[] {
  return definitions.flatMap((definition) =>
    Object.entries(definition.registry)
      .filter(([key, node]) =>
        key === node.nodeType && key !== "start" &&
        !graph.inputs.has(key) && !graph.targets.has(key)
      )
      .map(([key]) => ({
        kind: "unreachable" as const,
        path: registryPath(definition),
        nodeType: key,
        message:
          `Node '${key}' is registered but nothing routes to it and it is not a CLI input`,
        fix:
          `Add an inputNodes entry in forms/${definition.formType}/${definition.taxYear}/inputs.ts if users supply it, route to it from the node that feeds it, or delete it`,
      }))
  );
}

function covers(entry: BaselineEntry, problem: Problem): boolean {
  return entry.path === problem.path && entry.nodeType === problem.nodeType;
}

/** Existing problems are allowed with a reason and an expiry; new ones fail. */
export function applyBaseline(
  raw: readonly Problem[],
  baseline: Baseline,
  today: string,
): Problem[] {
  const open = raw.flatMap((problem) => {
    const entry = baseline.find((candidate) => covers(candidate, problem));
    if (!entry) return [problem];
    if (entry.expires < today) {
      return [{
        ...problem,
        kind: "expired-baseline" as const,
        message: `Baseline exception expired on ${entry.expires}`,
        fix: `${problem.fix}, or renew the entry in ${BASELINE_PATH}`,
      }];
    }
    return [];
  });
  const stale = baseline
    .filter((entry) => !raw.some((problem) => covers(entry, problem)))
    .map((entry) => ({
      kind: "stale-baseline" as const,
      path: entry.path,
      nodeType: entry.nodeType,
      message: "Baseline entry no longer matches a problem",
      fix: `Remove it from ${BASELINE_PATH}`,
    }));
  return [...open, ...stale];
}

async function importedNodes(
  root: string,
  paths: readonly string[],
): Promise<Map<string, readonly TaxNode[]>> {
  const entries: [string, readonly TaxNode[]][] = [];
  for (const path of paths) {
    const module: Record<string, unknown> = await import(
      toFileUrl(join(root, path)).href
    );
    entries.push([path, exportedNodes(module)]);
  }
  return new Map(entries);
}

export async function readBaseline(root: string): Promise<Baseline> {
  try {
    return baselineSchema.parse(
      JSON.parse(await Deno.readTextFile(join(root, BASELINE_PATH))),
    );
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return [];
    throw error;
  }
}

export type StructureReport = {
  readonly nodeFiles: number;
  readonly allowed: number;
  readonly problems: readonly Problem[];
};

export async function structureReport(
  root: string,
  definitions: readonly FormDefinition[],
  today = new Date().toISOString().slice(0, 10),
  baseline?: Baseline,
): Promise<StructureReport> {
  const paths = await nodeFiles(root);
  const allowed = baseline ?? await readBaseline(root);
  const canonical = paths.filter((path) => nodePlacement(path).ok);
  const graph = graphOf(definitions);
  const raw = [
    ...placementProblems(paths),
    ...registryKeyProblems(definitions),
    ...unregisteredNodeProblems(await importedNodes(root, canonical), graph),
    ...unreachableProblems(definitions, graph),
  ];
  return {
    nodeFiles: paths.length,
    allowed: allowed.length,
    problems: applyBaseline(raw, allowed, today),
  };
}

export function formatReport(report: StructureReport): string {
  const lines = report.problems.map((problem) =>
    `${problem.path}${
      problem.nodeType ? ` (${problem.nodeType})` : ""
    }\n  ${problem.message}\n  fix: ${problem.fix}`
  );
  const summary =
    `${report.nodeFiles} node files, ${report.allowed} baseline exceptions, ${report.problems.length} problems`;
  return [...lines, summary].join("\n");
}

if (import.meta.main) {
  const root = dirname(dirname(dirname(fromFileUrl(import.meta.url))));
  const { catalog } = await import("../../catalog.ts");
  const report = await structureReport(root, Object.values(catalog));
  console.log(
    Deno.args.includes("--json")
      ? JSON.stringify(report)
      : formatReport(report),
  );
  Deno.exit(report.problems.length === 0 ? 0 : 1);
}
