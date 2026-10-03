#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run
/**
 * run_benchmark.ts — Run all cases through the tax engine and compare to correct values.
 * Run: deno run --allow-read --allow-write --allow-run benchmark/run_benchmark.ts
 */

import { dirname, fromFileUrl, join } from "@std/path";

const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const TAX_DIR = join(SCRIPT_DIR, "..");

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args = Deno.args;

function getFlag(flag: string, defaultVal: string): string {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : defaultVal;
}

const formFlag = getFlag("--form", "f1040");
const yearFlag = getFlag("--year", "2025");
const jsonFlag = args.includes("--json");

const CASES_DIR = join(SCRIPT_DIR, "cases", formFlag, yearFlag);

const RED = "\x1b[31m",
  GRN = "\x1b[32m",
  YEL = "\x1b[33m",
  DIM = "\x1b[2m",
  RST = "\x1b[0m";
const CLEAR_LINE = "\x1b[2K\r";

export function taxCommandOutputOrThrow(
  code: number,
  stdoutText: string,
  stderrText: string,
  args: readonly string[],
): string {
  if (code !== 0) {
    throw new Error(
      `opentax command failed (${code}): deno run cli/main.ts ${
        args.join(" ")
      }\n${stderrText}${stdoutText}`,
    );
  }
  if (stderrText.length > 0) {
    console.error(stderrText);
  }
  return stdoutText;
}

async function tax(...args: string[]): Promise<string> {
  const { code, stdout, stderr } = await new Deno.Command("deno", {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      join(TAX_DIR, "cli/main.ts"),
      ...args,
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  const stdoutText = new TextDecoder().decode(stdout);
  const stderrText = new TextDecoder().decode(stderr);
  return taxCommandOutputOrThrow(code, stdoutText, stderrText, args);
}

function displayScalar(val: unknown): number {
  if (Array.isArray(val)) return typeof val[0] === "number" ? val[0] : 0;
  return typeof val === "number" ? val : 0;
}

export type NumericLineFailure = {
  readonly line: string;
  readonly expected: number;
  readonly actual: unknown;
  readonly reason: "missing" | "multi_entry" | "nonfinite" | "mismatch";
  readonly tolerance: number;
};

// Retained legacy absolute dollar tolerance, inclusive per line, not an IRS rule.
const ROUNDING_TOLERANCE = 5;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function singleNumericActual(
  value: unknown,
): number | NumericLineFailure["reason"] {
  if (Array.isArray(value)) {
    if (value.length === 0) return "missing";
    if (value.length > 1) return "multi_entry";
    return isFiniteNumber(value[0]) ? value[0] : "nonfinite";
  }
  return isFiniteNumber(value) ? value : "nonfinite";
}

export function compareExpectedNumericLines(
  actual: Readonly<Record<string, unknown>>,
  expected: Readonly<Record<string, unknown>>,
  tolerance = ROUNDING_TOLERANCE,
): NumericLineFailure[] {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error("Benchmark tolerance must be finite and nonnegative");
  }
  let numericCount = 0;
  const failures: NumericLineFailure[] = [];
  for (const [line, expectedValue] of Object.entries(expected)) {
    if (typeof expectedValue !== "number") continue;
    if (!Number.isFinite(expectedValue)) {
      throw new Error(`Nonfinite expected benchmark value: ${line}`);
    }
    numericCount++;
    if (!(line in actual)) {
      failures.push({
        line,
        expected: expectedValue,
        actual: undefined,
        reason: "missing",
        tolerance,
      });
      continue;
    }
    const actualValue = singleNumericActual(actual[line]);
    if (typeof actualValue === "string") {
      failures.push({
        line,
        expected: expectedValue,
        actual: actual[line],
        reason: actualValue,
        tolerance,
      });
      continue;
    }
    if (Math.abs(actualValue - expectedValue) > tolerance) {
      failures.push({
        line,
        expected: expectedValue,
        actual: actualValue,
        reason: "mismatch",
        tolerance,
      });
    }
  }
  if (numericCount === 0) {
    throw new Error("No numeric expected benchmark values");
  }
  return failures;
}

// ── Table layout ─────────────────────────────────────────────────────────────

export type UnsupportedCheck = {
  readonly field: string;
  readonly expected: number;
  readonly kind: "unmapped_oracle";
};

// Exact public summary keys: cli/commands/return.ts ReturnSummary/extractSummary.
// Additional exact raw output keys: forms/f1040/nodes/outputs/f1040/index.ts inputSchema.
// No inferred aliases, aggregation, missing-to-zero conversion or intermediate mapping.
const SUMMARY_FIELDS = new Set([
  "line1z_total_wages",
  "line9_total_income",
  "line11_agi",
  "line15_taxable_income",
  "line24_total_tax",
  "line33_total_payments",
  "line35a_refund",
  "line37_amount_owed",
]);
const RAW_FIELDS = new Set([
  "line1a_wages",
  "line10_adjustments",
  "line27_eitc",
]);
const METADATA_FIELDS = new Set([
  "case",
  "scenario",
  "year",
  "inputs",
  "notes",
  "source",
  "sources",
]);

export function classifyFixtureExpectations(
  fixture: Readonly<Record<string, unknown>>,
) {
  const wrapped = fixture.correct !== undefined;
  const expected = wrapped ? fixture.correct : fixture;
  if (!expected || typeof expected !== "object" || Array.isArray(expected)) {
    throw new Error("Invalid fixture expectations object");
  }
  const expectedLines: Record<string, number> = {};
  const unsupportedChecks: UnsupportedCheck[] = [];
  const metadata = wrapped
    ? Object.keys(fixture).filter((key) => key !== "correct")
    : [];
  for (const [field, value] of Object.entries(expected)) {
    if (!wrapped && METADATA_FIELDS.has(field)) {
      metadata.push(field);
      continue;
    }
    if (typeof value !== "number") {
      if (!METADATA_FIELDS.has(field)) {
        throw new Error(`Nonnumeric expected benchmark value: ${field}`);
      }
      metadata.push(field);
      continue;
    }
    if (!Number.isFinite(value)) {
      throw new Error(`Nonfinite expected benchmark value: ${field}`);
    }
    if (SUMMARY_FIELDS.has(field) || RAW_FIELDS.has(field)) {
      expectedLines[field] = value;
    } else {unsupportedChecks.push({
        field,
        expected: value,
        kind: "unmapped_oracle",
      });}
  }
  return { expectedLines, unsupportedChecks, metadata };
}

const COLS = [
  { label: "#", width: 3, align: "r" },
  { label: "Case", width: 58, align: "l" },
  { label: "AGI", width: 10, align: "r" },
  { label: "Taxable", width: 10, align: "r" },
  { label: "TotalTax", width: 10, align: "r" },
  { label: "Payments", width: 10, align: "r" },
  { label: "Refund", width: 10, align: "r" },
  { label: "Owed", width: 10, align: "r" },
  { label: "Result", width: 6, align: "c" },
] as const;

function pad(s: string, w: number, align: "l" | "r" | "c"): string {
  if (align === "r") return s.padStart(w);
  if (align === "l") return s.padEnd(w);
  const total = w - s.length;
  const l = Math.floor(total / 2), r = total - l;
  return " ".repeat(l) + s + " ".repeat(r);
}

function border(
  left: string,
  mid: string,
  right: string,
  fill: string,
): string {
  return left + COLS.map((c) => fill.repeat(c.width + 2)).join(mid) + right;
}

const TOP = border("┌", "┬", "┐", "─");
const HDR_DIV = border("├", "┼", "┤", "─");
const BOT = border("└", "┴", "┘", "─");

function tableRow(cells: string[]): string {
  return "│" +
    cells.map((c, i) => " " + pad(c, COLS[i].width, COLS[i].align) + " ").join(
      "│",
    ) + "│";
}

function headerRow(): string {
  return tableRow(COLS.map((c) => c.label));
}

// ── Case runner ───────────────────────────────────────────────────────────────

type CaseResult = {
  name: string;
  engAgi: number;
  engTi: number;
  engTax: number;
  engPay: number;
  engRef: number;
  engOwe: number;
  correct: Record<string, number>;
  lineFailures: NumericLineFailure[];
  unsupportedChecks: UnsupportedCheck[];
  errors: string[];
  ok: boolean;
};

async function runCase(name: string): Promise<CaseResult | null> {
  const caseDir = join(CASES_DIR, name);
  const inputFile = join(caseDir, "input.json");
  const correctFile = join(caseDir, "correct.json");
  try {
    await Deno.stat(inputFile);
    await Deno.stat(correctFile);
  } catch {
    return null;
  }

  const caseData = JSON.parse(await Deno.readTextFile(inputFile));
  const correct = JSON.parse(await Deno.readTextFile(correctFile));

  const rid = JSON.parse(
    await tax("return", "create", "--year", String(caseData.year), "--json"),
  ).returnId;
  for (const f of caseData.forms) {
    await tax(
      "form",
      "add",
      "--returnId",
      rid,
      "--node_type",
      f.node_type,
      JSON.stringify(f.data),
      "--json",
    );
  }

  const eng = JSON.parse(
    await tax("return", "get", "--returnId", rid, "--json"),
  );
  const l = eng.lines ?? {};
  const sm = eng.summary ?? {};
  // Raw lines take precedence: summary normalization must not hide malformed values.
  const actualLines = { ...sm, ...l };
  const errors: string[] = (eng.warnings ?? []).filter((warning: string) =>
    warning.startsWith("[EXECUTOR_")
  );

  const engAgi = displayScalar(actualLines.line11_agi ?? 0);
  const engTi = displayScalar(actualLines.line15_taxable_income ?? 0);
  const engTax = displayScalar(actualLines.line24_total_tax ?? 0);
  const engPay = displayScalar(actualLines.line33_total_payments ?? 0);
  const engRef = displayScalar(actualLines.line35a_refund ?? 0);
  const engOwe = displayScalar(actualLines.line37_amount_owed ?? 0);

  const { expectedLines: c, unsupportedChecks } = classifyFixtureExpectations(
    correct,
  );
  const lineFailures = Object.keys(c).length > 0
    ? compareExpectedNumericLines(actualLines, c)
    : [];
  if (Object.keys(c).length === 0 && unsupportedChecks.length === 0) {
    errors.push("No numeric expected benchmark values");
  }
  const ok = lineFailures.length === 0 && errors.length === 0 &&
    unsupportedChecks.length === 0;

  return {
    name,
    engAgi,
    engTi,
    engTax,
    engPay,
    engRef,
    engOwe,
    correct: c,
    lineFailures,
    unsupportedChecks,
    errors,
    ok,
  };
}

function colorNum(eng: number, cor: number, width: number): string {
  const s = Math.round(eng).toLocaleString().padStart(width);
  return Math.abs(eng - cor) <= 5 ? `${GRN}${s}${RST}` : `${RED}${s}${RST}`;
}

function resultRow(r: CaseResult, idx: number): string {
  const numW = COLS[2].width; // all number columns share this width
  const nums = [
    colorNum(r.engAgi, r.correct.line11_agi, numW),
    colorNum(r.engTi, r.correct.line15_taxable_income, numW),
    colorNum(r.engTax, r.correct.line24_total_tax, numW),
    colorNum(r.engPay, r.correct.line33_total_payments, numW),
    colorNum(r.engRef, r.correct.line35a_refund, numW),
    colorNum(r.engOwe, r.correct.line37_amount_owed, numW),
  ];
  const result = r.ok ? `${GRN} PASS ${RST}` : `${RED} FAIL ${RST}`;
  // Plain cells use pad(); pre-padded colored cells are inserted directly.
  return "│" +
    ` ${pad(String(idx + 1), COLS[0].width, "r")} │` +
    ` ${pad(r.name, COLS[1].width, "l")} │` +
    nums.map((n) => ` ${n} `).join("│") + "│" +
    ` ${result} │`;
}

// ── Progress + streaming output (all on stdout) ───────────────────────────────

const encoder = new TextEncoder();
const write = (s: string) => Deno.stdout.writeSync(encoder.encode(s));

function progressLine(done: number, total: number, running: number): string {
  const BAR_W = 30;
  const filled = total > 0 ? Math.round((done / total) * BAR_W) : 0;
  const bar = GRN + "█".repeat(filled) + RST + DIM +
    "░".repeat(BAR_W - filled) + RST;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const spin = running > 0
    ? `  ${YEL}▶${RST} ${DIM}${running} running${RST}`
    : "";
  return `${CLEAR_LINE}  ${bar}  ${DIM}${done}/${total}${RST} ${pct}%${spin}`;
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

const CONCURRENCY = 8;

async function runAll(caseNames: string[]): Promise<CaseResult[]> {
  const allResults: CaseResult[] = [];
  let idx = 0, done = 0, printed = 0;
  const total = caseNames.length;

  // Print header once
  write("\n" + TOP + "\n" + headerRow() + "\n" + HDR_DIV + "\n");
  write(progressLine(0, total, 0));

  async function worker() {
    while (idx < caseNames.length) {
      const name = caseNames[idx++];
      const activeCount = Math.min(CONCURRENCY, total - done);

      let result: CaseResult | null;
      try {
        result = await runCase(name);
      } catch (error) {
        result = {
          name,
          engAgi: NaN,
          engTi: NaN,
          engTax: NaN,
          engPay: NaN,
          engRef: NaN,
          engOwe: NaN,
          correct: {},
          lineFailures: [],
          unsupportedChecks: [],
          errors: [error instanceof Error ? error.message : String(error)],
          ok: false,
        };
      }
      done++;
      if (result) allResults.push(result);

      // Clear progress bar, print completed row, redraw progress bar
      const row = result ? resultRow(result, printed++) : null;
      write(CLEAR_LINE);
      if (row) write(row + "\n");
      if (done < total) write(progressLine(done, total, activeCount - 1));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  write(CLEAR_LINE);
  return allResults;
}

if (import.meta.main) {
  const names: string[] = [];
  for await (const e of Deno.readDir(CASES_DIR)) {
    if (!e.isDirectory) continue;
    names.push(e.name);
  }
  names.sort();

  const results = await runAll(names);

  // ── Footer ────────────────────────────────────────────────────────────────────

  write(BOT + "\n");

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  const skipped = names.length - results.length;
  const emptyCaseSet = results.length === 0;

  write(
    `\n  ${GRN}${pass} PASS${RST}  ${RED}${fail} FAIL${RST}  ${YEL}${skipped} SKIP${RST}  ${DIM}out of ${results.length} runnable cases  ·  green = within $${ROUNDING_TOLERANCE} legacy benchmark tolerance${RST}\n\n`,
  );
  if (emptyCaseSet) {
    console.error(
      "No runnable benchmark cases found; failing instead of reporting an empty success.",
    );
  }

  if (jsonFlag) {
    const failures = results.filter((r) => !r.ok).map((r) => ({
      name: r.name,
      lineFailures: r.lineFailures,
      unsupportedChecks: r.unsupportedChecks,
      errors: r.errors,
    }));
    const failing = failures.map((failure) => failure.name);
    console.log(
      JSON.stringify({
        total: results.length,
        skipped,
        pass,
        fail,
        failing,
        failures,
      }),
    );
  }

  if (fail > 0 || skipped > 0 || emptyCaseSet) {
    Deno.exit(1);
  }
}
