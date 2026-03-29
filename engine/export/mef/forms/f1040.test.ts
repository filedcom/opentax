import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS1040 } from "./f1040.ts";

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(
    actual.includes(expected),
    false,
    `Expected string NOT to include: ${expected}`,
  );
}

// ─── Section 1: Empty input ──────────────────────────────────────────────────

Deno.test("empty object returns empty string", () => {
  assertEquals(buildIRS1040({}), "");
});

// ─── Section 2: Unknown keys ignored ─────────────────────────────────────────

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(buildIRS1040({ unknown_field: 999, foo: 123, bar: "baz" }), "");
});

// ─── Section 3: Zero value emitted ───────────────────────────────────────────

Deno.test("line1a_wages zero emits WagesAmt zero", () => {
  const result = buildIRS1040({ line1a_wages: 0 });
  assertStringIncludes(result, "<WagesAmt>0</WagesAmt>");
});

Deno.test("line25a_w2_withheld zero emits WithholdingTaxAmt zero", () => {
  const result = buildIRS1040({ line25a_w2_withheld: 0 });
  assertStringIncludes(result, "<WithholdingTaxAmt>0</WithholdingTaxAmt>");
});

Deno.test("line38_amount_paid_extension zero emits AmountPaidWithExtensionAmt zero", () => {
  const result = buildIRS1040({ line38_amount_paid_extension: 0 });
  assertStringIncludes(result, "<AmountPaidWithExtensionAmt>0</AmountPaidWithExtensionAmt>");
});

// ─── Section 4: Per-field mapping ────────────────────────────────────────────

Deno.test("line1a_wages maps to WagesAmt", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertStringIncludes(result, "<WagesAmt>50000</WagesAmt>");
});

Deno.test("line1e_taxable_dep_care maps to TaxableDependentCareExpnsesAmt", () => {
  const result = buildIRS1040({ line1e_taxable_dep_care: 3000 });
  assertStringIncludes(result, "<TaxableDependentCareExpnsesAmt>3000</TaxableDependentCareExpnsesAmt>");
});

Deno.test("line1i_combat_pay maps to CombatPayElectionAmt", () => {
  const result = buildIRS1040({ line1i_combat_pay: 1200 });
  assertStringIncludes(result, "<CombatPayElectionAmt>1200</CombatPayElectionAmt>");
});

Deno.test("line2a_tax_exempt maps to TaxExemptInterestAmt", () => {
  const result = buildIRS1040({ line2a_tax_exempt: 500 });
  assertStringIncludes(result, "<TaxExemptInterestAmt>500</TaxExemptInterestAmt>");
});

Deno.test("line3a_qualified_dividends maps to QualifiedDividendsAmt", () => {
  const result = buildIRS1040({ line3a_qualified_dividends: 1500 });
  assertStringIncludes(result, "<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>");
});

Deno.test("line4a_ira_gross maps to TotalIRADistributionsAmt", () => {
  const result = buildIRS1040({ line4a_ira_gross: 20000 });
  assertStringIncludes(result, "<TotalIRADistributionsAmt>20000</TotalIRADistributionsAmt>");
});

Deno.test("line4b_ira_taxable maps to TaxableIRADistributionsAmt", () => {
  const result = buildIRS1040({ line4b_ira_taxable: 18000 });
  assertStringIncludes(result, "<TaxableIRADistributionsAmt>18000</TaxableIRADistributionsAmt>");
});

Deno.test("line5a_pension_gross maps to TotalPensionsAndAnnuitiesAmt", () => {
  const result = buildIRS1040({ line5a_pension_gross: 24000 });
  assertStringIncludes(result, "<TotalPensionsAndAnnuitiesAmt>24000</TotalPensionsAndAnnuitiesAmt>");
});

Deno.test("line5b_pension_taxable maps to TaxablePensionsAndAnnuitiesAmt", () => {
  const result = buildIRS1040({ line5b_pension_taxable: 22000 });
  assertStringIncludes(result, "<TaxablePensionsAndAnnuitiesAmt>22000</TaxablePensionsAndAnnuitiesAmt>");
});

Deno.test("line25a_w2_withheld maps to WithholdingTaxAmt", () => {
  const result = buildIRS1040({ line25a_w2_withheld: 8000 });
  assertStringIncludes(result, "<WithholdingTaxAmt>8000</WithholdingTaxAmt>");
});

Deno.test("line25b_withheld_1099 maps to Form1099WithholdingAmt", () => {
  const result = buildIRS1040({ line25b_withheld_1099: 450 });
  assertStringIncludes(result, "<Form1099WithholdingAmt>450</Form1099WithholdingAmt>");
});

Deno.test("line12e_itemized_deductions maps to TotalItemizedOrStandardDedAmt", () => {
  const result = buildIRS1040({ line12e_itemized_deductions: 27700 });
  assertStringIncludes(result, "<TotalItemizedOrStandardDedAmt>27700</TotalItemizedOrStandardDedAmt>");
});

Deno.test("line28_actc maps to AdditionalChildTaxCreditAmt", () => {
  const result = buildIRS1040({ line28_actc: 1600 });
  assertStringIncludes(result, "<AdditionalChildTaxCreditAmt>1600</AdditionalChildTaxCreditAmt>");
});

Deno.test("line29_refundable_aoc maps to RefundableAOCreditAmt", () => {
  const result = buildIRS1040({ line29_refundable_aoc: 2500 });
  assertStringIncludes(result, "<RefundableAOCreditAmt>2500</RefundableAOCreditAmt>");
});

Deno.test("line38_amount_paid_extension maps to AmountPaidWithExtensionAmt", () => {
  const result = buildIRS1040({ line38_amount_paid_extension: 1000 });
  assertStringIncludes(result, "<AmountPaidWithExtensionAmt>1000</AmountPaidWithExtensionAmt>");
});

// ─── Section 5: Sparse output ────────────────────────────────────────────────

Deno.test("absent field not emitted when other field present", () => {
  const result = buildIRS1040({ line3a_qualified_dividends: 1500 });
  assertStringIncludes(result, "<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>");
  assertNotIncludes(result, "<WagesAmt>");
});

Deno.test("IRA gross present but IRA taxable absent - only gross element emitted", () => {
  const result = buildIRS1040({ line4a_ira_gross: 20000 });
  assertStringIncludes(result, "<TotalIRADistributionsAmt>20000</TotalIRADistributionsAmt>");
  assertNotIncludes(result, "<TaxableIRADistributionsAmt>");
});

Deno.test("null value field not emitted", () => {
  assertEquals(buildIRS1040({ line1a_wages: null }), "");
});

// ─── Section 6: All fields present ───────────────────────────────────────────

Deno.test("all 15 fields produces all 15 elements and IRS1040 wrapper", () => {
  const result = buildIRS1040({
    line1a_wages: 50000,
    line1e_taxable_dep_care: 3000,
    line1i_combat_pay: 1200,
    line2a_tax_exempt: 500,
    line3a_qualified_dividends: 1500,
    line4a_ira_gross: 20000,
    line4b_ira_taxable: 18000,
    line5a_pension_gross: 24000,
    line5b_pension_taxable: 22000,
    line25a_w2_withheld: 8000,
    line25b_withheld_1099: 450,
    line12e_itemized_deductions: 27700,
    line28_actc: 1600,
    line29_refundable_aoc: 2500,
    line38_amount_paid_extension: 1000,
  });

  assertStringIncludes(result, "<IRS1040>");
  assertStringIncludes(result, "<WagesAmt>50000</WagesAmt>");
  assertStringIncludes(result, "<TaxableDependentCareExpnsesAmt>3000</TaxableDependentCareExpnsesAmt>");
  assertStringIncludes(result, "<CombatPayElectionAmt>1200</CombatPayElectionAmt>");
  assertStringIncludes(result, "<TaxExemptInterestAmt>500</TaxExemptInterestAmt>");
  assertStringIncludes(result, "<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>");
  assertStringIncludes(result, "<TotalIRADistributionsAmt>20000</TotalIRADistributionsAmt>");
  assertStringIncludes(result, "<TaxableIRADistributionsAmt>18000</TaxableIRADistributionsAmt>");
  assertStringIncludes(result, "<TotalPensionsAndAnnuitiesAmt>24000</TotalPensionsAndAnnuitiesAmt>");
  assertStringIncludes(result, "<TaxablePensionsAndAnnuitiesAmt>22000</TaxablePensionsAndAnnuitiesAmt>");
  assertStringIncludes(result, "<WithholdingTaxAmt>8000</WithholdingTaxAmt>");
  assertStringIncludes(result, "<Form1099WithholdingAmt>450</Form1099WithholdingAmt>");
  assertStringIncludes(result, "<TotalItemizedOrStandardDedAmt>27700</TotalItemizedOrStandardDedAmt>");
  assertStringIncludes(result, "<AdditionalChildTaxCreditAmt>1600</AdditionalChildTaxCreditAmt>");
  assertStringIncludes(result, "<RefundableAOCreditAmt>2500</RefundableAOCreditAmt>");
  assertStringIncludes(result, "<AmountPaidWithExtensionAmt>1000</AmountPaidWithExtensionAmt>");
});

// ─── Section 7: Mixed known/unknown keys ─────────────────────────────────────

Deno.test("known field emitted, unknown key dropped", () => {
  const result = buildIRS1040({ line1a_wages: 50000, unknown_field: 999 });
  assertStringIncludes(result, "<WagesAmt>50000</WagesAmt>");
  assertNotIncludes(result, "unknown_field");
  assertNotIncludes(result, ">999<");
});

Deno.test("wrapper IRS1040 element present when mappable fields exist", () => {
  const result = buildIRS1040({ line1a_wages: 100 });
  assertStringIncludes(result, "<IRS1040>");
});

// ─── Section 8: Element ordering ─────────────────────────────────────────────

Deno.test("elements emitted in field map order regardless of input insertion order", () => {
  // Input provides pension before wages, but output must follow field map order
  const result = buildIRS1040({ line5a_pension_gross: 24000, line1a_wages: 50000 });
  const wagesIdx = result.indexOf("<WagesAmt>");
  const pensionIdx = result.indexOf("<TotalPensionsAndAnnuitiesAmt>");
  assertEquals(
    wagesIdx < pensionIdx,
    true,
    "WagesAmt must appear before TotalPensionsAndAnnuitiesAmt in field map order",
  );
});

Deno.test("all fields ordering matches field map sequence", () => {
  const result = buildIRS1040({
    line1a_wages: 1,
    line1e_taxable_dep_care: 2,
    line1i_combat_pay: 3,
    line2a_tax_exempt: 4,
    line3a_qualified_dividends: 5,
    line4a_ira_gross: 6,
    line4b_ira_taxable: 7,
    line5a_pension_gross: 8,
    line5b_pension_taxable: 9,
    line25a_w2_withheld: 10,
    line25b_withheld_1099: 11,
    line12e_itemized_deductions: 12,
    line28_actc: 13,
    line29_refundable_aoc: 14,
    line38_amount_paid_extension: 15,
  });

  const elementOrder = [
    "<WagesAmt>",
    "<TaxableDependentCareExpnsesAmt>",
    "<CombatPayElectionAmt>",
    "<TaxExemptInterestAmt>",
    "<QualifiedDividendsAmt>",
    "<TotalIRADistributionsAmt>",
    "<TaxableIRADistributionsAmt>",
    "<TotalPensionsAndAnnuitiesAmt>",
    "<TaxablePensionsAndAnnuitiesAmt>",
    "<WithholdingTaxAmt>",
    "<Form1099WithholdingAmt>",
    "<TotalItemizedOrStandardDedAmt>",
    "<AdditionalChildTaxCreditAmt>",
    "<RefundableAOCreditAmt>",
    "<AmountPaidWithExtensionAmt>",
  ];

  let prevIdx = -1;
  for (const element of elementOrder) {
    const idx = result.indexOf(element);
    assertEquals(
      idx > prevIdx,
      true,
      `${element} must appear after previous element in field map order`,
    );
    prevIdx = idx;
  }
});

// ─── Section 9: New fields (14 additions) ────────────────────────────────────

Deno.test("line2b_taxable_interest maps to TaxableInterestAmt", () => {
  const result = buildIRS1040({ line2b_taxable_interest: 1200 });
  assertStringIncludes(result, "<TaxableInterestAmt>1200</TaxableInterestAmt>");
});
Deno.test("line2b_taxable_interest absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<TaxableInterestAmt>");
});

Deno.test("line3b_ordinary_dividends maps to OrdinaryDividendsAmt", () => {
  const result = buildIRS1040({ line3b_ordinary_dividends: 800 });
  assertStringIncludes(result, "<OrdinaryDividendsAmt>800</OrdinaryDividendsAmt>");
});
Deno.test("line3b_ordinary_dividends absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<OrdinaryDividendsAmt>");
});

Deno.test("line6a_ss_gross maps to SocSecBnftAmt", () => {
  const result = buildIRS1040({ line6a_ss_gross: 24000 });
  assertStringIncludes(result, "<SocSecBnftAmt>24000</SocSecBnftAmt>");
});
Deno.test("line6a_ss_gross absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<SocSecBnftAmt>");
});

Deno.test("line6b_ss_taxable maps to TaxableSocSecAmt", () => {
  const result = buildIRS1040({ line6b_ss_taxable: 20400 });
  assertStringIncludes(result, "<TaxableSocSecAmt>20400</TaxableSocSecAmt>");
});
Deno.test("line6b_ss_taxable absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<TaxableSocSecAmt>");
});

Deno.test("line7_capital_gain maps to CapitalGainLossAmt", () => {
  const result = buildIRS1040({ line7_capital_gain: -3000 });
  assertStringIncludes(result, "<CapitalGainLossAmt>-3000</CapitalGainLossAmt>");
});
Deno.test("line7_capital_gain absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<CapitalGainLossAmt>");
});

Deno.test("line1c_unreported_tips maps to TipIncomeAmt", () => {
  const result = buildIRS1040({ line1c_unreported_tips: 500 });
  assertStringIncludes(result, "<TipIncomeAmt>500</TipIncomeAmt>");
});
Deno.test("line1c_unreported_tips absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<TipIncomeAmt>");
});

Deno.test("line1f_taxable_adoption_benefits maps to TaxableBenefitsForm8839Amt", () => {
  const result = buildIRS1040({ line1f_taxable_adoption_benefits: 1500 });
  assertStringIncludes(result, "<TaxableBenefitsForm8839Amt>1500</TaxableBenefitsForm8839Amt>");
});
Deno.test("line1f_taxable_adoption_benefits absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<TaxableBenefitsForm8839Amt>");
});

Deno.test("line1g_wages_8919 maps to TotalWagesWithNoWithholdingAmt", () => {
  const result = buildIRS1040({ line1g_wages_8919: 7500 });
  assertStringIncludes(result, "<TotalWagesWithNoWithholdingAmt>7500</TotalWagesWithNoWithholdingAmt>");
});
Deno.test("line1g_wages_8919 absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<TotalWagesWithNoWithholdingAmt>");
});

Deno.test("line25c_additional_medicare_withheld maps to TaxWithheldOtherAmt", () => {
  const result = buildIRS1040({ line25c_additional_medicare_withheld: 900 });
  assertStringIncludes(result, "<TaxWithheldOtherAmt>900</TaxWithheldOtherAmt>");
});
Deno.test("line25c_additional_medicare_withheld absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<TaxWithheldOtherAmt>");
});

Deno.test("line13_qbi_deduction maps to QualifiedBusinessIncomeDedAmt", () => {
  const result = buildIRS1040({ line13_qbi_deduction: 5000 });
  assertStringIncludes(result, "<QualifiedBusinessIncomeDedAmt>5000</QualifiedBusinessIncomeDedAmt>");
});
Deno.test("line13_qbi_deduction absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<QualifiedBusinessIncomeDedAmt>");
});

Deno.test("line30_refundable_adoption maps to RefundableCreditsAmt", () => {
  const result = buildIRS1040({ line30_refundable_adoption: 2000 });
  assertStringIncludes(result, "<RefundableCreditsAmt>2000</RefundableCreditsAmt>");
});
Deno.test("line30_refundable_adoption absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<RefundableCreditsAmt>");
});

Deno.test("line17_additional_taxes maps to OtherTaxAmt", () => {
  const result = buildIRS1040({ line17_additional_taxes: 3200 });
  assertStringIncludes(result, "<OtherTaxAmt>3200</OtherTaxAmt>");
});
Deno.test("line17_additional_taxes absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<OtherTaxAmt>");
});

Deno.test("line20_nonrefundable_credits maps to TotalNonrefundableCreditsAmt", () => {
  const result = buildIRS1040({ line20_nonrefundable_credits: 4500 });
  assertStringIncludes(result, "<TotalNonrefundableCreditsAmt>4500</TotalNonrefundableCreditsAmt>");
});
Deno.test("line20_nonrefundable_credits absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<TotalNonrefundableCreditsAmt>");
});

Deno.test("line31_additional_payments maps to TotalOtherPaymentsRfdblCrAmt", () => {
  const result = buildIRS1040({ line31_additional_payments: 1100 });
  assertStringIncludes(result, "<TotalOtherPaymentsRfdblCrAmt>1100</TotalOtherPaymentsRfdblCrAmt>");
});
Deno.test("line31_additional_payments absent not emitted", () => {
  const result = buildIRS1040({ line1a_wages: 50000 });
  assertNotIncludes(result, "<TotalOtherPaymentsRfdblCrAmt>");
});

// ─── Section 10: All 29 fields ───────────────────────────────────────────────

Deno.test("all 29 fields produces all 29 elements and IRS1040 wrapper", () => {
  const result = buildIRS1040({
    line1a_wages: 50000,
    line1c_unreported_tips: 500,
    line1e_taxable_dep_care: 3000,
    line1f_taxable_adoption_benefits: 1500,
    line1g_wages_8919: 7500,
    line1i_combat_pay: 1200,
    line2a_tax_exempt: 500,
    line2b_taxable_interest: 1200,
    line3a_qualified_dividends: 1500,
    line3b_ordinary_dividends: 800,
    line4a_ira_gross: 20000,
    line4b_ira_taxable: 18000,
    line5a_pension_gross: 24000,
    line5b_pension_taxable: 22000,
    line6a_ss_gross: 24000,
    line6b_ss_taxable: 20400,
    line7_capital_gain: -3000,
    line13_qbi_deduction: 5000,
    line17_additional_taxes: 3200,
    line20_nonrefundable_credits: 4500,
    line25a_w2_withheld: 8000,
    line25b_withheld_1099: 450,
    line25c_additional_medicare_withheld: 900,
    line28_actc: 1600,
    line29_refundable_aoc: 2500,
    line30_refundable_adoption: 2000,
    line31_additional_payments: 1100,
    line12e_itemized_deductions: 27700,
    line38_amount_paid_extension: 1000,
  });

  assertStringIncludes(result, "<IRS1040>");
  assertStringIncludes(result, "<WagesAmt>50000</WagesAmt>");
  assertStringIncludes(result, "<TipIncomeAmt>500</TipIncomeAmt>");
  assertStringIncludes(result, "<TaxableDependentCareExpnsesAmt>3000</TaxableDependentCareExpnsesAmt>");
  assertStringIncludes(result, "<TaxableBenefitsForm8839Amt>1500</TaxableBenefitsForm8839Amt>");
  assertStringIncludes(result, "<TotalWagesWithNoWithholdingAmt>7500</TotalWagesWithNoWithholdingAmt>");
  assertStringIncludes(result, "<CombatPayElectionAmt>1200</CombatPayElectionAmt>");
  assertStringIncludes(result, "<TaxExemptInterestAmt>500</TaxExemptInterestAmt>");
  assertStringIncludes(result, "<TaxableInterestAmt>1200</TaxableInterestAmt>");
  assertStringIncludes(result, "<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>");
  assertStringIncludes(result, "<OrdinaryDividendsAmt>800</OrdinaryDividendsAmt>");
  assertStringIncludes(result, "<TotalIRADistributionsAmt>20000</TotalIRADistributionsAmt>");
  assertStringIncludes(result, "<TaxableIRADistributionsAmt>18000</TaxableIRADistributionsAmt>");
  assertStringIncludes(result, "<TotalPensionsAndAnnuitiesAmt>24000</TotalPensionsAndAnnuitiesAmt>");
  assertStringIncludes(result, "<TaxablePensionsAndAnnuitiesAmt>22000</TaxablePensionsAndAnnuitiesAmt>");
  assertStringIncludes(result, "<SocSecBnftAmt>24000</SocSecBnftAmt>");
  assertStringIncludes(result, "<TaxableSocSecAmt>20400</TaxableSocSecAmt>");
  assertStringIncludes(result, "<CapitalGainLossAmt>-3000</CapitalGainLossAmt>");
  assertStringIncludes(result, "<QualifiedBusinessIncomeDedAmt>5000</QualifiedBusinessIncomeDedAmt>");
  assertStringIncludes(result, "<OtherTaxAmt>3200</OtherTaxAmt>");
  assertStringIncludes(result, "<TotalNonrefundableCreditsAmt>4500</TotalNonrefundableCreditsAmt>");
  assertStringIncludes(result, "<WithholdingTaxAmt>8000</WithholdingTaxAmt>");
  assertStringIncludes(result, "<Form1099WithholdingAmt>450</Form1099WithholdingAmt>");
  assertStringIncludes(result, "<TaxWithheldOtherAmt>900</TaxWithheldOtherAmt>");
  assertStringIncludes(result, "<AdditionalChildTaxCreditAmt>1600</AdditionalChildTaxCreditAmt>");
  assertStringIncludes(result, "<RefundableAOCreditAmt>2500</RefundableAOCreditAmt>");
  assertStringIncludes(result, "<RefundableCreditsAmt>2000</RefundableCreditsAmt>");
  assertStringIncludes(result, "<TotalOtherPaymentsRfdblCrAmt>1100</TotalOtherPaymentsRfdblCrAmt>");
  assertStringIncludes(result, "<TotalItemizedOrStandardDedAmt>27700</TotalItemizedOrStandardDedAmt>");
  assertStringIncludes(result, "<AmountPaidWithExtensionAmt>1000</AmountPaidWithExtensionAmt>");
});
