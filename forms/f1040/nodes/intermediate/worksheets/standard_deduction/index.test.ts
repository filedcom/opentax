import { assertEquals } from "@std/assert";
import { standard_deduction, inputSchema } from "./index.ts";
import { FilingStatus } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

const ctx: NodeContext = { taxYear: 2025 };

function compute(input: Parameters<typeof standard_deduction.compute>[1]) {
  return standard_deduction.compute(ctx, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Base standard deduction amounts ─────────────────────────────────────────

Deno.test("Single: base standard deduction $15,000", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 50_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line12a_standard_deduction, 15_000);
});

Deno.test("MFJ: base standard deduction $30,000", () => {
  const result = compute({ filing_status: FilingStatus.MFJ, agi: 80_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line12a_standard_deduction, 30_000);
});

Deno.test("HOH: base standard deduction $22,500", () => {
  const result = compute({ filing_status: FilingStatus.HOH, agi: 50_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line12a_standard_deduction, 22_500);
});

Deno.test("MFS: base standard deduction $15,000", () => {
  const result = compute({ filing_status: FilingStatus.MFS, agi: 40_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line12a_standard_deduction, 15_000);
});

Deno.test("QSS: base standard deduction $30,000", () => {
  const result = compute({ filing_status: FilingStatus.QSS, agi: 70_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line12a_standard_deduction, 30_000);
});

// ─── Additional deduction for age/blindness ───────────────────────────────────

Deno.test("Single 65+: $15,000 + $2,000 = $17,000", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    taxpayer_age_65_or_older: true,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line12a_standard_deduction, 17_000);
});

Deno.test("Single blind: $15,000 + $2,000 = $17,000", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    taxpayer_blind: true,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line12a_standard_deduction, 17_000);
});

Deno.test("Single 65+ and blind: $15,000 + $4,000 = $19,000", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    taxpayer_age_65_or_older: true,
    taxpayer_blind: true,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line12a_standard_deduction, 19_000);
});

Deno.test("MFJ both spouses 65+: $30,000 + 2×$1,600 = $33,200", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    agi: 80_000,
    taxpayer_age_65_or_older: true,
    spouse_age_65_or_older: true,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line12a_standard_deduction, 33_200);
});

Deno.test("MFJ all four factors: $30,000 + 4×$1,600 = $36,400", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    agi: 80_000,
    taxpayer_age_65_or_older: true,
    taxpayer_blind: true,
    spouse_age_65_or_older: true,
    spouse_blind: true,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line12a_standard_deduction, 36_400);
});

// Spouse flags should be ignored for Single filers
Deno.test("Single: spouse flags do not add additional deduction", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    spouse_age_65_or_older: true,
    spouse_blind: true,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line12a_standard_deduction, 15_000);
});

// ─── Taxable income routing ───────────────────────────────────────────────────

Deno.test("Taxable income = AGI − standard deduction", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 50_000 });
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals((incTax!.fields as Record<string, number>).taxable_income, 35_000);
});

Deno.test("Taxable income = AGI − standard deduction − QBI deduction", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 60_000,
    qbi_deduction: 5_000,
  });
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals((incTax!.fields as Record<string, number>).taxable_income, 40_000);
});

Deno.test("Taxable income floors at 0 when deductions exceed AGI", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 5_000 });
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals((incTax!.fields as Record<string, number>).taxable_income, 0);
});

Deno.test("f1040 line15_taxable_income matches income_tax_calculation taxable_income", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 50_000 });
  // Two f1040 outputs: line12a in first, line15 in second
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  const line15 = f1040Outputs
    .map((o) => (o.fields as Record<string, number>).line15_taxable_income)
    .find((v) => v !== undefined);
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals(line15, (incTax!.fields as Record<string, number>).taxable_income);
});

Deno.test("income_tax_calculation receives filing_status", () => {
  const result = compute({ filing_status: FilingStatus.MFJ, agi: 80_000 });
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals((incTax!.fields as Record<string, unknown>).filing_status, FilingStatus.MFJ);
});

// ─── Standard vs itemized comparison ─────────────────────────────────────────

Deno.test("Takes itemized when itemized > standard", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 100_000,
    itemized_deductions: 25_000,
  });
  const f1040 = findOutput(result, "f1040");
  // Should NOT have line12a_standard_deduction
  assertEquals((f1040!.fields as Record<string, unknown>).line12a_standard_deduction, undefined);
  // Taxable income uses itemized amount
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals((incTax!.fields as Record<string, number>).taxable_income, 75_000);
});

Deno.test("Takes standard when standard >= itemized", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 60_000,
    itemized_deductions: 10_000, // less than $15,000 standard
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line12a_standard_deduction, 15_000);
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals((incTax!.fields as Record<string, number>).taxable_income, 45_000);
});

// ─── MFS spouse itemizing rule ────────────────────────────────────────────────

Deno.test("MFS spouse itemizing: taxpayer must itemize even if itemized is 0", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    agi: 50_000,
    mfs_spouse_itemizing: true,
    // No itemized_deductions provided
  });
  const f1040 = findOutput(result, "f1040");
  // No standard deduction line (must itemize)
  assertEquals((f1040!.fields as Record<string, unknown>).line12a_standard_deduction, undefined);
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals((incTax!.fields as Record<string, number>).taxable_income, 50_000);
});

// ─── Output structure ─────────────────────────────────────────────────────────

Deno.test("Standard deduction: produces 2 outputs (f1040 line12a + f1040 line15 merged, income_tax_calculation)", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 50_000 });
  // f1040 gets two calls but OutputNodes may merge — check nodeType counts
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  const incTaxOutputs = result.outputs.filter((o) => o.nodeType === "income_tax_calculation");
  assertEquals(f1040Outputs.length >= 1, true);
  assertEquals(incTaxOutputs.length, 1);
});

Deno.test("Itemizing: produces f1040 line15 output and income_tax_calculation, no line12a", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 100_000,
    itemized_deductions: 20_000,
  });
  const f1040Out = result.outputs.filter((o) => o.nodeType === "f1040");
  const hasLine12a = f1040Out.some(
    (o) => (o.fields as Record<string, unknown>).line12a_standard_deduction !== undefined,
  );
  assertEquals(hasLine12a, false);
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals((incTax!.fields as Record<string, number>).taxable_income, 80_000);
});
