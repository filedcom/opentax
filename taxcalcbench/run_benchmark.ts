#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run
/**
 * run_benchmark.ts — Run all cases through the tax engine and compare to correct values.
 * Run: deno run --allow-read --allow-write --allow-run taxcalcbench/run_benchmark.ts
 */

import { dirname, fromFileUrl, join } from "@std/path";

const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const TAX_DIR    = join(SCRIPT_DIR, "..");
const CASES_DIR  = join(SCRIPT_DIR, "cases");

const RED = "\x1b[0;31m", GRN = "\x1b[0;32m", RST = "\x1b[0m";

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

function fmtCell(eng: number, cor: number): string {
  const s = Math.round(eng).toString().padStart(12);
  return Math.abs(eng - cor) <= 5 ? `${GRN}${s}${RST}` : `${RED}${s}${RST}`;
}

const names: string[] = [];
for await (const e of Deno.readDir(CASES_DIR)) {
  if (e.isDirectory) names.push(e.name);
}
names.sort();

let pass = 0, fail = 0, total = 0;

console.log();
console.log(`${"Case".padEnd(30)} ${"AGI".padStart(12)} ${"Taxable".padStart(12)} ${"TotalTax".padStart(12)} ${"Payments".padStart(12)} ${"Refund".padStart(12)} ${"Owed".padStart(12)}`);
console.log("─".repeat(108));

for (const name of names) {
  const caseDir     = join(CASES_DIR, name);
  const inputFile   = join(caseDir, "input.json");
  const correctFile = join(caseDir, "correct.json");
  try { await Deno.stat(inputFile); await Deno.stat(correctFile); } catch { continue; }

  total++;
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

  if (ok) pass++; else fail++;

  console.log(
    name.padEnd(30) +
    fmtCell(engAgi, c.line11_agi)            +
    fmtCell(engTi,  c.line15_taxable_income) +
    fmtCell(engTax, c.line24_total_tax)      +
    fmtCell(engPay, c.line33_total_payments) +
    fmtCell(engRef, c.line35a_refund)        +
    fmtCell(engOwe, c.line37_amount_owed)    +
    `  ${ok ? `${GRN}PASS${RST}` : `${RED}FAIL${RST}`}`,
  );
}

console.log("\n" + "─".repeat(66));
console.log(`Results: ${GRN}${pass} PASS${RST}  ${RED}${fail} FAIL${RST}  out of ${total} cases`);
console.log(`Green = within $5 of correct value.  Red = engine differs from expected.\n`);
