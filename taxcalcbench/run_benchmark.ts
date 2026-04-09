#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run
/**
 * run_benchmark.ts — Run all cases through the tax engine and compare to correct values.
 * Run: deno run --allow-read --allow-write --allow-run taxcalcbench/run_benchmark.ts
 */

import { dirname, fromFileUrl, join } from "@std/path";

const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const TAX_DIR    = join(SCRIPT_DIR, "..");
const CASES_DIR  = join(SCRIPT_DIR, "cases");

const RED = "\x1b[0;31m", GRN = "\x1b[0;32m", YEL = "\x1b[0;33m", DIM = "\x1b[2m", RST = "\x1b[0m";
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

const COL = "\x1b[2m│\x1b[0m";

function fmtCell(eng: number, cor: number): string {
  const s = Math.round(eng).toString().padStart(10);
  return Math.abs(eng - cor) <= 5 ? `${GRN}${s}${RST}` : `${RED}${s}${RST}`;
}

const names: string[] = [];
for await (const e of Deno.readDir(CASES_DIR)) {
  if (e.isDirectory) names.push(e.name);
}
names.sort();

const CONCURRENCY = 8;

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

  const c      = correct.correct;
  const ok = Math.abs(engTax - c.line24_total_tax) <= 5 &&
             Math.abs(engRef - c.line35a_refund)    <= 5 &&
             Math.abs(engOwe - c.line37_amount_owed) <= 5;

  return { name, engAgi, engTi, engTax, engPay, engRef, engOwe, correct: c, ok };
}

function fmtRow(r: CaseResult): string {
  return COL + " " + r.name.padEnd(36) +
    COL + fmtCell(r.engAgi, r.correct.line11_agi)            +
    COL + fmtCell(r.engTi,  r.correct.line15_taxable_income) +
    COL + fmtCell(r.engTax, r.correct.line24_total_tax)      +
    COL + fmtCell(r.engPay, r.correct.line33_total_payments) +
    COL + fmtCell(r.engRef, r.correct.line35a_refund)        +
    COL + fmtCell(r.engOwe, r.correct.line37_amount_owed)    +
    COL + ` ${r.ok ? `${GRN}PASS${RST}` : `${RED}FAIL${RST}`}`;
}

function statusLine(done: number, total: number, running: string[]): string {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const bar = `[${done}/${total}] ${pct}%`;
  const active = running.length > 0
    ? `  ${YEL}▶${RST} ${DIM}${running.length} running${RST}`
    : "";
  return `${CLEAR_LINE}${bar}${active}`;
}

const encoder = new TextEncoder();
const write = (s: string) => Deno.stderr.writeSync(encoder.encode(s));

async function runWithConcurrency(caseNames: string[], limit: number): Promise<CaseResult[]> {
  const results: CaseResult[] = [];
  const running = new Set<string>();
  let idx = 0;
  let done = 0;
  const total = caseNames.length;

  const W = 38 + 11*6 + 6 + 2; // col widths + separators
  const DIV = "─".repeat(W);
  const hdr = (s: string, w: number) => s.padStart(w);

  // Print header before results start streaming
  console.log();
  console.log(
    COL + " " + "Case".padEnd(36) +
    COL + hdr("AGI", 10) +
    COL + hdr("Taxable", 10) +
    COL + hdr("TotalTax", 10) +
    COL + hdr("Payments", 10) +
    COL + hdr("Refund", 10) +
    COL + hdr("Owed", 10) +
    COL + " Result"
  );
  console.log(DIV);

  write(statusLine(0, total, []));

  async function worker() {
    while (idx < caseNames.length) {
      const i = idx++;
      const name = caseNames[i];
      running.add(name);
      write(statusLine(done, total, [...running].sort()));

      const result = await runCase(name);
      running.delete(name);
      done++;

      if (result) {
        results.push(result);
        // Clear status line, print result row, then reprint status
        write(CLEAR_LINE);
        console.log(fmtRow(result));
      }
      write(statusLine(done, total, [...running].sort()));
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  write(CLEAR_LINE); // clear final status line
  return results;
}

const results = await runWithConcurrency(names, CONCURRENCY);

let pass = 0, fail = 0;
for (const r of results) { if (r.ok) pass++; else fail++; }
const total = results.length;

console.log("\n" + "─".repeat(38 + 11*6 + 6 + 2));
console.log(`Results: ${GRN}${pass} PASS${RST}  ${RED}${fail} FAIL${RST}  out of ${total} cases`);
console.log(`Green = within $5 of correct value.  Red = engine differs from expected.\n`);
