import { assertEquals, assertAlmostEquals } from "@std/assert";
import { assertThrows } from "@std/assert";
import { income_tax_calculation, inputSchema } from "./index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form6251 } from "../form6251/index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { FilingStatus } from "../../types.ts";

function compute(input: Record<string, unknown>) {
  return income_tax_calculation.compute({ taxYear: 2025 }, inputSchema.parse(input));
}

function f1040Fields(result: ReturnType<typeof compute>) {
  return fieldsOf(result.outputs, f1040);
}

function f6251Fields(result: ReturnType<typeof compute>) {
  return fieldsOf(result.outputs, form6251);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — missing required fields throws", () => {
  assertThrows(() => inputSchema.parse({}));
});

Deno.test("smoke — zero taxable income returns no outputs", () => {
  const result = compute({ taxable_income: 0, filing_status: FilingStatus.Single });
  assertEquals(result.outputs.length, 0);
});

// ─── Bracket Computation ─────────────────────────────────────────────────────

Deno.test("Single — $50,000 taxable income (22% bracket)", () => {
  // Tax = $5,578.50 + ($50,000 − $48,475) × 22% = $5,578.50 + $335.50 = $5,914.00
  const result = compute({ taxable_income: 50_000, filing_status: FilingStatus.Single });
  assertAlmostEquals(f1040Fields(result)?.line16_income_tax as number, 5_914, 1);
});

Deno.test("MFJ — $100,000 taxable income (22% bracket)", () => {
  // Tax = $11,157 + ($100,000 − $96,950) × 22% = $11,157 + $671 = $11,828
  const result = compute({ taxable_income: 100_000, filing_status: FilingStatus.MFJ });
  assertAlmostEquals(f1040Fields(result)?.line16_income_tax as number, 11_828, 1);
});

Deno.test("MFS — $50,000 taxable income (22% bracket)", () => {
  // MFS lower brackets match Single at this income: $5,914
  const result = compute({ taxable_income: 50_000, filing_status: FilingStatus.MFS });
  assertAlmostEquals(f1040Fields(result)?.line16_income_tax as number, 5_914, 1);
});

Deno.test("HOH — $70,000 taxable income (22% bracket)", () => {
  // Tax = $7,442 + ($70,000 − $64,850) × 22% = $7,442 + $1,133 = $8,575
  const result = compute({ taxable_income: 70_000, filing_status: FilingStatus.HOH });
  assertAlmostEquals(f1040Fields(result)?.line16_income_tax as number, 8_575, 1);
});

Deno.test("QSS — $100,000 uses MFJ brackets", () => {
  // QSS = MFJ brackets → same as MFJ at $100,000 = $11,828
  const result = compute({ taxable_income: 100_000, filing_status: FilingStatus.QSS });
  assertAlmostEquals(f1040Fields(result)?.line16_income_tax as number, 11_828, 1);
});

// ─── Bracket Boundaries ───────────────────────────────────────────────────────

Deno.test("Single — at 10% ceiling ($11,925) → 10% only", () => {
  // Tax = $11,925 × 10% = $1,192.50
  const result = compute({ taxable_income: 11_925, filing_status: FilingStatus.Single });
  assertAlmostEquals(f1040Fields(result)?.line16_income_tax as number, 1_192.50, 1);
});

Deno.test("Single — $1 into 12% bracket ($11,926)", () => {
  // Tax = $1,192.50 + $1 × 12% = $1,192.62
  const result = compute({ taxable_income: 11_926, filing_status: FilingStatus.Single });
  assertAlmostEquals(f1040Fields(result)?.line16_income_tax as number, 1_192.62, 0.5);
});

// ─── High Income ──────────────────────────────────────────────────────────────

Deno.test("Single — $700,000 (37% bracket)", () => {
  // Tax = $188,769.75 + ($700,000 − $626,350) × 37%
  // = $188,769.75 + $27,250.50 = $216,020.25
  const result = compute({ taxable_income: 700_000, filing_status: FilingStatus.Single });
  assertAlmostEquals(f1040Fields(result)?.line16_income_tax as number, 216_020.25, 1);
});

Deno.test("MFS — $400,000 (37% bracket, MFS-specific split at $375,800)", () => {
  // Tax = $101,077.25 + ($400,000 − $375,800) × 37%
  // = $101,077.25 + $8,954 = $110,031.25
  const result = compute({ taxable_income: 400_000, filing_status: FilingStatus.MFS });
  assertAlmostEquals(f1040Fields(result)?.line16_income_tax as number, 110_031.25, 1);
});

Deno.test("HOH — $650,000 (37% bracket)", () => {
  // Tax = $187,031.50 + ($650,000 − $626,350) × 37%
  // = $187,031.50 + $8,750.50 = $195,782.00
  const result = compute({ taxable_income: 650_000, filing_status: FilingStatus.HOH });
  assertAlmostEquals(f1040Fields(result)?.line16_income_tax as number, 195_782, 1);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("routes line16_income_tax to f1040", () => {
  const result = compute({ taxable_income: 50_000, filing_status: FilingStatus.Single });
  const fields = f1040Fields(result);
  assertEquals(fields !== undefined, true);
  assertEquals("line16_income_tax" in (fields ?? {}), true);
});

Deno.test("routes regular_tax, regular_tax_income, filing_status to form6251", () => {
  const result = compute({ taxable_income: 50_000, filing_status: FilingStatus.Single });
  const fields = f6251Fields(result);
  assertEquals(fields !== undefined, true);
  assertAlmostEquals(fields?.regular_tax as number, 5_914, 1);
  assertEquals(fields?.regular_tax_income, 50_000);
  assertEquals(fields?.filing_status, FilingStatus.Single);
});

Deno.test("tax amounts agree between f1040 and form6251 outputs", () => {
  const result = compute({ taxable_income: 100_000, filing_status: FilingStatus.MFJ });
  assertEquals(f1040Fields(result)?.line16_income_tax, f6251Fields(result)?.regular_tax);
});

// ─── Small Income ─────────────────────────────────────────────────────────────

Deno.test("$1 taxable income — 10% bracket", () => {
  const result = compute({ taxable_income: 1, filing_status: FilingStatus.Single });
  assertAlmostEquals(f1040Fields(result)?.line16_income_tax as number, 0.10, 0.01);
});

// ─── Unknown Tax Year ─────────────────────────────────────────────────────────

Deno.test("unknown tax year throws with year in message", () => {
  assertThrows(
    () => income_tax_calculation.compute({ taxYear: 9999 }, inputSchema.parse({ taxable_income: 50_000, filing_status: FilingStatus.Single })),
    Error,
    "No tax brackets for year 9999",
  );
});
