/** Oracle contract: expected benchmark values change only with a cited publication. */
import { dirname, fromFileUrl, join } from "@std/path";
import { z } from "zod";
import {
  benchmarkExpectedSchema,
  ENGINE_SOURCE,
} from "../../benchmark/harness.ts";
import { repositoryFiles } from "./repository.ts";

export const CASES_DIR = "benchmark/cases";
export const LEDGER_FILE = "ledger.json";

const ledgerEntrySchema = z.object({
  case: z.string().min(1),
  /** Omitted for a removed case. */
  line: z.string().min(1).optional(),
  before: z.number().finite().optional(),
  after: z.number().finite().optional(),
  source: z.string().min(1),
  approvedBy: z.string().min(1),
  on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
});
export const ledgerSchema = z.array(ledgerEntrySchema);
export type Ledger = z.infer<typeof ledgerSchema>;

export type Change =
  | {
    readonly kind: "value";
    readonly product: string;
    readonly case: string;
    readonly line: string;
    readonly before: number | undefined;
    readonly after: number | undefined;
  }
  | {
    readonly kind: "added";
    readonly product: string;
    readonly case: string;
    readonly cited: boolean;
  }
  | {
    readonly kind: "removed";
    readonly product: string;
    readonly case: string;
  };

export type Problem = {
  readonly kind:
    | "uncited-change"
    | "uncited-removal"
    | "engine-source"
    | "missing-source";
  readonly product: string;
  readonly case: string;
  readonly line?: string;
  readonly message: string;
  readonly fix: string;
};

const CASE_FILE = /^benchmark\/cases\/([^/]+\/\d{4})\/([^/]+)\/correct\.json$/;

export function caseKey(
  path: string,
): { product: string; case: string } | undefined {
  const match = CASE_FILE.exec(path);
  return match ? { product: match[1], case: match[2] } : undefined;
}

export function scoredValues(raw: unknown): Record<string, number> {
  return benchmarkExpectedSchema.parse(raw);
}

export function isCited(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const { source, sources } = raw as { source?: unknown; sources?: unknown };
  return (typeof source === "string" && source.trim().length > 0) ||
    (Array.isArray(sources) && sources.length > 0);
}

export function caseChanges(
  product: string,
  name: string,
  before: unknown | undefined,
  after: unknown | undefined,
): Change[] {
  if (before === undefined && after === undefined) return [];
  if (before === undefined) {
    return [{ kind: "added", product, case: name, cited: isCited(after) }];
  }
  if (after === undefined) return [{ kind: "removed", product, case: name }];
  const was = scoredValues(before);
  const now = scoredValues(after);
  return [...new Set([...Object.keys(was), ...Object.keys(now)])]
    .filter((line) => was[line] !== now[line])
    .sort()
    .map((line) => ({
      kind: "value" as const,
      product,
      case: name,
      line,
      before: was[line],
      after: now[line],
    }));
}

const ledgerPath = (product: string) =>
  `${CASES_DIR}/${product}/${LEDGER_FILE}`;

function citation(entry: Ledger[number] | undefined): string | undefined {
  if (!entry) return undefined;
  return ENGINE_SOURCE.test(entry.source) ? undefined : entry.source;
}

/** Every change needs a ledger entry that states it and cites a publication. */
export function ledgerProblems(
  changes: readonly Change[],
  ledgers: ReadonlyMap<string, Ledger>,
): Problem[] {
  return changes.flatMap((change): Problem[] => {
    const ledger = ledgers.get(change.product) ?? [];
    const file = ledgerPath(change.product);
    if (change.kind === "added") {
      if (change.cited) return [];
      return [{
        kind: "missing-source",
        product: change.product,
        case: change.case,
        message: "New case has no source citation",
        fix:
          `Add "source": "<publication, exercise, page>" to its correct.json`,
      }];
    }
    if (change.kind === "removed") {
      const entry = ledger.find((candidate) =>
        candidate.case === change.case && candidate.line === undefined
      );
      if (entry && citation(entry)) return [];
      return [{
        kind: entry ? "engine-source" : "uncited-removal",
        product: change.product,
        case: change.case,
        message: entry
          ? `Ledger entry cites the engine, not a publication: ${entry.source}`
          : "Case removed without a ledger entry",
        fix:
          `Add { "case": "${change.case}", "source": "<why, with the publication>", "approvedBy", "on" } to ${file}`,
      }];
    }
    const entry = ledger.find((candidate) =>
      candidate.case === change.case && candidate.line === change.line &&
      candidate.before === change.before && candidate.after === change.after
    );
    if (entry && citation(entry)) return [];
    return [{
      kind: entry ? "engine-source" : "uncited-change",
      product: change.product,
      case: change.case,
      line: change.line,
      message: entry
        ? `Ledger entry cites the engine, not a publication: ${entry.source}`
        : `${change.line} changed ${change.before ?? "∅"} -> ${
          change.after ?? "∅"
        } without a ledger entry`,
      fix:
        `Add { "case": "${change.case}", "line": "${change.line}", "before": ${
          change.before ?? "null"
        }, "after": ${
          change.after ?? "null"
        }, "source": "<publication, page>", "approvedBy", "on" } to ${file}`,
    }];
  });
}

async function git(root: string, args: string[]): Promise<string> {
  const result = await new Deno.Command("git", {
    args,
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!result.success) {
    throw new Error(
      `git ${args.slice(0, 2).join(" ")} failed: ${
        new TextDecoder().decode(result.stderr).trim()
      }`,
    );
  }
  return new TextDecoder().decode(result.stdout);
}

async function baseCases(
  root: string,
  base: string,
): Promise<Map<string, unknown>> {
  const paths = (await git(root, [
    "ls-tree",
    "-r",
    "--name-only",
    base,
    "--",
    CASES_DIR,
  ])).split("\n").filter((path) => caseKey(path));
  const entries: [string, unknown][] = [];
  for (const path of paths) {
    entries.push([
      path,
      JSON.parse(await git(root, ["show", `${base}:${path}`])),
    ]);
  }
  return new Map(entries);
}

async function currentCases(root: string): Promise<Map<string, unknown>> {
  const entries: [string, unknown][] = [];
  for (const path of (await repositoryFiles(root)).filter((p) => caseKey(p))) {
    entries.push([path, JSON.parse(await Deno.readTextFile(join(root, path)))]);
  }
  return new Map(entries);
}

async function currentLedgers(
  root: string,
  products: Iterable<string>,
): Promise<Map<string, Ledger>> {
  const entries: [string, Ledger][] = [];
  for (const product of new Set(products)) {
    try {
      entries.push([
        product,
        ledgerSchema.parse(
          JSON.parse(await Deno.readTextFile(join(root, ledgerPath(product)))),
        ),
      ]);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }
  return new Map(entries);
}

export type OracleReport = {
  readonly base: string;
  readonly cases: number;
  readonly changes: readonly Change[];
  readonly problems: readonly Problem[];
};

export async function oracleReport(
  root: string,
  base: string,
): Promise<OracleReport> {
  await git(root, ["rev-parse", "--verify", "--quiet", `${base}^{commit}`]);
  const [was, now] = await Promise.all([
    baseCases(root, base),
    currentCases(root),
  ]);
  const changes = [...new Set([...was.keys(), ...now.keys()])].sort().flatMap(
    (path) => {
      const key = caseKey(path)!;
      return caseChanges(key.product, key.case, was.get(path), now.get(path));
    },
  );
  const ledgers = await currentLedgers(
    root,
    changes.map((change) => change.product),
  );
  return {
    base,
    cases: now.size,
    changes,
    problems: ledgerProblems(changes, ledgers),
  };
}

export function formatReport(report: OracleReport): string {
  const lines = report.problems.map((problem) =>
    `${problem.product}/${problem.case}${
      problem.line ? ` ${problem.line}` : ""
    }\n  ${problem.message}\n  fix: ${problem.fix}`
  );
  const summary =
    `${report.cases} cases, ${report.changes.length} changes since ${report.base}, ${report.problems.length} problems`;
  return [...lines, summary].join("\n");
}

if (import.meta.main) {
  const root = dirname(dirname(dirname(fromFileUrl(import.meta.url))));
  const baseIndex = Deno.args.indexOf("--base");
  const base = baseIndex === -1 ? "origin/main" : Deno.args[baseIndex + 1];
  let report: OracleReport;
  try {
    report = await oracleReport(root, base);
  } catch (error) {
    console.error(
      `${(error as Error).message}\nFetch the base first: git fetch origin ${
        base.replace(/^origin\//, "")
      }`,
    );
    Deno.exit(2);
  }
  console.log(
    Deno.args.includes("--json")
      ? JSON.stringify(report)
      : formatReport(report),
  );
  Deno.exit(report.problems.length === 0 ? 0 : 1);
}
