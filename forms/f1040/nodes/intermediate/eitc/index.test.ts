import { assertEquals } from "@std/assert";
import { eitc } from "./index.ts";
import { FilingStatus } from "../../types.ts";

function compute(input: Record<string, unknown>) {
  return eitc.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── No Income — No Credit ────────────────────────────────────────────────────

Deno.test("no earned income → no EITC", () => {
  const result = compute({ earned_income: 0, qualifying_children: 0, filing_status: FilingStatus.Single });
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ─── Investment Income Disqualifier ──────────────────────────────────────────

Deno.test("investment income above limit → no EITC", () => {
  const result = compute({
    earned_income: 20_000,
    agi: 20_000,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
    investment_income: 11_951,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("investment income at limit → still eligible", () => {
  const result = compute({
    earned_income: 20_000,
    agi: 20_000,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
    investment_income: 11_950,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
});

// ─── Zero Children ────────────────────────────────────────────────────────────

Deno.test("no children single — earned income in phase-in range", () => {
  // $5,000 × 7.65% = $382.50 → rounded to $383
  const result = compute({
    earned_income: 5_000,
    agi: 5_000,
    qualifying_children: 0,
    filing_status: FilingStatus.Single,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(typeof out?.fields.line27_eitc, "number");
  const credit = out?.fields.line27_eitc as number;
  assertEquals(credit > 0 && credit <= 649, true);
});

Deno.test("no children single — at max credit income", () => {
  // $8,490 × 7.65% ≈ $649
  const result = compute({
    earned_income: 8_490,
    agi: 8_490,
    qualifying_children: 0,
    filing_status: FilingStatus.Single,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line27_eitc, 649);
});

Deno.test("no children single — income above limit → no credit", () => {
  const result = compute({
    earned_income: 18_591,
    agi: 18_591,
    qualifying_children: 0,
    filing_status: FilingStatus.Single,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ─── One Child ────────────────────────────────────────────────────────────────

Deno.test("1 child single — at max credit", () => {
  const result = compute({
    earned_income: 12_730,
    agi: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line27_eitc, 4_328);
});

Deno.test("1 child MFJ — higher phaseout threshold applies", () => {
  // At $40,000 AGI — should still have credit (limit is $56,004 for MFJ 1 child)
  const result = compute({
    earned_income: 20_000,
    agi: 40_000,
    qualifying_children: 1,
    filing_status: FilingStatus.MFJ,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
});

Deno.test("1 child single — income above limit → no credit", () => {
  const result = compute({
    earned_income: 49_084,
    agi: 49_084,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ─── Two Children ─────────────────────────────────────────────────────────────

Deno.test("2 children single — at max credit", () => {
  const result = compute({
    earned_income: 17_880,
    agi: 17_880,
    qualifying_children: 2,
    filing_status: FilingStatus.Single,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line27_eitc, 7_152);
});

// ─── Three Children ───────────────────────────────────────────────────────────

Deno.test("3 children — max credit is $8,046", () => {
  const result = compute({
    earned_income: 17_880,
    agi: 17_880,
    qualifying_children: 3,
    filing_status: FilingStatus.Single,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line27_eitc, 8_046);
});

// ─── Phaseout ────────────────────────────────────────────────────────────────

Deno.test("1 child single — phaseout reduces credit", () => {
  // At $30,000 earned — within phaseout range ($21,560 to $49,084 for single/1 child)
  const resultLow = compute({
    earned_income: 21_560,
    agi: 21_560,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  });
  const resultHigh = compute({
    earned_income: 30_000,
    agi: 30_000,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  });
  const creditLow = (findOutput(resultLow, "f1040")?.fields.line27_eitc as number) ?? 0;
  const creditHigh = (findOutput(resultHigh, "f1040")?.fields.line27_eitc as number) ?? 0;
  assertEquals(creditLow > creditHigh, true);
});

// ─── MFJ — Joint Threshold ────────────────────────────────────────────────────

Deno.test("MFJ 0 children — higher income limit than single", () => {
  // $19,000 AGI exceeds single limit ($18,591) but well below MFJ limit ($25,511)
  const resultSingle = compute({
    earned_income: 19_000,
    agi: 19_000,
    qualifying_children: 0,
    filing_status: FilingStatus.Single,
  });
  const resultMFJ = compute({
    earned_income: 19_000,
    agi: 19_000,
    qualifying_children: 0,
    filing_status: FilingStatus.MFJ,
  });
  assertEquals(findOutput(resultSingle, "f1040"), undefined);
  assertEquals(findOutput(resultMFJ, "f1040") !== undefined, true);
});

// ─── Output Goes to f1040 line27 ─────────────────────────────────────────────

Deno.test("output routes to f1040 line27_eitc", () => {
  const result = compute({
    earned_income: 15_000,
    agi: 15_000,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals("line27_eitc" in (out?.fields ?? {}), true);
});

// ─── Smoke Test ───────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});
