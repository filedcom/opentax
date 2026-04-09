#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run
/**
 * run_benchmark.ts — Run all cases through the tax engine and compare to correct values.
 * Run: deno run --allow-read --allow-write --allow-run benchmark/run_benchmark.ts
 */

import { dirname, fromFileUrl, join } from "@std/path";

const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const TAX_DIR    = join(SCRIPT_DIR, "..");
const CASES_DIR  = join(SCRIPT_DIR, "cases");

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args = Deno.args;
const formFlag = (() => {
  const i = args.indexOf("--form");
  return i !== -1 ? args[i + 1] : null;
})();
const jsonFlag = args.includes("--json");

const RED = "\x1b[31m", GRN = "\x1b[32m", YEL = "\x1b[33m", DIM = "\x1b[2m", RST = "\x1b[0m";
const CLEAR_LINE = "\x1b[2K\r";

async function tax(...args: string[]): Promise<string> {
  const { stdout } = await new Deno.Command("deno", {
    args: ["run", "--allow-read", "--allow-write", join(TAX_DIR, "cli/main.ts"), ...args],
    stdout: "piped", stderr: "inherit",
  }).output();
  return new TextDecoder().decode(stdout);
}

function scalar(val: unknown): number {
  if (Array.isArray(val)) return (val[0] as number) ?? 0;
  return (val as number) ?? 0;
}

// ── Table layout ─────────────────────────────────────────────────────────────

const COLS = [
  { label: "#",        width: 3,  align: "r" },
  { label: "Case",     width: 58, align: "l" },
  { label: "AGI",      width: 10, align: "r" },
  { label: "Taxable",  width: 10, align: "r" },
  { label: "TotalTax", width: 10, align: "r" },
  { label: "Payments", width: 10, align: "r" },
  { label: "Refund",   width: 10, align: "r" },
  { label: "Owed",     width: 10, align: "r" },
  { label: "Result",   width: 6,  align: "c" },
] as const;

function pad(s: string, w: number, align: "l" | "r" | "c"): string {
  if (align === "r") return s.padStart(w);
  if (align === "l") return s.padEnd(w);
  const total = w - s.length;
  const l = Math.floor(total / 2), r = total - l;
  return " ".repeat(l) + s + " ".repeat(r);
}

function border(left: string, mid: string, right: string, fill: string): string {
  return left + COLS.map(c => fill.repeat(c.width + 2)).join(mid) + right;
}

const TOP    = border("┌", "┬", "┐", "─");
const HDR_DIV = border("├", "┼", "┤", "─");
const BOT    = border("└", "┴", "┘", "─");

function tableRow(cells: string[]): string {
  return "│" + cells.map((c, i) => " " + pad(c, COLS[i].width, COLS[i].align) + " ").join("│") + "│";
}

function headerRow(): string {
  return tableRow(COLS.map(c => c.label));
}

// ── Case runner ───────────────────────────────────────────────────────────────

type CaseResult = {
  name: string;
  engAgi: number; engTi: number; engTax: number; engPay: number; engRef: number; engOwe: number;
  correct: Record<string, number>;
  ok: boolean;
};

async function runCase(name: string): Promise<CaseResult | null> {
  const caseDir     = join(CASES_DIR, name);
  const inputFile   = join(caseDir, "input.json");
  const correctFile = join(caseDir, "correct.json");
  try { await Deno.stat(inputFile); await Deno.stat(correctFile); } catch { return null; }

  const caseData = JSON.parse(await Deno.readTextFile(inputFile));
  const correct  = JSON.parse(await Deno.readTextFile(correctFile));

  const rid = JSON.parse(await tax("return", "create", "--year", String(caseData.year), "--json")).returnId;
  for (const f of caseData.forms) {
    await tax("form", "add", "--returnId", rid, "--node_type", f.node_type, JSON.stringify(f.data), "--json");
  }

  const eng = JSON.parse(await tax("return", "get", "--returnId", rid, "--json"));
  const l   = eng.lines ?? {};
  const sm  = eng.summary ?? {};

  const engAgi = scalar(l.line11_agi              ?? sm.line11_agi              ?? 0);
  const engTi  = scalar(l.line15_taxable_income   ?? sm.line15_taxable_income   ?? 0);
  const engTax = scalar(l.line24_total_tax        ?? sm.line24_total_tax        ?? 0);
  const engPay = scalar(l.line33_total_payments   ?? sm.line33_total_payments   ?? 0);
  const engRef = scalar(sm.line35a_refund ?? 0);
  const engOwe = scalar(sm.line37_amount_owed ?? 0);

  const c   = correct.correct;
  const ok  = Math.abs(engTax - c.line24_total_tax)    <= 5 &&
              Math.abs(engRef - c.line35a_refund)       <= 5 &&
              Math.abs(engOwe - c.line37_amount_owed)   <= 5;

  return { name, engAgi, engTi, engTax, engPay, engRef, engOwe, correct: c, ok };
}

function colorNum(eng: number, cor: number, width: number): string {
  const s = Math.round(eng).toLocaleString().padStart(width);
  return Math.abs(eng - cor) <= 5 ? `${GRN}${s}${RST}` : `${RED}${s}${RST}`;
}

function resultRow(r: CaseResult, idx: number): string {
  const numW = COLS[2].width; // all number columns share this width
  const nums = [
    colorNum(r.engAgi, r.correct.line11_agi,            numW),
    colorNum(r.engTi,  r.correct.line15_taxable_income, numW),
    colorNum(r.engTax, r.correct.line24_total_tax,      numW),
    colorNum(r.engPay, r.correct.line33_total_payments, numW),
    colorNum(r.engRef, r.correct.line35a_refund,        numW),
    colorNum(r.engOwe, r.correct.line37_amount_owed,    numW),
  ];
  const result = r.ok ? `${GRN} PASS ${RST}` : `${RED} FAIL ${RST}`;
  // Plain cells use pad(); pre-padded colored cells are inserted directly.
  return "│" +
    ` ${pad(String(idx + 1), COLS[0].width, "r")} │` +
    ` ${pad(r.name, COLS[1].width, "l")} │` +
    nums.map(n => ` ${n} `).join("│") + "│" +
    ` ${result} │`;
}

// ── Progress + streaming output (all on stdout) ───────────────────────────────

const encoder = new TextEncoder();
const write = (s: string) => Deno.stdout.writeSync(encoder.encode(s));

function progressLine(done: number, total: number, running: number): string {
  const BAR_W = 30;
  const filled = total > 0 ? Math.round((done / total) * BAR_W) : 0;
  const bar = GRN + "█".repeat(filled) + RST + DIM + "░".repeat(BAR_W - filled) + RST;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const spin = running > 0 ? `  ${YEL}▶${RST} ${DIM}${running} running${RST}` : "";
  return `${CLEAR_LINE}  ${bar}  ${DIM}${done}/${total}${RST} ${pct}%${spin}`;
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

const CONCURRENCY = 8;

const names: string[] = [];
for await (const e of Deno.readDir(CASES_DIR)) {
  if (!e.isDirectory) continue;
  if (formFlag === "1120" && !e.name.startsWith("1120-")) continue;
  if (formFlag === "1040" && e.name.startsWith("1120-")) continue;
  names.push(e.name);
}
names.sort();

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

      const result = await runCase(name);
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

const results = await runAll(names);

// ── Footer ────────────────────────────────────────────────────────────────────

write(BOT + "\n");

const pass = results.filter(r => r.ok).length;
const fail = results.length - pass;

write(`\n  ${GRN}${pass} PASS${RST}  ${RED}${fail} FAIL${RST}  ${DIM}out of ${results.length} cases  ·  green = within $5${RST}\n\n`);

if (jsonFlag) {
  const failing = results.filter(r => !r.ok).map(r => r.name);
  console.log(JSON.stringify({ total: results.length, pass, fail, failing }));
}
