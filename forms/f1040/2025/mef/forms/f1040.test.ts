import { assertEquals, assertStringIncludes } from "@std/assert";
import { irs1040 } from "./f1040.ts";

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(
    actual.includes(expected),
    false,
    `Expected string NOT to include: ${expected}`,
  );
}

// ─── Section 1: Mandatory fields ─────────────────────────────────────────────
// IRS1040 always emits IndividualReturnFilingStatusCd, VirtualCurAcquiredDurTYInd,
// and RefundProductCd regardless of input (all required by IRS1040.xsd).

Deno.test("empty object still emits required IRS1040 fields", () => {
  const result = irs1040.build({});
  assertStringIncludes(result, "<IRS1040>");
  assertStringIncludes(result, "<IndividualReturnFilingStatusCd>");
  assertStringIncludes(result, "<VirtualCurAcquiredDurTYInd>");
  assertStringIncludes(result, "<RefundProductCd>NO FINANCIAL PRODUCT</RefundProductCd>");
});

Deno.test("all unknown keys still emits required IRS1040 fields", () => {
  const result = irs1040.build({ unknown_field: 999, foo: 123, bar: "baz" });
  assertStringIncludes(result, "<IRS1040>");
  assertStringIncludes(result, "<IndividualReturnFilingStatusCd>");
  assertStringIncludes(result, "<RefundProductCd>NO FINANCIAL PRODUCT</RefundProductCd>");
});

Deno.test("filing_status single maps to IndividualReturnFilingStatusCd 1", () => {
  const result = irs1040.build({ filing_status: "single" });
  assertStringIncludes(result, "<IndividualReturnFilingStatusCd>1</IndividualReturnFilingStatusCd>");
});

Deno.test("filing_status mfj maps to IndividualReturnFilingStatusCd 2", () => {
  const result = irs1040.build({ filing_status: "mfj" });
  assertStringIncludes(result, "<IndividualReturnFilingStatusCd>2</IndividualReturnFilingStatusCd>");
});

Deno.test("RefundProductCd always emitted at end", () => {
  const result = irs1040.build({ line1a_wages: 50000 });
  assertStringIncludes(result, "<RefundProductCd>NO FINANCIAL PRODUCT</RefundProductCd>");
  const refundIdx = result.indexOf("<RefundProductCd>");
  const closingIdx = result.indexOf("</IRS1040>");
  assertEquals(refundIdx < closingIdx, true, "RefundProductCd must precede closing tag");
});

// ─── Section 2: Zero value emitted ───────────────────────────────────────────

Deno.test("line1a_wages zero emits WagesAmt zero", () => {
  const result = irs1040.build({ line1a_wages: 0 });
  assertStringIncludes(result, "<WagesAmt>0</WagesAmt>");
});

Deno.test("line25a_w2_withheld zero emits WithholdingTaxAmt zero", () => {
  const result = irs1040.build({ line25a_w2_withheld: 0 });
  assertStringIncludes(result, "<WithholdingTaxAmt>0</WithholdingTaxAmt>");
});

// line12e_itemized_deductions=0 is suppressed (means standard deduction was taken, not $0 deduction)
Deno.test("line12e_itemized_deductions zero is suppressed", () => {
  const result = irs1040.build({ line12e_itemized_deductions: 0 });
  assertNotIncludes(result, "<TotalItemizedOrStandardDedAmt>");
});

// ─── Section 3: Per-field mapping ────────────────────────────────────────────
// Tag names verified against IRS1040.xsd (2025v3.0)

Deno.test("line1a_wages maps to WagesAmt", () => {
  const result = irs1040.build({ line1a_wages: 50000 });
  assertStringIncludes(result, "<WagesAmt>50000</WagesAmt>");
});

Deno.test("line1e_taxable_dep_care maps to TaxableBenefitsAmt", () => {
  const result = irs1040.build({ line1e_taxable_dep_care: 3000 });
  assertStringIncludes(result, "<TaxableBenefitsAmt>3000</TaxableBenefitsAmt>");
});

Deno.test("line1i_combat_pay maps to NontxCombatPayElectionAmt", () => {
  const result = irs1040.build({ line1i_combat_pay: 1200 });
  assertStringIncludes(
    result,
    "<NontxCombatPayElectionAmt>1200</NontxCombatPayElectionAmt>",
  );
});

Deno.test("line2a_tax_exempt maps to TaxExemptInterestAmt", () => {
  const result = irs1040.build({ line2a_tax_exempt: 500 });
  assertStringIncludes(result, "<TaxExemptInterestAmt>500</TaxExemptInterestAmt>");
});

Deno.test("line3a_qualified_dividends maps to QualifiedDividendsAmt", () => {
  const result = irs1040.build({ line3a_qualified_dividends: 1500 });
  assertStringIncludes(result, "<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>");
});

Deno.test("line4a_ira_gross maps to IRADistributionsAmt", () => {
  const result = irs1040.build({ line4a_ira_gross: 20000 });
  assertStringIncludes(result, "<IRADistributionsAmt>20000</IRADistributionsAmt>");
});

Deno.test("line4b_ira_taxable maps to TaxableIRAAmt", () => {
  const result = irs1040.build({ line4b_ira_taxable: 18000 });
  assertStringIncludes(result, "<TaxableIRAAmt>18000</TaxableIRAAmt>");
});

Deno.test("line5a_pension_gross maps to PensionsAnnuitiesAmt", () => {
  const result = irs1040.build({ line5a_pension_gross: 24000 });
  assertStringIncludes(result, "<PensionsAnnuitiesAmt>24000</PensionsAnnuitiesAmt>");
});

Deno.test("line5b_pension_taxable maps to TotalTaxablePensionsAmt", () => {
  const result = irs1040.build({ line5b_pension_taxable: 22000 });
  assertStringIncludes(result, "<TotalTaxablePensionsAmt>22000</TotalTaxablePensionsAmt>");
});

Deno.test("line25a_w2_withheld maps to WithholdingTaxAmt", () => {
  const result = irs1040.build({ line25a_w2_withheld: 8000 });
  assertStringIncludes(result, "<WithholdingTaxAmt>8000</WithholdingTaxAmt>");
});

Deno.test("line25b_withheld_1099 maps to Form1099WithheldTaxAmt", () => {
  const result = irs1040.build({ line25b_withheld_1099: 450 });
  assertStringIncludes(result, "<Form1099WithheldTaxAmt>450</Form1099WithheldTaxAmt>");
});

Deno.test("line12e_itemized_deductions maps to TotalItemizedOrStandardDedAmt", () => {
  const result = irs1040.build({ line12e_itemized_deductions: 27700 });
  assertStringIncludes(
    result,
    "<TotalItemizedOrStandardDedAmt>27700</TotalItemizedOrStandardDedAmt>",
  );
});

Deno.test("line28_actc maps to AdditionalChildTaxCreditAmt", () => {
  const result = irs1040.build({ line28_actc: 1600 });
  assertStringIncludes(result, "<AdditionalChildTaxCreditAmt>1600</AdditionalChildTaxCreditAmt>");
});

Deno.test("line29_refundable_aoc maps to RefundableAmerOppCreditAmt", () => {
  const result = irs1040.build({ line29_refundable_aoc: 2500 });
  assertStringIncludes(result, "<RefundableAmerOppCreditAmt>2500</RefundableAmerOppCreditAmt>");
});

Deno.test("line17_additional_taxes maps to AdditionalTaxAmt", () => {
  const result = irs1040.build({ line17_additional_taxes: 3200 });
  assertStringIncludes(result, "<AdditionalTaxAmt>3200</AdditionalTaxAmt>");
});

Deno.test("line33_total_payments maps to TotalPaymentsAmt", () => {
  const result = irs1040.build({ line33_total_payments: 11000 });
  assertStringIncludes(result, "<TotalPaymentsAmt>11000</TotalPaymentsAmt>");
});

// ─── Section 4: Sparse output ────────────────────────────────────────────────

Deno.test("absent field not emitted when other field present", () => {
  const result = irs1040.build({ line3a_qualified_dividends: 1500 });
  assertStringIncludes(result, "<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>");
  assertNotIncludes(result, "<WagesAmt>");
});

Deno.test("IRA gross present but IRA taxable absent - only gross element emitted", () => {
  const result = irs1040.build({ line4a_ira_gross: 20000 });
  assertStringIncludes(result, "<IRADistributionsAmt>20000</IRADistributionsAmt>");
  assertNotIncludes(result, "<TaxableIRAAmt>");
});

Deno.test("null value field not emitted", () => {
  const result = irs1040.build({ line1a_wages: null });
  assertNotIncludes(result, "<WagesAmt>");
});

// ─── Section 5: Mixed known/unknown keys ─────────────────────────────────────

Deno.test("known field emitted, unknown key dropped", () => {
  const result = irs1040.build({ line1a_wages: 50000, unknown_field: 999 });
  assertStringIncludes(result, "<WagesAmt>50000</WagesAmt>");
  assertNotIncludes(result, "unknown_field");
  assertNotIncludes(result, ">999<");
});

Deno.test("wrapper IRS1040 element always present", () => {
  const result = irs1040.build({ line1a_wages: 100 });
  assertStringIncludes(result, "<IRS1040>");
});

// ─── Section 6: Element ordering ─────────────────────────────────────────────

Deno.test("elements emitted in field map order regardless of input insertion order", () => {
  // Input provides pension before wages, but output must follow field map order
  const result = irs1040.build({
    line5a_pension_gross: 24000,
    line1a_wages: 50000,
  });
  const wagesIdx = result.indexOf("<WagesAmt>");
  const pensionIdx = result.indexOf("<PensionsAnnuitiesAmt>");
  assertEquals(
    wagesIdx < pensionIdx,
    true,
    "WagesAmt must appear before PensionsAnnuitiesAmt in field map order",
  );
});

Deno.test("all fields ordering matches field map sequence", () => {
  const result = irs1040.build({
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
    line33_total_payments: 15,
  });

  const elementOrder = [
    "<WagesAmt>",
    "<TaxableBenefitsAmt>",
    "<NontxCombatPayElectionAmt>",
    "<TaxExemptInterestAmt>",
    "<QualifiedDividendsAmt>",
    "<IRADistributionsAmt>",
    "<TaxableIRAAmt>",
    "<PensionsAnnuitiesAmt>",
    "<TotalTaxablePensionsAmt>",
    "<TotalItemizedOrStandardDedAmt>",
    "<WithholdingTaxAmt>",
    "<Form1099WithheldTaxAmt>",
    "<AdditionalChildTaxCreditAmt>",
    "<RefundableAmerOppCreditAmt>",
    "<TotalPaymentsAmt>",
  ];

  let prevIdx = -1;
  for (const el of elementOrder) {
    const idx = result.indexOf(el);
    assertEquals(
      idx > prevIdx,
      true,
      `${el} must appear after previous element in field map order`,
    );
    prevIdx = idx;
  }
});

// ─── Section 7: Additional field mappings ────────────────────────────────────

Deno.test("line2b_taxable_interest maps to TaxableInterestAmt", () => {
  const result = irs1040.build({ line2b_taxable_interest: 1200 });
  assertStringIncludes(result, "<TaxableInterestAmt>1200</TaxableInterestAmt>");
});

Deno.test("line3b_ordinary_dividends maps to OrdinaryDividendsAmt", () => {
  const result = irs1040.build({ line3b_ordinary_dividends: 800 });
  assertStringIncludes(result, "<OrdinaryDividendsAmt>800</OrdinaryDividendsAmt>");
});

Deno.test("line6a_ss_gross maps to SocSecBnftAmt", () => {
  const result = irs1040.build({ line6a_ss_gross: 24000 });
  assertStringIncludes(result, "<SocSecBnftAmt>24000</SocSecBnftAmt>");
});

Deno.test("line6b_ss_taxable maps to TaxableSocSecAmt", () => {
  const result = irs1040.build({ line6b_ss_taxable: 20400 });
  assertStringIncludes(result, "<TaxableSocSecAmt>20400</TaxableSocSecAmt>");
});

Deno.test("line7_capital_gain maps to CapitalGainLossAmt", () => {
  const result = irs1040.build({ line7_capital_gain: -3000 });
  assertStringIncludes(result, "<CapitalGainLossAmt>-3000</CapitalGainLossAmt>");
});

Deno.test("line1c_unreported_tips maps to TipIncomeAmt", () => {
  const result = irs1040.build({ line1c_unreported_tips: 500 });
  assertStringIncludes(result, "<TipIncomeAmt>500</TipIncomeAmt>");
});

Deno.test("line1f_taxable_adoption_benefits maps to TaxableBenefitsForm8839Amt", () => {
  const result = irs1040.build({ line1f_taxable_adoption_benefits: 1500 });
  assertStringIncludes(result, "<TaxableBenefitsForm8839Amt>1500</TaxableBenefitsForm8839Amt>");
});

Deno.test("line1g_wages_8919 maps to TotalWagesWithNoWithholdingAmt", () => {
  const result = irs1040.build({ line1g_wages_8919: 7500 });
  assertStringIncludes(
    result,
    "<TotalWagesWithNoWithholdingAmt>7500</TotalWagesWithNoWithholdingAmt>",
  );
});

Deno.test("line25c_additional_medicare_withheld maps to TaxWithheldOtherAmt", () => {
  const result = irs1040.build({ line25c_additional_medicare_withheld: 900 });
  assertStringIncludes(result, "<TaxWithheldOtherAmt>900</TaxWithheldOtherAmt>");
});

Deno.test("line13_qbi_deduction maps to QualifiedBusinessIncomeDedAmt", () => {
  const result = irs1040.build({ line13_qbi_deduction: 5000 });
  assertStringIncludes(
    result,
    "<QualifiedBusinessIncomeDedAmt>5000</QualifiedBusinessIncomeDedAmt>",
  );
});

Deno.test("line30_refundable_adoption maps to RefundableCreditsAmt", () => {
  const result = irs1040.build({ line30_refundable_adoption: 2000 });
  assertStringIncludes(result, "<RefundableCreditsAmt>2000</RefundableCreditsAmt>");
});

Deno.test("line20_nonrefundable_credits maps to TotalNonrefundableCreditsAmt", () => {
  const result = irs1040.build({ line20_nonrefundable_credits: 4500 });
  assertStringIncludes(
    result,
    "<TotalNonrefundableCreditsAmt>4500</TotalNonrefundableCreditsAmt>",
  );
});

Deno.test("line31_additional_payments maps to TotalOtherPaymentsRfdblCrAmt", () => {
  const result = irs1040.build({ line31_additional_payments: 1100 });
  assertStringIncludes(
    result,
    "<TotalOtherPaymentsRfdblCrAmt>1100</TotalOtherPaymentsRfdblCrAmt>",
  );
});

// ─── Section 8: All mapped fields ────────────────────────────────────────────

Deno.test("all mapped fields produce correct elements and IRS1040 wrapper", () => {
  const result = irs1040.build({
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
    line33_total_payments: 12000,
  });

  assertStringIncludes(result, "<IRS1040>");
  assertStringIncludes(result, "<WagesAmt>50000</WagesAmt>");
  assertStringIncludes(result, "<TipIncomeAmt>500</TipIncomeAmt>");
  assertStringIncludes(result, "<TaxableBenefitsAmt>3000</TaxableBenefitsAmt>");
  assertStringIncludes(result, "<TaxableBenefitsForm8839Amt>1500</TaxableBenefitsForm8839Amt>");
  assertStringIncludes(result, "<TotalWagesWithNoWithholdingAmt>7500</TotalWagesWithNoWithholdingAmt>");
  assertStringIncludes(result, "<NontxCombatPayElectionAmt>1200</NontxCombatPayElectionAmt>");
  assertStringIncludes(result, "<TaxExemptInterestAmt>500</TaxExemptInterestAmt>");
  assertStringIncludes(result, "<TaxableInterestAmt>1200</TaxableInterestAmt>");
  assertStringIncludes(result, "<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>");
  assertStringIncludes(result, "<OrdinaryDividendsAmt>800</OrdinaryDividendsAmt>");
  assertStringIncludes(result, "<IRADistributionsAmt>20000</IRADistributionsAmt>");
  assertStringIncludes(result, "<TaxableIRAAmt>18000</TaxableIRAAmt>");
  assertStringIncludes(result, "<PensionsAnnuitiesAmt>24000</PensionsAnnuitiesAmt>");
  assertStringIncludes(result, "<TotalTaxablePensionsAmt>22000</TotalTaxablePensionsAmt>");
  assertStringIncludes(result, "<SocSecBnftAmt>24000</SocSecBnftAmt>");
  assertStringIncludes(result, "<TaxableSocSecAmt>20400</TaxableSocSecAmt>");
  assertStringIncludes(result, "<CapitalGainLossAmt>-3000</CapitalGainLossAmt>");
  assertStringIncludes(result, "<QualifiedBusinessIncomeDedAmt>5000</QualifiedBusinessIncomeDedAmt>");
  assertStringIncludes(result, "<AdditionalTaxAmt>3200</AdditionalTaxAmt>");
  assertStringIncludes(result, "<TotalNonrefundableCreditsAmt>4500</TotalNonrefundableCreditsAmt>");
  assertStringIncludes(result, "<WithholdingTaxAmt>8000</WithholdingTaxAmt>");
  assertStringIncludes(result, "<Form1099WithheldTaxAmt>450</Form1099WithheldTaxAmt>");
  assertStringIncludes(result, "<TaxWithheldOtherAmt>900</TaxWithheldOtherAmt>");
  assertStringIncludes(result, "<AdditionalChildTaxCreditAmt>1600</AdditionalChildTaxCreditAmt>");
  assertStringIncludes(result, "<RefundableAmerOppCreditAmt>2500</RefundableAmerOppCreditAmt>");
  assertStringIncludes(result, "<RefundableCreditsAmt>2000</RefundableCreditsAmt>");
  assertStringIncludes(result, "<TotalOtherPaymentsRfdblCrAmt>1100</TotalOtherPaymentsRfdblCrAmt>");
  assertStringIncludes(result, "<TotalItemizedOrStandardDedAmt>27700</TotalItemizedOrStandardDedAmt>");
  assertStringIncludes(result, "<TotalPaymentsAmt>12000</TotalPaymentsAmt>");
  assertStringIncludes(result, "<RefundProductCd>NO FINANCIAL PRODUCT</RefundProductCd>");
});
