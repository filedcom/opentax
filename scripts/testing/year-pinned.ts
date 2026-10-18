/** Year-pinned code: shared nodes and the projections they feed read the tax year from the context, never a literal. */
import * as fs from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import * as sys from "../support/sys.ts";
import { repositoryFiles } from "./repository.ts";

export const YEAR_BASELINE_PATH = "scripts/testing/year-pinned-baseline.json";

export enum YearPattern {
  ConfigIndex = "config-index",
  YearComparison = "year-comparison",
  YearValue = "year-value",
  ZodLiteral = "z-literal",
  DatePinned = "date-pinned",
  YearIdentifier = "year-identifier",
}

const yearBaselineEntrySchema = z.object({
  path: z.string().min(1),
  pattern: z.nativeEnum(YearPattern),
  count: z.number().int().positive(),
});
export const yearBaselineSchema = z.array(yearBaselineEntrySchema);
export type YearBaseline = z.infer<typeof yearBaselineSchema>;

export type YearHit = {
  readonly path: string;
  readonly line: number;
  readonly pattern: YearPattern;
  readonly text: string;
};

export type YearProblem = {
  readonly kind: "year-pinned" | "stale-year-baseline";
  readonly path: string;
  readonly pattern: YearPattern;
  readonly lines: readonly number[];
  readonly message: string;
  readonly fix: string;
};

const FIX = "read the year from ctx.taxYear / CONFIG_BY_YEAR[ctx.taxYear]";

// Tax years the engine serves and their neighbours; older years are statute dates.
// `>=` is an onset gate (`ctx.taxYear >= 2026` selects law new in 2026 and holds
// for later years), so it is the one comparison allowed.
const Y = "20(?:2[4-7])";
const YEARISH = "\\w*(?:[yY]ear|YEAR|[yY]r)\\w*";

const PATTERNS: readonly (readonly [YearPattern, RegExp])[] = [
  [YearPattern.ConfigIndex, new RegExp(`CONFIG_BY_YEAR\\s*\\[\\s*${Y}\\s*\\]`, "g")],
  [
    YearPattern.YearComparison,
    new RegExp(
      `\\b${YEARISH}\\s*(?:[!=]==?|<=?|>(?!=))\\s*${Y}\\b|\\b${Y}\\s*(?:[!=]==?|>=?|<(?!=))\\s*(?:[\\w.]*\\.)?${YEARISH}\\b`,
      "g",
    ),
  ],
  [
    YearPattern.YearValue,
    new RegExp(`\\b${YEARISH}["']?\\??\\s*(?::|=(?!=))\\s*${Y}\\b`, "g"),
  ],
  [YearPattern.ZodLiteral, new RegExp(`\\bz\\.literal\\(\\s*${Y}\\s*\\)`, "g")],
  [
    YearPattern.DatePinned,
    new RegExp(
      `\\^\\(?${Y}-|["'\`]${Y}-\\d{2}(?:-\\d{2})?|\\bDate(?:\\.UTC)?\\(\\s*${Y}\\s*,`,
      "g",
    ),
  ],
  [
    YearPattern.YearIdentifier,
    new RegExp(`\\b[A-Za-z_$][\\w$]*?${Y}(?![\\dv])[\\w$]*`, "g"),
  ],
];

/** Shared code a TY2026 return runs: nodes and the MeF, PDF, domain and return-processing code they feed. */
export function yearScanned(path: string): boolean {
  if (!path.endsWith(".ts") || path.endsWith(".test.ts")) return false;
  if (/fixture/i.test(path) || /\/test-utils\//.test(path)) return false;
  if (path.startsWith("forms/f1040/nodes/config/")) {
    return !/\/(?:2025|2026|index)\.ts$/.test(path);
  }
  return path.startsWith("forms/f1040/nodes/") ||
    /^forms\/f1040\/2025\/(?:mef|pdf|domains|return-processing)\//.test(path) ||
    path.startsWith("forms/f1040/mef/") ||
    path.startsWith("forms/f1040/validation/") ||
    /^forms\/f1040\/[^/]+\.ts$/.test(path);
}

/** Blanks comments, keeping strings, regex literals and line numbers. */
export function stripComments(text: string): string {
  let out = "";
  let i = 0;
  let previous = "";
  const blank = (s: string) => s.replace(/[^\n]/g, " ");
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (c === "/" && next === "/") {
      const end = text.indexOf("\n", i);
      const stop = end === -1 ? text.length : end;
      out += blank(text.slice(i, stop));
      i = stop;
      continue;
    }
    if (c === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += blank(text.slice(i, stop));
      i = stop;
      continue;
    }
    const regexStart = c === "/" && (previous === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(previous));
    if (c === '"' || c === "'" || c === "`" || regexStart) {
      let j = i + 1;
      let inClass = false;
      while (j < text.length) {
        const d = text[j];
        if (d === "\\") {
          j += 2;
          continue;
        }
        if (d === "\n" && c !== "`") break;
        if (regexStart && d === "[") inClass = true;
        else if (regexStart && d === "]") inClass = false;
        else if (d === c && !inClass) break;
        j++;
      }
      out += text.slice(i, j + 1);
      i = j + 1;
      previous = c;
      continue;
    }
    if (!/\s/.test(c)) previous = c;
    out += c;
    i++;
  }
  return out;
}

export function yearHits(path: string, text: string): YearHit[] {
  return stripComments(text).split("\n").flatMap((line, index) =>
    PATTERNS.flatMap(([pattern, regex]) =>
      [...line.matchAll(regex)].map((match) => ({
        path,
        line: index + 1,
        pattern,
        text: match[0],
      }))
    )
  );
}

const key = (path: string, pattern: string) => `${path}\0${pattern}`;

/** A ratchet: each file may keep its recorded count per pattern; more fails, fewer must be recorded. */
export function applyYearBaseline(
  hits: readonly YearHit[],
  baseline: YearBaseline,
): YearProblem[] {
  const groups = new Map<string, YearHit[]>();
  for (const hit of hits) {
    const k = key(hit.path, hit.pattern);
    groups.set(k, [...(groups.get(k) ?? []), hit]);
  }
  const allowed = new Map(
    baseline.map((entry) => [key(entry.path, entry.pattern), entry.count]),
  );
  const over = [...groups.values()].flatMap((group) => {
    const { path, pattern } = group[0];
    const limit = allowed.get(key(path, pattern)) ?? 0;
    if (group.length <= limit) return [];
    return [{
      kind: "year-pinned" as const,
      path,
      pattern,
      lines: group.map((hit) => hit.line),
      message: `${
        group.map((hit) => `${path}:${hit.line} ${hit.text}`).join("\n  ")
      }\n  ${group.length} ${pattern} occurrences, baseline allows ${limit}`,
      fix: FIX,
    }];
  });
  const under = baseline.flatMap((entry) => {
    const found = groups.get(key(entry.path, entry.pattern))?.length ?? 0;
    if (found >= entry.count) return [];
    return [{
      kind: "stale-year-baseline" as const,
      path: entry.path,
      pattern: entry.pattern,
      lines: [],
      message:
        `Baseline records ${entry.count} ${entry.pattern} occurrences, ${found} remain`,
      fix: found === 0
        ? `Remove it from ${YEAR_BASELINE_PATH} (bun run check:structure --shrink-year-baseline)`
        : `Lower its count to ${found} in ${YEAR_BASELINE_PATH} (bun run check:structure --shrink-year-baseline)`,
    }];
  });
  return [...over, ...under];
}

/** The baseline with fixed occurrences removed; it never grows. */
export function shrunkYearBaseline(
  hits: readonly YearHit[],
  baseline: YearBaseline,
): YearBaseline {
  return baseline.flatMap((entry) => {
    const found = hits.filter((hit) =>
      hit.path === entry.path && hit.pattern === entry.pattern
    ).length;
    const count = Math.min(found, entry.count);
    return count > 0 ? [{ ...entry, count }] : [];
  });
}

export function yearBaselineOf(hits: readonly YearHit[]): YearBaseline {
  const counts = new Map<string, { path: string; pattern: YearPattern; count: number }>();
  for (const hit of hits) {
    const k = key(hit.path, hit.pattern);
    const entry = counts.get(k) ?? { path: hit.path, pattern: hit.pattern, count: 0 };
    counts.set(k, { ...entry, count: entry.count + 1 });
  }
  return [...counts.values()].sort((a, b) =>
    a.path.localeCompare(b.path) || a.pattern.localeCompare(b.pattern)
  );
}

export async function readYearBaseline(root: string): Promise<YearBaseline> {
  try {
    return yearBaselineSchema.parse(
      JSON.parse(await fs.readFile(join(root, YEAR_BASELINE_PATH), "utf8")),
    );
  } catch (error) {
    if (sys.isNotFound(error)) return [];
    throw error;
  }
}

export async function scanYears(root: string): Promise<YearHit[]> {
  const paths = (await repositoryFiles(root)).filter(yearScanned);
  const hits: YearHit[] = [];
  for (const path of paths) {
    const text = await fs.readFile(join(root, path), "utf8").catch(() => null);
    if (text !== null) hits.push(...yearHits(path, text));
  }
  return hits;
}

export type YearReport = {
  readonly files: number;
  readonly baseline: YearBaseline;
  readonly problems: readonly YearProblem[];
};

export async function yearReport(
  root: string,
  baseline?: YearBaseline,
): Promise<YearReport & { readonly hits: readonly YearHit[] }> {
  const hits = await scanYears(root);
  const allowed = baseline ?? await readYearBaseline(root);
  return {
    files: new Set(hits.map((hit) => hit.path)).size,
    baseline: allowed,
    hits,
    problems: applyYearBaseline(hits, allowed),
  };
}

export function formatYearReport(report: YearReport): string {
  const lines = report.problems.map((problem) =>
    `${problem.kind}: ${problem.message}\n  fix: ${problem.fix}`
  );
  const byPattern = Object.values(YearPattern).map((pattern) =>
    `${pattern} ${
      report.baseline.filter((e) => e.pattern === pattern).reduce(
        (n, e) => n + e.count,
        0,
      )
    }`
  ).join(", ");
  const total = report.baseline.reduce((n, e) => n + e.count, 0);
  return [
    ...lines,
    `${total} year-pinned occurrences baselined across ${
      new Set(report.baseline.map((e) => e.path)).size
    } files (TY2026 to-do: ${byPattern}), ${report.problems.length} year problems`,
  ].join("\n");
}
