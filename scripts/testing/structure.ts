import * as fs from "node:fs/promises";
import * as sys from "../support/sys.ts";
/** Structure contract: where tax nodes live, and that every node is registered and reachable. */
import { dirname, join } from "node:path";
import {
  fileURLToPath as fromFileUrl,
  pathToFileURL as toFileUrl,
} from "node:url";
import { z } from "zod";
import { TaxNode } from "../../core/types/tax-node.ts";
import type { FormDefinition } from "../../core/types/form-definition.ts";
import { repositoryFiles } from "./repository.ts";
import {
  formatYearReport,
  shrunkYearBaseline,
  YEAR_BASELINE_PATH,
  yearReport,
} from "./year-pinned.ts";

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
    | "truncated-name"
    | "projection-placement"
    | "root-module"
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

// Only module-level classes are graph nodes; a class declared inside a function
// is a scoped override for a replay (a substituted aggregator, a generated start).
const NODE_SOURCE =
  /^(?:export\s+)?(?:abstract\s+)?class\s+\w+(?:<[^\n]*?>)?\s+extends\s+TaxNode\b/m;

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
    if (isNodeSource(await fs.readFile(join(root, path), "utf8"))) {
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
  // A year that reuses another year's registry is checked once, at its owner.
  const owners = definitions.filter((definition, index) =>
    definitions.findIndex((other) => other.registry === definition.registry) ===
      index
  );
  return owners.flatMap((definition) =>
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
  // A year that reuses another year's registry is checked once, at its owner.
  const owners = definitions.filter((definition, index) =>
    definitions.findIndex((other) => other.registry === definition.registry) ===
      index
  );
  return owners.flatMap((definition) =>
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

/** Form identity, ignoring style: `form1116`, `f1116`, `form_1116` and `F1116` agree. */
export function formKey(name: string): string {
  return name.toLowerCase()
    .replace(/(\.test|\.fixture|\.staged)?\.(ts|md|json)$/, "")
    .replace(/[-_]/g, "")
    .replace(/^(form|f)(?=\d)/, "");
}

/** Where a form's nodes live: its key, the node folder names and their section/group. */
export type NodeIndex = ReadonlyMap<
  string,
  { readonly names: ReadonlySet<string>; readonly places: ReadonlySet<string> }
>;

const NODE_DIR = new RegExp(
  `^forms/([^/]+)/nodes/(?:inputs|outputs|intermediate/(?:${
    INTERMEDIATE_KINDS.join("|")
  }))/(${SECTIONS.join("|")})/([^/]+)/([^/]+)/`,
);
// Roles that mirror a form outside the node tree. Domains and e2e are grouped
// by tax concern, so the same source can rightly appear in two sections there.
const MIRROR = new RegExp(
  `^forms/([^/]+)/(?:\\d{4}/(domains|mef/forms|pdf/forms)|(e2e|validation/rules))/(${
    SECTIONS.join("|")
  })/([^/]+)/([^/]+)(/.*)?$`,
);

export function nodeIndex(paths: readonly string[]): NodeIndex {
  const index = new Map<string, { names: Set<string>; places: Set<string> }>();
  for (const path of paths) {
    const match = NODE_DIR.exec(path);
    if (!match) continue;
    const [, form, section, group, name] = match;
    const key = `${form}:${formKey(name)}`;
    const entry = index.get(key) ?? { names: new Set(), places: new Set() };
    entry.names.add(name);
    entry.places.add(`${section}/${group}`);
    index.set(key, entry);
  }
  return index;
}

type Mirror = {
  readonly form: string;
  readonly role: string;
  readonly section: string;
  readonly group: string;
  readonly leaf: string;
  readonly path: string;
};

function mirrors(paths: readonly string[]): Mirror[] {
  const seen = new Map<string, Mirror>();
  for (const path of paths) {
    const match = MIRROR.exec(path);
    if (!match) continue;
    const [, form, yearRole, formRole, section, group, leaf, rest] = match;
    const name = rest === undefined
      ? leaf.replace(/(\.test|\.fixture|\.staged)?\.(ts|md|json)$/, "")
      : leaf;
    const at = `${
      path.slice(0, path.length - leaf.length - (rest?.length ?? 0))
    }${name}`;
    if (!seen.has(at)) {
      seen.set(at, {
        form,
        role: yearRole ?? formRole,
        section,
        group,
        leaf: name,
        path: at,
      });
    }
  }
  return [...seen.values()];
}

/** A shortened form name (`f1099n`) hides which form it is; use the node's name. */
export function truncatedNameProblems(
  paths: readonly string[],
  index: NodeIndex,
): Problem[] {
  return mirrors(paths).flatMap((mirror) => {
    if (!/^(form|f)[-_]?\d/i.test(mirror.leaf)) return [];
    const key = formKey(mirror.leaf);
    if (index.has(`${mirror.form}:${key}`)) return [];
    const longer = [...index].filter(([candidate]) =>
      candidate.startsWith(`${mirror.form}:${key}`)
    );
    if (longer.length !== 1) return [];
    const names = [...longer[0][1].names].join(" or ");
    return [{
      kind: "truncated-name" as const,
      path: mirror.path,
      message: `'${mirror.leaf}' is a shortened name for the ${names} node`,
      fix: `Rename it to ${names}, the node's own name`,
    }];
  });
}

/** A form's MeF and PDF projections live in the same section/group as its node. */
export function projectionPlacementProblems(
  paths: readonly string[],
  index: NodeIndex,
): Problem[] {
  return mirrors(paths).flatMap((mirror) => {
    if (mirror.role !== "mef/forms" && mirror.role !== "pdf/forms") return [];
    const node = index.get(`${mirror.form}:${formKey(mirror.leaf)}`);
    if (!node || node.places.has(`${mirror.section}/${mirror.group}`)) {
      return [];
    }
    const places = [...node.places].join(" or ");
    return [{
      kind: "projection-placement" as const,
      path: mirror.path,
      message: `The ${mirror.leaf} ${
        mirror.role.split("/")[0]
      } projection is in ${mirror.section}/${mirror.group}, but its node is in ${places}`,
      fix: `Move it under ${mirror.role}/${places}`,
    }];
  });
}

const SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'](\.{1,2}\/[^"'\n]+)["']/g;

/** Relative imports in a module, resolved to repository paths. */
export function importsOf(path: string, text: string): string[] {
  const directory = dirname(path);
  return [...text.matchAll(SPECIFIER)].map((match) =>
    join(directory, match[1]).replaceAll("\\", "/")
  );
}

function sectionOf(path: string, form: string): string {
  if (!path.startsWith(`forms/${form}/`)) return "outside";
  const segment = path.split("/").find((part) => oneOf(SECTIONS, part));
  return segment ?? "form-wide";
}

/** A module at a form's root must serve more than one tax section; otherwise it belongs in that section. */
export function rootModuleProblems(
  imports: ReadonlyMap<string, readonly string[]>,
): Problem[] {
  const roots = [...imports.keys()].filter((path) =>
    /^forms\/[^/]+\/[^/]+\.ts$/.test(path) && !path.endsWith(".test.ts")
  );
  return roots.flatMap((module) => {
    const form = module.split("/")[1];
    const users = new Set(
      [...imports]
        .filter(([path, targets]) =>
          path !== module && !path.endsWith(".test.ts") &&
          targets.includes(module)
        )
        .map(([path]) => sectionOf(path, form))
        .filter((section) => section !== "outside"),
    );
    if (users.has("form-wide") || users.size > 1) return [];
    const [only] = users;
    return [{
      kind: "root-module" as const,
      path: module,
      message: only
        ? `A form-root module used only by the ${only} section`
        : "A form-root module nothing in the form uses",
      fix: only
        ? `Move it next to the ${only} code that uses it`
        : "Delete it, or move it next to the code that should use it",
    }];
  });
}

async function moduleImports(
  root: string,
  paths: readonly string[],
): Promise<Map<string, readonly string[]>> {
  const entries: [string, readonly string[]][] = [];
  for (const path of paths) {
    if (!path.endsWith(".ts")) continue;
    entries.push([
      path,
      importsOf(path, await fs.readFile(join(root, path), "utf8")),
    ]);
  }
  return new Map(entries);
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
      JSON.parse(await fs.readFile(join(root, BASELINE_PATH), "utf8")),
    );
  } catch (error) {
    if (sys.isNotFound(error)) return [];
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
  const files = await repositoryFiles(root);
  const paths = await nodeFiles(root);
  const allowed = baseline ?? await readBaseline(root);
  const canonical = paths.filter((path) => nodePlacement(path).ok);
  const graph = graphOf(definitions);
  const index = nodeIndex(files);
  const formFiles = files.filter((path) => path.startsWith("forms/"));
  const raw = [
    ...placementProblems(paths),
    ...registryKeyProblems(definitions),
    ...unregisteredNodeProblems(await importedNodes(root, canonical), graph),
    ...unreachableProblems(definitions, graph),
    ...truncatedNameProblems(formFiles, index),
    ...projectionPlacementProblems(formFiles, index),
    ...rootModuleProblems(await moduleImports(root, formFiles)),
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
  const args = process.argv.slice(2);
  const { catalog } = await import("../../catalog.ts");
  const report = await structureReport(root, Object.values(catalog));
  const years = await yearReport(root);
  if (args.includes("--shrink-year-baseline")) {
    const shrunk = shrunkYearBaseline(years.hits, years.baseline);
    await fs.writeFile(
      join(root, YEAR_BASELINE_PATH),
      `${JSON.stringify(shrunk, null, 2)}\n`,
    );
    console.log(
      `${YEAR_BASELINE_PATH}: ${years.baseline.length} -> ${shrunk.length} entries`,
    );
    process.exit(0);
  }
  console.log(
    args.includes("--json")
      ? JSON.stringify({
        ...report,
        years: { baseline: years.baseline.length, problems: years.problems },
      })
      : `${formatReport(report)}\n${formatYearReport(years)}`,
  );
  process.exit(
    report.problems.length === 0 && years.problems.length === 0 ? 0 : 1,
  );
}
