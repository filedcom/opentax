import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { standard_deduction } from "./index.ts";
import { FilingStatus } from "../../../../../types.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";

const ctx: NodeContext = { taxYear: 2025, formType: "f1040" };

function compute(input: Parameters<typeof standard_deduction.compute>[1]) {
  return standard_deduction.compute(ctx, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Base standard deduction amounts ─────────────────────────────────────────

test("Single: base standard deduction $15,750", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 50_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    15_750,
  );
});

test("explicit Schedule A election files below-standard and zero deductions", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    itemized_deductions: 1_000,
    itemized_taxes: 1_000,
    force_itemized: true,
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.line12e_itemized_deductions,
    1_000,
  );
  assertEquals(
    findOutput(result, "f1040")?.fields.line12a_standard_deduction,
    undefined,
  );
  const zero = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    itemized_deductions: 0,
    itemized_taxes: 0,
    force_itemized: true,
  });
  assertEquals(
    findOutput(zero, "f1040")?.fields.line12e_itemized_deductions,
    0,
  );
});

test("MFJ: base standard deduction $31,500", () => {
  const result = compute({ filing_status: FilingStatus.MFJ, agi: 80_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    31_500,
  );
});

test("HOH: base standard deduction $23,625", () => {
  const result = compute({ filing_status: FilingStatus.HOH, agi: 50_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    23_625,
  );
});

test("MFS: base standard deduction $15,750", () => {
  const result = compute({ filing_status: FilingStatus.MFS, agi: 40_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    15_750,
  );
});

test("QSS: base standard deduction $31,500", () => {
  const result = compute({ filing_status: FilingStatus.QSS, agi: 70_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line12a_standard_deduction,
    31_500,
  );
});

test("Dependent with no earned income uses the $1,350 floor", () => {
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

test("Dependent earned income plus $450 is capped at the filing-status amount", () => {
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

test("Dependent standard deduction requires an earned-income amount", () => {
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

test("Single 65+: $15,750 + $2,000 = $17,750", () => {
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

test("Single blind: $15,750 + $2,000 = $17,750", () => {
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

test("Single 65+ and blind: $15,750 + $4,000 = $19,750", () => {
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

test("MFJ both spouses 65+: $31,500 + 2×$1,600 = $34,700", () => {
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

test("MFJ all four factors: $31,500 + 4×$1,600 = $37,900", () => {
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
test("Single: spouse flags do not add additional deduction", () => {
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

test("Taxable income = AGI − standard deduction", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 50_000 });
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals(
    (incTax!.fields as Record<string, number>).taxable_income,
    34_250,
  );
});

test("Taxable income = AGI − standard deduction − QBI deduction", () => {
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

test("Taxable income floors at 0 when deductions exceed AGI", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 5_000 });
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals((incTax!.fields as Record<string, number>).taxable_income, 0);
});

test("f1040 line15_taxable_income matches income_tax_calculation taxable_income", () => {
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

test("Schedule 1-A additional deductions reduce taxable income", () => {
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

test("Form 6251 line 1b adds back only Schedule 1-A senior deduction", () => {
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

test("Form 1116 line 3b excludes Schedule 1-A vehicle interest for line 4b", () => {
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

test("Form 6251 line 1b keeps negative income before line 15's zero floor", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 5_000 });
  const incomeTax = findOutput(result, "income_tax_calculation");
  assertEquals(incomeTax?.fields.taxable_income, 0);
  assertEquals(incomeTax?.fields.form6251_line1b, -10_750);
});

test("Form 6251 line 2a adds back the standard deduction when it wins", () => {
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

test("Form 6251 line 2a uses Schedule A line 7 when itemizing wins", () => {
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

test("Form 6251 line 2a rejects missing or impossible Schedule A line 7 for itemizers", () => {
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

test("income_tax_calculation receives filing_status", () => {
  const result = compute({ filing_status: FilingStatus.MFJ, agi: 80_000 });
  const incTax = findOutput(result, "income_tax_calculation");
  assertEquals(
    (incTax!.fields as Record<string, unknown>).filing_status,
    FilingStatus.MFJ,
  );
});

// ─── Standard vs itemized comparison ─────────────────────────────────────────

test("Takes itemized when itemized > standard", () => {
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

test("Takes standard when standard >= itemized", () => {
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

test("MFS spouse itemizing: taxpayer must itemize even if itemized is 0", () => {
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

test("Standard deduction: produces f1040 and income_tax_calculation outputs", () => {
  const result = compute({ filing_status: FilingStatus.Single, agi: 50_000 });
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  const incTaxOutputs = result.outputs.filter((o) =>
    o.nodeType === "income_tax_calculation"
  );
  // At least one f1040 output (line12a_standard_deduction + line15_taxable_income)
  assertEquals(f1040Outputs.length, 2);
  assertEquals(incTaxOutputs.length, 1);
});

test("Itemizing: produces f1040 line15 output and income_tax_calculation, no line12a", () => {
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

test("taxable income subtracts rounded Form 1040 line operands", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    agi: 502287.30,
    itemized_deductions: 43915.52,
    itemized_taxes: 28500,
  });
  const fields = result.outputs.filter((o) => o.nodeType === "f1040")
    .reduce(
      (all, o) => ({ ...all, ...o.fields }),
      {} as Record<string, unknown>,
    );
  assertEquals(fields.line12e_itemized_deductions, 43916);
  assertEquals(fields.line15_taxable_income, 458371);
  assertEquals(
    findOutput(result, "income_tax_calculation")?.fields.taxable_income,
    458371,
  );
});

// ─── TY2026 (P.L. 119-21) ────────────────────────────────────────────────────

const ctx2026: NodeContext = { taxYear: 2026, formType: "f1040" };

function f1040Fields(result: ReturnType<typeof compute>): Record<string, number> {
  return Object.assign(
    {},
    ...result.outputs.filter((o) => o.nodeType === "f1040").map((o) =>
      o.fields
    ),
  );
}

test("TY2026 MFJ non-itemizer charity is capped at $2,000 on line 12f (IRC §170(p))", () => {
  const result = standard_deduction.compute(ctx2026, {
    filing_status: FilingStatus.MFJ,
    agi: 100_000,
    nonitemizer_charitable_cash: 2_500,
  });
  const f = f1040Fields(result);
  // Rev. Proc. 2025-32 §4.14(1): $32,200.
  assertEquals(f.line12a_standard_deduction, 32_200);
  assertEquals(f.line12f_nonitemizer_charitable, 2_000);
  assertEquals(f.line15_taxable_income, 65_800);
});

test("TY2026 line 12f needs the donor-advised fund split", () => {
  assertThrows(
    () =>
      standard_deduction.compute(ctx2026, {
        filing_status: FilingStatus.Single,
        agi: 50_000,
        nonitemizer_charitable_cash_unclassified: true,
      }),
    Error,
    "donor-advised",
  );
});

test("TY2026 standard plus line 12f beats slightly larger itemized deductions", () => {
  const result = standard_deduction.compute(ctx2026, {
    filing_status: FilingStatus.Single,
    agi: 80_000,
    itemized_deductions: 16_500,
    itemized_taxes: 10_000,
    nonitemizer_charitable_cash: 1_000,
  });
  const f = f1040Fields(result);
  assertEquals(f.line12a_standard_deduction, 16_100);
  assertEquals(f.line12f_nonitemizer_charitable, 1_000);
  assertEquals(f.line15_taxable_income, 62_900);
});

test("TY2026 itemized deductions above the 37% bracket lose 2/37 (IRC §68)", () => {
  // Single top bracket starts at $640,600 (Rev. Proc. 2025-32 §4.01 Table 3);
  // AGI less the $10,000 QBI and $0 Schedule 1-A deductions is $690,000, so
  // the reduction is 2/37 x min($30,000, $49,400) = $1,622.
  const result = standard_deduction.compute(ctx2026, {
    filing_status: FilingStatus.Single,
    agi: 700_000,
    itemized_deductions: 30_000,
    itemized_taxes: 10_000,
    qbi_deduction: 10_000,
  });
  const f = f1040Fields(result);
  assertEquals(f.line12e_itemized_deductions, 28_378);
  assertEquals(f.line15_taxable_income, 661_622);
  assertEquals(
    result.finalizations?.[0].fields.overall_itemized_limit_reduction,
    1_622,
  );
});

test("TY2025 has no §68 reduction or line 12f", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 700_000,
    itemized_deductions: 30_000,
    itemized_taxes: 10_000,
    nonitemizer_charitable_cash: 1_000,
  });
  const f = f1040Fields(result);
  assertEquals(f.line12e_itemized_deductions, 30_000);
  assertEquals("line12f_nonitemizer_charitable" in f, false);
  assertEquals(result.finalizations, []);
});

// ─── Net qualified disaster loss (Form 4684 line 15) ─────────────────────────

// 2025 Instructions for Form 1040, Line 12e, Exception 5: a non-itemizer adds
// the net qualified disaster loss to the standard deduction (HOH $23,625).
test("a net qualified disaster loss increases the standard deduction", () => {
  const result = compute({
    filing_status: FilingStatus.HOH,
    agi: 33_650,
    itemized_deductions: 24_761,
    itemized_taxes: 0,
    net_qualified_disaster_loss: 2_500,
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.line12a_standard_deduction,
    26_125,
  );
  assertEquals(
    findOutput(result, "income_tax_calculation")?.fields.taxable_income,
    7_525,
  );
  // 2025 Instructions for Form 4684, Taxpayers who also file Form 6251: the
  // AMT adds back the standard deduction before the increase.
  assertEquals(
    findOutput(result, "income_tax_calculation")?.fields.form6251_line2a,
    23_625,
  );
});

test("itemizing wins only over the increased standard deduction", () => {
  const result = compute({
    filing_status: FilingStatus.HOH,
    agi: 60_000,
    itemized_deductions: 26_126,
    itemized_taxes: 5_000,
    net_qualified_disaster_loss: 2_500,
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.line12e_itemized_deductions,
    26_126,
  );
});
