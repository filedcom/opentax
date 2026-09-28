import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema, standard_deduction } from "./index.ts";
import { FilingStatus } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

const ctx: NodeContext = { taxYear: 2025, formType: "f1040" };

function compute(input: Parameters<typeof standard_deduction.compute>[1]) {
  return standard_deduction.compute(ctx, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Base standard deduction amounts ─────────────────────────────────────────

Deno.test("Single: base standard deduction $15,750", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 50_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    15_750,
  );
});

Deno.test("MFJ: base standard deduction $31,500", () => {
  const result = compute({ filing_status: FilingStatus.MFJ, agi: 80_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    31_500,
  );
});

Deno.test("HOH: base standard deduction $23,625", () => {
  const result = compute({ filing_status: FilingStatus.HOH, agi: 50_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    23_625,
  );
});

Deno.test("MFS: base standard deduction $15,750", () => {
  const result = compute({ filing_status: FilingStatus.MFS, agi: 40_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    15_750,
  );
});

Deno.test("QSS: base standard deduction $31,500", () => {
  const result = compute({ filing_status: FilingStatus.QSS, agi: 70_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    31_500,
  );
});

Deno.test("Dependent with no earned income uses the $1,350 floor", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 5_000,
    taxpayer_can_be_claimed_as_dependent: true,
    dependent_earned_income: 0,
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.line12a_standard_deduction,
    1_350,
  );
});

Deno.test("Dependent earned income plus $450 is capped at the filing-status amount", () => {
  const belowCap = compute({
    filing_status: FilingStatus.Single,
    agi: 5_000,
    taxpayer_can_be_claimed_as_dependent: true,
    dependent_earned_income: 1_000,
  });
  assertEquals(
    findOutput(belowCap, "f1040")?.fields.line12a_standard_deduction,
    1_450,
  );
  const capped = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    taxpayer_can_be_claimed_as_dependent: true,
    dependent_earned_income: 20_000,
  });
  assertEquals(
    findOutput(capped, "f1040")?.fields.line12a_standard_deduction,
    15_750,
  );
});

Deno.test("Dependent standard deduction requires an earned-income amount", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.Single,
        agi: 5_000,
        taxpayer_can_be_claimed_as_dependent: true,
      }),
    Error,
    "earned income",
  );
});

// ─── Additional deduction for age/blindness ───────────────────────────────────

Deno.test("Single 65+: $15,750 + $2,000 = $17,750", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    taxpayer_age_65_or_older: true,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    17_750,
  );
});

Deno.test("Single blind: $15,750 + $2,000 = $17,750", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    taxpayer_blind: true,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    17_750,
  );
});

Deno.test("Single 65+ and blind: $15,750 + $4,000 = $19,750", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    taxpayer_age_65_or_older: true,
    taxpayer_blind: true,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    19_750,
  );
});

Deno.test("MFJ both spouses 65+: $31,500 + 2×$1,600 = $34,700", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    agi: 80_000,
    taxpayer_age_65_or_older: true,
    spouse_age_65_or_older: true,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    34_700,
  );
});

Deno.test("MFJ all four factors: $31,500 + 4×$1,600 = $37,900", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    agi: 80_000,
    taxpayer_age_65_or_older: true,
    taxpayer_blind: true,
    spouse_age_65_or_older: true,
    spouse_blind: true,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    37_900,
  );
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
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    15_750,
  );
});

// ─── Taxable income routing ───────────────────────────────────────────────────

Deno.test("Taxable income = AGI − standard deduction", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 50_000 });
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals(
    (incTax!.fields as Record<string, number>).taxable_income,
    34_250,
  );
});

Deno.test("Taxable income = AGI − standard deduction − QBI deduction", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 60_000,
    qbi_deduction: 5_000,
  });
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals(
    (incTax!.fields as Record<string, number>).taxable_income,
    39_250,
  );
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
  assertEquals(
    line15,
    (incTax!.fields as Record<string, number>).taxable_income,
  );
});

Deno.test("Schedule 1-A additional deductions reduce taxable income", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 30_000,
    additional_deductions: 5_000,
  });
  const f1040Output = result.outputs.find((output) =>
    output.nodeType === "f1040" &&
    output.fields.line15_taxable_income !== undefined
  );
  const taxOutput = findOutput(result, "income_tax_calculation");
  assertEquals(f1040Output?.fields.line15_taxable_income, 9_250);
  assertEquals(taxOutput?.fields.taxable_income, 9_250);
});

Deno.test("Form 6251 line 1b adds back only Schedule 1-A senior deduction", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 30_000,
    additional_deductions: 8_000,
    enhanced_senior_deduction: 6_000,
  });
  const incomeTax = findOutput(result, "income_tax_calculation");
  assertEquals(incomeTax?.fields.taxable_income, 6_250);
  assertEquals(incomeTax?.fields.form6251_line1b, 12_250);
  assertEquals(
    findOutput(result, "form_1116")?.fields.enhanced_senior_deduction,
    6_000,
  );
  assertEquals(findOutput(result, "form_1116")?.fields.other_deductions, 2_000);
  assertEquals(
    findOutput(result, "form_1116")?.fields.general_deductions,
    17_750,
  );
});

Deno.test("Form 1116 line 3b excludes Schedule 1-A vehicle interest for line 4b", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    additional_deductions: 3_250,
    qualified_vehicle_loan_interest_deduction: 3_250,
  });
  const foreignCredit = findOutput(result, "form_1116");
  assertEquals(foreignCredit?.fields.other_deductions, 0);
  assertEquals(foreignCredit?.fields.general_deductions, 15_750);
  assertEquals(
    foreignCredit?.fields.qualified_vehicle_loan_interest_deduction,
    3_250,
  );
});

Deno.test("Form 6251 line 1b keeps negative income before line 15's zero floor", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 5_000 });
  const incomeTax = findOutput(result, "income_tax_calculation");
  assertEquals(incomeTax?.fields.taxable_income, 0);
  assertEquals(incomeTax?.fields.form6251_line1b, -10_750);
});

Deno.test("Form 6251 line 2a adds back the standard deduction when it wins", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    itemized_deductions: 10_000,
    itemized_taxes: 8_000,
  });
  assertEquals(
    findOutput(result, "income_tax_calculation")?.fields.form6251_line2a,
    15_750,
  );
});

Deno.test("Form 6251 line 2a uses Schedule A line 7 when itemizing wins", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    itemized_deductions: 25_000,
    itemized_taxes: 8_000,
  });
  assertEquals(
    findOutput(result, "income_tax_calculation")?.fields.form6251_line2a,
    8_000,
  );
});

Deno.test("Form 6251 line 2a rejects missing or impossible Schedule A line 7 for itemizers", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.Single,
        agi: 50_000,
        itemized_deductions: 25_000,
      }),
    Error,
    "needs reconciled Schedule A line 7 taxes",
  );
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.Single,
        agi: 50_000,
        itemized_deductions: 25_000,
        itemized_taxes: 26_000,
      }),
    Error,
    "needs reconciled Schedule A line 7 taxes",
  );
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.MFS,
        agi: 50_000,
        mfs_spouse_itemizing: true,
      }),
    Error,
    "needs reconciled Schedule A line 7 taxes",
  );
});

Deno.test("income_tax_calculation receives filing_status", () => {
  const result = compute({ filing_status: FilingStatus.MFJ, agi: 80_000 });
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals(
    (incTax!.fields as Record<string, unknown>).filing_status,
    FilingStatus.MFJ,
  );
});

// ─── Standard vs itemized comparison ─────────────────────────────────────────

Deno.test("Takes itemized when itemized > standard", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 100_000,
    itemized_deductions: 25_000,
    itemized_taxes: 0,
  });
  const f1040 = findOutput(result, "f1040");
  // Should NOT have line12a_standard_deduction
  assertEquals(
    (f1040!.fields as Record<string, unknown>).line12a_standard_deduction,
    undefined,
  );
  assertEquals(f1040?.fields.line12e_itemized_deductions, 25_000);
  // Taxable income uses itemized amount
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals(
    (incTax!.fields as Record<string, number>).taxable_income,
    75_000,
  );
});

Deno.test("Takes standard when standard >= itemized", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 60_000,
    itemized_deductions: 10_000, // less than $15,750 standard
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    15_750,
  );
  assertEquals(f1040?.fields.line12e_itemized_deductions, undefined);
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals(
    (incTax!.fields as Record<string, number>).taxable_income,
    44_250,
  );
});

// ─── MFS spouse itemizing rule ────────────────────────────────────────────────

Deno.test("MFS spouse itemizing: taxpayer must itemize even if itemized is 0", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    agi: 50_000,
    mfs_spouse_itemizing: true,
    // Explicit Schedule A line 7 zero is still required for Form 6251.
    itemized_taxes: 0,
  });
  const f1040 = findOutput(result, "f1040");
  // No standard deduction line (must itemize)
  assertEquals(
    (f1040!.fields as Record<string, unknown>).line12a_standard_deduction,
    undefined,
  );
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals(
    (incTax!.fields as Record<string, number>).taxable_income,
    50_000,
  );
});

// ─── Output structure ─────────────────────────────────────────────────────────

Deno.test("Standard deduction: produces f1040 and income_tax_calculation outputs", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 50_000 });
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  const incTaxOutputs = result.outputs.filter((o) =>
    o.nodeType === "income_tax_calculation"
  );
  // At least one f1040 output (line12a_standard_deduction + line15_taxable_income)
  assertEquals(f1040Outputs.length, 2);
  assertEquals(incTaxOutputs.length, 1);
});

Deno.test("Itemizing: produces f1040 line15 output and income_tax_calculation, no line12a", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 100_000,
    itemized_deductions: 20_000,
    itemized_taxes: 0,
  });
  const f1040Out = result.outputs.filter((o) => o.nodeType === "f1040");
  const hasLine12a = f1040Out.some(
    (o) =>
      (o.fields as Record<string, unknown>).line12a_standard_deduction !==
        undefined,
  );
  assertEquals(hasLine12a, false);
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals(
    (incTax!.fields as Record<string, number>).taxable_income,
    80_000,
  );
});
