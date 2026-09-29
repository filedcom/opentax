import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  DependentCreditCategory,
  DependentRelationship,
  IRSDependentRelationshipCode,
} from "../../../nodes/inputs/general/index.ts";
import { irs1040 } from "./f1040.ts";

const eligibleFiler = {
  filing_status: "single",
  taxpayer_ssn: "999-88-7777",
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
};

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
  assertStringIncludes(
    result,
    "<RefundProductCd>NO FINANCIAL PRODUCT</RefundProductCd>",
  );
});

Deno.test("Form 1040 MeF rejects a positive Schedule 1-A deduction without its document", () => {
  assertThrows(
    () => irs1040.build({ line13b_additional_deductions: 6_000 }),
    Error,
    "line 13b needs an attached senior-only Schedule 1-A",
  );
});

Deno.test("Form 1040 MeF refuses an unresolved Form 8912 credit", () => {
  assertThrows(
    () =>
      irs1040.build({
        form8912_source_lines: { line1: 100, line2: 0, line3: 0, line4: 100 },
      }),
    Error,
    "needs finalized Form 8912 Part II",
  );
});

Deno.test("Form 1040 MeF accepts a finalized Form 8912 only with its document", () => {
  const fields = {
    form8912_source_lines: { line1: 100, line2: 0, line3: 0, line4: 100 },
  };
  assertThrows(
    () =>
      irs1040.build(fields, {
        pending: { f8912: { allowed_credit: 100 } },
        documentIdsByPendingKey: { f8912: [] },
      }),
    Error,
    "one attached Form 8912",
  );
  assertStringIncludes(
    irs1040.build(fields, {
      pending: { f8912: { allowed_credit: 100 } },
      documentIdsByPendingKey: { f8912: ["IRS8912_1"] },
    }),
    "<IRS1040>",
  );
});

Deno.test("Form 1040 line 16 labels and references the Form 8814 tax", () => {
  const xml = irs1040.build(
    { line16_income_tax: 2_135, form8814_tax: 135 },
    { documentIdsByPendingKey: { form8814: ["DOC8814"] } },
  );
  assertStringIncludes(xml, "<TaxAmt>2135</TaxAmt>");
  assertStringIncludes(
    xml,
    '<Form8814Ind childInterestAndDividendTaxAmt="135" referenceDocumentId="DOC8814" referenceDocumentName="IRS8814">X</Form8814Ind>',
  );
});

Deno.test("Form 1040 rejects an elected child tax without its document", () => {
  assertThrows(
    () =>
      irs1040.build(
        { line16_income_tax: 135, form8814_tax: 135 },
        { documentIdsByPendingKey: { form8814: [] } },
      ),
    Error,
    "needs an attached Form 8814",
  );
});

Deno.test("Form 1040 line 16 links an attached Form 4972", () => {
  const xml = irs1040.build(
    { line16_income_tax: 14_705, form4972_tax: 14_705 },
    { documentIdsByPendingKey: { form4972: ["DOC4972"] } },
  );
  assertStringIncludes(xml, "<TaxAmt>14705</TaxAmt>");
  assertStringIncludes(
    xml,
    '<Form4972Ind referenceDocumentId="DOC4972" referenceDocumentName="IRS4972">X</Form4972Ind>',
  );
});

Deno.test("Form 1040 rejects Form 4972 tax with no attached document", () => {
  assertThrows(
    () =>
      irs1040.build(
        { line16_income_tax: 2_000, form4972_tax: 2_000 },
        { documentIdsByPendingKey: { form4972: [] } },
      ),
    Error,
    "needs an attached Form 4972",
  );
});

Deno.test("Form 1040 cannot claim dependent credits without dependent rows", () => {
  assertThrows(
    () => irs1040.build({ qualifying_child_tax_credit_count: 1 }),
    Error,
    "dependent credits do not match the dependent rows",
  );
});

Deno.test("dependent rows preserve identity, relationship, residency, and credit choice", () => {
  const result = irs1040.build({
    ...eligibleFiler,
    dependent_count: 2,
    qualifying_child_tax_credit_count: 1,
    other_dependent_count: 1,
    dependent_details: [
      {
        first_name: "Ada",
        last_name: "Taxpayer",
        name_control: "TAXP",
        ssn: "111-22-3334",
        ssn_valid_for_employment: true,
        ssn_issued_before_due_date: true,
        tin_issued_by_due_date: true,
        dob: "2017-06-15",
        relationship: DependentRelationship.Daughter,
        irs_relationship_code: IRSDependentRelationshipCode.Daughter,
        months_in_home: 12,
        lived_in_us_over_half_year: true,
        us_citizen_national_or_resident: true,
        provided_over_half_own_support: false,
        filed_joint_return_except_refund_only: false,
        credit_category: DependentCreditCategory.ChildTaxCredit,
      },
      {
        first_name: "Mira",
        last_name: "Taxpayer",
        name_control: "TAXP",
        itin: "900-12-3456",
        tin_issued_by_due_date: true,
        dob: "1960-01-01",
        relationship: DependentRelationship.Parent,
        irs_relationship_code: IRSDependentRelationshipCode.Parent,
        months_in_home: 0,
        us_citizen_national_or_resident: true,
        filed_joint_return_except_refund_only: false,
        taxpayer_provided_over_half_support: true,
        gross_income: 0,
        credit_category: DependentCreditCategory.OtherDependentCredit,
      },
    ],
  });
  assertEquals([...result.matchAll(/<DependentDetail>/g)].length, 2);
  assertStringIncludes(result, "<DependentSSN>111223334</DependentSSN>");
  assertStringIncludes(
    result,
    "<DependentRelationshipCd>DAUGHTER</DependentRelationshipCd>",
  );
  assertStringIncludes(
    result,
    "<YesLiveWithChldUSOvrHalfYrInd>X</YesLiveWithChldUSOvrHalfYrInd>",
  );
  assertStringIncludes(
    result,
    "<EligibleForChildTaxCreditInd>X</EligibleForChildTaxCreditInd>",
  );
  assertStringIncludes(result, "<EligibleForODCInd>X</EligibleForODCInd>");
  assertStringIncludes(
    result,
    "<ChldWhoLivedWithYouCnt>1</ChldWhoLivedWithYouCnt>",
  );
  assertStringIncludes(
    result,
    "<OtherDependentsListedCnt>1</OtherDependentsListedCnt>",
  );
});

Deno.test("dependent rows cannot silently omit the required name control", () => {
  assertThrows(
    () =>
      irs1040.build({
        ...eligibleFiler,
        dependent_count: 1,
        dependent_details: [{
          first_name: "Ada",
          last_name: "Taxpayer",
          ssn: "111223334",
          ssn_valid_for_employment: true,
          ssn_issued_before_due_date: true,
          tin_issued_by_due_date: true,
          dob: "2017-06-15",
          relationship: DependentRelationship.Daughter,
          irs_relationship_code: IRSDependentRelationshipCode.Daughter,
          months_in_home: 12,
          us_citizen_national_or_resident: true,
          provided_over_half_own_support: false,
          filed_joint_return_except_refund_only: false,
          credit_category: DependentCreditCategory.ChildTaxCredit,
        }],
      }),
    Error,
    "IRS name control",
  );
});

Deno.test("dependent credit row needs confirmed qualifying U.S. status", () => {
  assertThrows(
    () =>
      irs1040.build({
        ...eligibleFiler,
        dependent_count: 1,
        dependent_details: [{
          first_name: "Ada",
          last_name: "Taxpayer",
          name_control: "TAXP",
          ssn: "111223334",
          ssn_valid_for_employment: true,
          ssn_issued_before_due_date: true,
          tin_issued_by_due_date: true,
          dob: "2017-06-15",
          relationship: DependentRelationship.Daughter,
          irs_relationship_code: IRSDependentRelationshipCode.Daughter,
          months_in_home: 12,
          provided_over_half_own_support: false,
          filed_joint_return_except_refund_only: false,
          credit_category: DependentCreditCategory.ChildTaxCredit,
        }],
      }),
    Error,
    "confirmed U.S. citizenship",
  );
});

Deno.test("dependent credit row needs a confirmed joint-return answer", () => {
  assertThrows(
    () =>
      irs1040.build({
        ...eligibleFiler,
        dependent_count: 1,
        dependent_details: [{
          first_name: "Ada",
          last_name: "Taxpayer",
          name_control: "TAXP",
          ssn: "111223334",
          ssn_valid_for_employment: true,
          ssn_issued_before_due_date: true,
          tin_issued_by_due_date: true,
          dob: "2017-06-15",
          relationship: DependentRelationship.Daughter,
          irs_relationship_code: IRSDependentRelationshipCode.Daughter,
          months_in_home: 12,
          us_citizen_national_or_resident: true,
          provided_over_half_own_support: false,
          credit_category: DependentCreditCategory.ChildTaxCredit,
        }],
      }),
    Error,
    "confirmed answer to the dependent joint-return test",
  );
});

Deno.test("Form 1040 cannot mark a child for CTC without an employment-valid timely SSN", () => {
  assertThrows(
    () =>
      irs1040.build({
        ...eligibleFiler,
        dependent_count: 1,
        dependent_details: [{
          first_name: "Ada",
          last_name: "Taxpayer",
          name_control: "TAXP",
          ssn: "111223334",
          ssn_valid_for_employment: false,
          ssn_issued_before_due_date: true,
          tin_issued_by_due_date: true,
          dob: "2017-06-15",
          relationship: DependentRelationship.Daughter,
          irs_relationship_code: IRSDependentRelationshipCode.Daughter,
          months_in_home: 12,
          us_citizen_national_or_resident: true,
          provided_over_half_own_support: false,
          filed_joint_return_except_refund_only: false,
          credit_category: DependentCreditCategory.ChildTaxCredit,
        }],
      }),
    Error,
    "credit category does not match the dependent facts",
  );
});

Deno.test("a dependent row without a credit still needs a support basis", () => {
  assertThrows(
    () =>
      irs1040.build({
        ...eligibleFiler,
        dependent_count: 1,
        dependent_details: [{
          first_name: "Ada",
          last_name: "Taxpayer",
          name_control: "TAXP",
          ssn: "111223334",
          dob: "2017-06-15",
          relationship: DependentRelationship.Daughter,
          irs_relationship_code: IRSDependentRelationshipCode.Daughter,
          months_in_home: 12,
          filed_joint_return_except_refund_only: false,
          credit_category: DependentCreditCategory.None,
        }],
      }),
    Error,
    "support basis",
  );
});

Deno.test("qualifying-relative ODC row needs verified income", () => {
  assertThrows(
    () =>
      irs1040.build({
        ...eligibleFiler,
        dependent_count: 1,
        dependent_details: [{
          first_name: "Mira",
          last_name: "Taxpayer",
          name_control: "TAXP",
          itin: "900-12-3456",
          tin_issued_by_due_date: true,
          dob: "1960-01-01",
          relationship: DependentRelationship.Parent,
          irs_relationship_code: IRSDependentRelationshipCode.Parent,
          months_in_home: 0,
          us_citizen_national_or_resident: true,
          filed_joint_return_except_refund_only: false,
          taxpayer_provided_over_half_support: true,
          credit_category: DependentCreditCategory.OtherDependentCredit,
        }],
      }),
    Error,
    "credit category does not match the dependent facts",
  );
});

Deno.test("unrelated ODC row cannot claim the credit without full-year residence", () => {
  assertThrows(
    () =>
      irs1040.build({
        ...eligibleFiler,
        dependent_count: 1,
        dependent_details: [{
          first_name: "Pat",
          last_name: "Taxpayer",
          name_control: "TAXP",
          itin: "900-12-3456",
          tin_issued_by_due_date: true,
          dob: "1960-01-01",
          relationship: DependentRelationship.Other,
          irs_relationship_code: IRSDependentRelationshipCode.Other,
          months_in_home: 11,
          us_citizen_national_or_resident: true,
          filed_joint_return_except_refund_only: false,
          taxpayer_provided_over_half_support: true,
          gross_income: 0,
          credit_category: DependentCreditCategory.OtherDependentCredit,
        }],
      }),
    Error,
    "credit category does not match the dependent facts",
  );
});

Deno.test("grandparent and in-law ODC rows use their IRS relationship codes", () => {
  const result = irs1040.build({
    ...eligibleFiler,
    dependent_count: 2,
    other_dependent_count: 2,
    dependent_details: [
      {
        first_name: "Mira",
        last_name: "Taxpayer",
        name_control: "TAXP",
        itin: "900-12-3456",
        tin_issued_by_due_date: true,
        dob: "1960-01-01",
        relationship: DependentRelationship.Grandparent,
        irs_relationship_code: IRSDependentRelationshipCode.Grandparent,
        months_in_home: 0,
        us_citizen_national_or_resident: true,
        filed_joint_return_except_refund_only: false,
        taxpayer_provided_over_half_support: true,
        gross_income: 0,
        credit_category: DependentCreditCategory.OtherDependentCredit,
      },
      {
        first_name: "Pia",
        last_name: "Taxpayer",
        name_control: "TAXP",
        itin: "900-12-3457",
        tin_issued_by_due_date: true,
        dob: "1965-01-01",
        relationship: DependentRelationship.ParentInLaw,
        irs_relationship_code: IRSDependentRelationshipCode.Other,
        months_in_home: 0,
        us_citizen_national_or_resident: true,
        filed_joint_return_except_refund_only: false,
        taxpayer_provided_over_half_support: true,
        gross_income: 0,
        credit_category: DependentCreditCategory.OtherDependentCredit,
      },
    ],
  });
  assertStringIncludes(
    result,
    "<DependentRelationshipCd>GRANDPARENT</DependentRelationshipCd>",
  );
  assertStringIncludes(
    result,
    "<DependentRelationshipCd>OTHER</DependentRelationshipCd>",
  );
  assertEquals([...result.matchAll(/<EligibleForODCInd>/g)].length, 2);
});

Deno.test("all unknown keys still emits required IRS1040 fields", () => {
  const result = irs1040.build({ unknown_field: 999, foo: 123, bar: "baz" });
  assertStringIncludes(result, "<IRS1040>");
  assertStringIncludes(result, "<IndividualReturnFilingStatusCd>");
  assertStringIncludes(
    result,
    "<RefundProductCd>NO FINANCIAL PRODUCT</RefundProductCd>",
  );
});

Deno.test("filing_status single maps to IndividualReturnFilingStatusCd 1", () => {
  const result = irs1040.build({ filing_status: "single" });
  assertStringIncludes(
    result,
    "<IndividualReturnFilingStatusCd>1</IndividualReturnFilingStatusCd>",
  );
});

Deno.test("filing_status mfj maps to IndividualReturnFilingStatusCd 2", () => {
  const result = irs1040.build({ filing_status: "mfj" });
  assertStringIncludes(
    result,
    "<IndividualReturnFilingStatusCd>2</IndividualReturnFilingStatusCd>",
  );
});

Deno.test("RefundProductCd always emitted at end", () => {
  const result = irs1040.build({ line1a_wages: 50000 });
  assertStringIncludes(
    result,
    "<RefundProductCd>NO FINANCIAL PRODUCT</RefundProductCd>",
  );
  const refundIdx = result.indexOf("<RefundProductCd>");
  const closingIdx = result.indexOf("</IRS1040>");
  assertEquals(
    refundIdx < closingIdx,
    true,
    "RefundProductCd must precede closing tag",
  );
});

// ─── Section 2: Zero value emitted ───────────────────────────────────────────

Deno.test("line1a_wages zero emits WagesAmt zero", () => {
  const result = irs1040.build({ line1a_wages: 0 });
  assertStringIncludes(result, "<WagesAmt>0</WagesAmt>");
});

Deno.test("line25a_w2_withheld zero emits FormW2WithheldTaxAmt zero", () => {
  const result = irs1040.build({ line25a_w2_withheld: 0 });
  assertStringIncludes(
    result,
    "<FormW2WithheldTaxAmt>0</FormW2WithheldTaxAmt>",
  );
});

Deno.test("line12c_deduction_total zero is emitted", () => {
  const result = irs1040.build({ line12c_deduction_total: 0 });
  assertStringIncludes(
    result,
    "<TotalItemizedOrStandardDedAmt>0</TotalItemizedOrStandardDedAmt>",
  );
});

// ─── Section 3: Per-field mapping ────────────────────────────────────────────
// Tag names verified against IRS1040.xsd (2025v3.0)

Deno.test("line1a_wages maps to WagesAmt", () => {
  const result = irs1040.build({ line1a_wages: 50000 });
  assertStringIncludes(result, "<WagesAmt>50000</WagesAmt>");
});

Deno.test("Form 1040 preserves household wages, Medicaid waivers, wage total, and Schedule 1 income", () => {
  const result = irs1040.build({
    line1b_household_wages: 2_000,
    line1d_medicaid_waiver: 300,
    line1z_total_wages: 2_300,
    line8_additional_income: 1_000,
  });
  assertStringIncludes(
    result,
    "<HouseholdEmployeeWagesAmt>2000</HouseholdEmployeeWagesAmt>",
  );
  assertStringIncludes(
    result,
    "<MedicaidWaiverPymtNotRptW2Amt>300</MedicaidWaiverPymtNotRptW2Amt>",
  );
  assertStringIncludes(
    result,
    "<WagesSalariesAndTipsAmt>2300</WagesSalariesAndTipsAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalAdditionalIncomeAmt>1000</TotalAdditionalIncomeAmt>",
  );
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
  assertStringIncludes(
    result,
    "<TaxExemptInterestAmt>500</TaxExemptInterestAmt>",
  );
});

Deno.test("line3a_qualified_dividends maps to QualifiedDividendsAmt", () => {
  const result = irs1040.build({ line3a_qualified_dividends: 1500 });
  assertStringIncludes(
    result,
    "<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>",
  );
});

Deno.test("line4a_ira_gross maps to IRADistributionsAmt", () => {
  const result = irs1040.build({ line4a_ira_gross: 20000 });
  assertStringIncludes(
    result,
    "<IRADistributionsAmt>20000</IRADistributionsAmt>",
  );
});

Deno.test("line4b_ira_taxable maps to TaxableIRAAmt", () => {
  const result = irs1040.build({ line4b_ira_taxable: 18000 });
  assertStringIncludes(result, "<TaxableIRAAmt>18000</TaxableIRAAmt>");
});

Deno.test("line5a_pension_gross maps to PensionsAnnuitiesAmt", () => {
  const result = irs1040.build({ line5a_pension_gross: 24000 });
  assertStringIncludes(
    result,
    "<PensionsAnnuitiesAmt>24000</PensionsAnnuitiesAmt>",
  );
});

Deno.test("line5b_pension_taxable maps to TotalTaxablePensionsAmt", () => {
  const result = irs1040.build({ line5b_pension_taxable: 22000 });
  assertStringIncludes(
    result,
    "<TotalTaxablePensionsAmt>22000</TotalTaxablePensionsAmt>",
  );
});

Deno.test("payer code G reconciles to Form 1040 line 5c in native MeF sequence", () => {
  const source = { f1099rs: [{
    payer_name: "Jubilee",
    payer_ein: "12-3456789",
    box1_gross_distribution: 20_300,
    box2a_taxable_amount: 10_300,
    box7_distribution_code: "G",
    box7_ira_simple_indicator: false,
    direct_rollover_confirmed: true,
  }] };
  const fields = {
    line5a_pension_gross: 20_300,
    line5b_pension_taxable: 10_300,
    line5c_pension_rollover: true,
  };
  const result = irs1040.build(fields, { pending: { f1099r: source } });
  assertStringIncludes(
    result,
    "<PensionsAnnuitiesAmt>20300</PensionsAnnuitiesAmt><TotalTaxablePensionsAmt>10300</TotalTaxablePensionsAmt><PensionsAnnuitiesRolloverInd>X</PensionsAnnuitiesRolloverInd>",
  );
  assertThrows(
    () => irs1040.build(fields),
    Error,
    "needs valid Form 1099-R source facts",
  );
  assertThrows(
    () => irs1040.build({ ...fields, line5c_pension_rollover: false }, {
      pending: { f1099r: source },
    }),
    Error,
    "does not match the payer-reported",
  );
});

Deno.test("line25a_w2_withheld maps to FormW2WithheldTaxAmt", () => {
  const result = irs1040.build({ line25a_w2_withheld: 8000 });
  assertStringIncludes(
    result,
    "<FormW2WithheldTaxAmt>8000</FormW2WithheldTaxAmt>",
  );
});

Deno.test("line25b_withheld_1099 maps to Form1099WithheldTaxAmt", () => {
  const result = irs1040.build({ line25b_withheld_1099: 450 });
  assertStringIncludes(
    result,
    "<Form1099WithheldTaxAmt>450</Form1099WithheldTaxAmt>",
  );
});

Deno.test("line12c_deduction_total maps to TotalItemizedOrStandardDedAmt", () => {
  const result = irs1040.build({ line12c_deduction_total: 27700 });
  assertStringIncludes(
    result,
    "<TotalItemizedOrStandardDedAmt>27700</TotalItemizedOrStandardDedAmt>",
  );
});

Deno.test("line28_actc maps to AdditionalChildTaxCreditAmt", () => {
  const result = irs1040.build({ line28_actc: 1600 });
  assertStringIncludes(
    result,
    "<AdditionalChildTaxCreditAmt>1600</AdditionalChildTaxCreditAmt>",
  );
});

Deno.test("line29_refundable_aoc maps to RefundableAmerOppCreditAmt", () => {
  const result = irs1040.build({ line29_refundable_aoc: 2500 });
  assertStringIncludes(
    result,
    "<RefundableAmerOppCreditAmt>2500</RefundableAmerOppCreditAmt>",
  );
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
  assertStringIncludes(
    result,
    "<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>",
  );
  assertNotIncludes(result, "<WagesAmt>");
});

Deno.test("IRA gross present but IRA taxable absent - only gross element emitted", () => {
  const result = irs1040.build({ line4a_ira_gross: 20000 });
  assertStringIncludes(
    result,
    "<IRADistributionsAmt>20000</IRADistributionsAmt>",
  );
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
    line12c_deduction_total: 10,
    line25a_w2_withheld: 11,
    line25b_withheld_1099: 12,
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
    "<FormW2WithheldTaxAmt>",
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
  assertStringIncludes(
    result,
    "<OrdinaryDividendsAmt>800</OrdinaryDividendsAmt>",
  );
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
  assertStringIncludes(
    result,
    "<CapitalGainLossAmt>-3000</CapitalGainLossAmt>",
  );
});

Deno.test("age and blindness boxes carry a matching count before the deduction", () => {
  const result = irs1040.build({
    filing_status: "mfj",
    taxpayer_age_65_or_older: true,
    taxpayer_blind: true,
    spouse_age_65_or_older: true,
    line12c_deduction_total: 34_700,
  });
  assertStringIncludes(
    result,
    "<Primary65OrOlderInd>X</Primary65OrOlderInd>" +
      "<PrimaryBlindInd>X</PrimaryBlindInd>" +
      "<Spouse65OrOlderInd>X</Spouse65OrOlderInd>" +
      "<TotalBoxesCheckedCnt>3</TotalBoxesCheckedCnt>" +
      "<TotalItemizedOrStandardDedAmt>34700</TotalItemizedOrStandardDedAmt>",
  );
});

Deno.test("age boxes follow AGI when rollover and MFS indicators add XML fields", () => {
  const source = { f1099rs: [{
    payer_name: "Jubilee",
    payer_ein: "12-3456789",
    box1_gross_distribution: 20_300,
    box2a_taxable_amount: 10_300,
    box7_distribution_code: "G",
    box7_ira_simple_indicator: false,
    direct_rollover_confirmed: true,
  }] };
  const result = irs1040.build({
    filing_status: "mfs",
    line5a_pension_gross: 20_300,
    line5b_pension_taxable: 10_300,
    line5c_pension_rollover: true,
    mfs_spouse_lived_with_taxpayer: false,
    line7a_cap_gain_distrib: 7_500,
    line11_agi: 17_800,
    taxpayer_age_65_or_older: true,
    line12c_deduction_total: 17_350,
  }, { pending: { f1099r: source } });
  const agi = result.indexOf("<AdjustedGrossIncomeAmt>");
  const age = result.indexOf("<Primary65OrOlderInd>");
  const deduction = result.indexOf("<TotalItemizedOrStandardDedAmt>");
  assertEquals(agi >= 0 && agi < age && age < deduction, true);
});

Deno.test("MFS spouse-itemizes indicator is kept and cannot be used for another status", () => {
  const result = irs1040.build({
    filing_status: "mfs",
    mfs_spouse_itemizing: true,
  });
  assertStringIncludes(result, "<MustItemizeInd>X</MustItemizeInd>");
  assertThrows(
    () =>
      irs1040.build({ filing_status: "single", mfs_spouse_itemizing: true }),
    Error,
    "requires MFS filing status",
  );
});

Deno.test("direct capital-gain distributions mark Schedule D not required", () => {
  const result = irs1040.build({ line7a_cap_gain_distrib: 7500 });
  assertStringIncludes(
    result,
    "<CapitalGainLossAmt>7500</CapitalGainLossAmt><CapitalDistributionInd>X</CapitalDistributionInd>",
  );
  assertEquals([...result.matchAll(/<CapitalGainLossAmt>/g)].length, 1);
});

Deno.test("line 7a cannot serialize two competing capital-gain sources", () => {
  assertThrows(
    () =>
      irs1040.build({
        line7_capital_gain: 7600,
        line7a_cap_gain_distrib: 7500,
      }),
    Error,
    "both a Schedule D gain and direct capital-gain distributions",
  );
});

Deno.test("line1c_unreported_tips maps to TipIncomeAmt", () => {
  const result = irs1040.build({ line1c_unreported_tips: 500 });
  assertStringIncludes(result, "<TipIncomeAmt>500</TipIncomeAmt>");
});

Deno.test("line1f_taxable_adoption_benefits maps to TaxableBenefitsForm8839Amt", () => {
  const result = irs1040.build({ line1f_taxable_adoption_benefits: 1500 });
  assertStringIncludes(
    result,
    "<TaxableBenefitsForm8839Amt>1500</TaxableBenefitsForm8839Amt>",
  );
});

Deno.test("line1g_wages_8919 maps to TotalWagesWithNoWithholdingAmt", () => {
  const result = irs1040.build({ line1g_wages_8919: 7500 });
  assertStringIncludes(
    result,
    "<TotalWagesWithNoWithholdingAmt>7500</TotalWagesWithNoWithholdingAmt>",
  );
});

Deno.test("line25c_total maps to TaxWithheldOtherAmt", () => {
  const result = irs1040.build({ line25c_total: 900 });
  assertStringIncludes(
    result,
    "<TaxWithheldOtherAmt>900</TaxWithheldOtherAmt>",
  );
});

Deno.test("Form 1040 MeF requires the native W-2G link for withholding", () => {
  assertThrows(
    () => irs1040.build({ line25c_total: 250 }, {
      pending: { w2g: { w2gs: [{ box1_winnings: 1_000, box4_federal_withheld: 250 }] } },
      documentIdsByPendingKey: { w2g: [] },
    }),
    Error,
    "needs each linked payer-issued W-2G document",
  );
  assertStringIncludes(
    irs1040.build({ line25c_total: 250 }, {
      pending: { w2g: { w2gs: [{ box1_winnings: 1_000, box4_federal_withheld: 0 }] } },
    }),
    "<TaxWithheldOtherAmt>250</TaxWithheldOtherAmt>",
  );
  assertStringIncludes(
    irs1040.build({ line25c_total: 250 }, {
      pending: { w2g: { w2gs: [{ box1_winnings: 1_000, box4_federal_withheld: 250 }] } },
      documentIdsByPendingKey: { w2g: ["IRSW2G1"] },
    }),
    "<TaxWithheldOtherAmt>250</TaxWithheldOtherAmt>",
  );
});

Deno.test("line13_qbi_deduction maps to QualifiedBusinessIncomeDedAmt", () => {
  const result = irs1040.build({ line13_qbi_deduction: 5000 });
  assertStringIncludes(
    result,
    "<QualifiedBusinessIncomeDedAmt>5000</QualifiedBusinessIncomeDedAmt>",
  );
});

Deno.test("line30_refundable_adoption maps to RefundableAdoptionCreditAmt", () => {
  const result = irs1040.build({ line30_refundable_adoption: 2000 });
  assertStringIncludes(
    result,
    "<RefundableAdoptionCreditAmt>2000</RefundableAdoptionCreditAmt>",
  );
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
    line9_total_income: 90000,
    line10_adjustments: 1000,
    line11_agi: 89000,
    line12c_deduction_total: 27700,
    line13_qbi_deduction: 5000,
    line14_deductions_qbi_total: 32700,
    line15_taxable_income: 56300,
    line16_income_tax: 7000,
    line17_additional_taxes: 3200,
    line18_total_tax_before_credits: 10200,
    line20_nonrefundable_credits: 4500,
    line21_credits_total: 4500,
    line22_tax_after_credits: 5700,
    line23_other_taxes: 300,
    line24_total_tax: 6000,
    line25a_w2_withheld: 8000,
    line25b_withheld_1099: 450,
    line25c_total: 900,
    line25d_total_withholding: 9350,
    line28_actc: 1600,
    line29_refundable_aoc: 2500,
    line30_refundable_adoption: 2000,
    line31_additional_payments: 1100,
    line32_refundable_credits_total: 5200,
    line33_total_payments: 12000,
    line34_overpayment: 6000,
    line35a_refund: 6000,
  });

  assertStringIncludes(result, "<IRS1040>");
  assertStringIncludes(result, "<WagesAmt>50000</WagesAmt>");
  assertStringIncludes(result, "<TipIncomeAmt>500</TipIncomeAmt>");
  assertStringIncludes(result, "<TaxableBenefitsAmt>3000</TaxableBenefitsAmt>");
  assertStringIncludes(
    result,
    "<TaxableBenefitsForm8839Amt>1500</TaxableBenefitsForm8839Amt>",
  );
  assertStringIncludes(
    result,
    "<TotalWagesWithNoWithholdingAmt>7500</TotalWagesWithNoWithholdingAmt>",
  );
  assertStringIncludes(
    result,
    "<NontxCombatPayElectionAmt>1200</NontxCombatPayElectionAmt>",
  );
  assertStringIncludes(
    result,
    "<TaxExemptInterestAmt>500</TaxExemptInterestAmt>",
  );
  assertStringIncludes(result, "<TaxableInterestAmt>1200</TaxableInterestAmt>");
  assertStringIncludes(
    result,
    "<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>",
  );
  assertStringIncludes(
    result,
    "<OrdinaryDividendsAmt>800</OrdinaryDividendsAmt>",
  );
  assertStringIncludes(
    result,
    "<IRADistributionsAmt>20000</IRADistributionsAmt>",
  );
  assertStringIncludes(result, "<TaxableIRAAmt>18000</TaxableIRAAmt>");
  assertStringIncludes(
    result,
    "<PensionsAnnuitiesAmt>24000</PensionsAnnuitiesAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalTaxablePensionsAmt>22000</TotalTaxablePensionsAmt>",
  );
  assertStringIncludes(result, "<SocSecBnftAmt>24000</SocSecBnftAmt>");
  assertStringIncludes(result, "<TaxableSocSecAmt>20400</TaxableSocSecAmt>");
  assertStringIncludes(
    result,
    "<CapitalGainLossAmt>-3000</CapitalGainLossAmt>",
  );
  assertStringIncludes(result, "<TotalIncomeAmt>90000</TotalIncomeAmt>");
  assertStringIncludes(
    result,
    "<AdjustedGrossIncomeAmt>89000</AdjustedGrossIncomeAmt>",
  );
  assertStringIncludes(result, "<TaxableIncomeAmt>56300</TaxableIncomeAmt>");
  assertStringIncludes(
    result,
    "<QualifiedBusinessIncomeDedAmt>5000</QualifiedBusinessIncomeDedAmt>",
  );
  assertStringIncludes(result, "<AdditionalTaxAmt>3200</AdditionalTaxAmt>");
  assertStringIncludes(
    result,
    "<TotalNonrefundableCreditsAmt>4500</TotalNonrefundableCreditsAmt>",
  );
  assertStringIncludes(result, "<TotalTaxAmt>6000</TotalTaxAmt>");
  assertStringIncludes(
    result,
    "<FormW2WithheldTaxAmt>8000</FormW2WithheldTaxAmt>",
  );
  assertStringIncludes(result, "<WithholdingTaxAmt>9350</WithholdingTaxAmt>");
  assertStringIncludes(
    result,
    "<Form1099WithheldTaxAmt>450</Form1099WithheldTaxAmt>",
  );
  assertStringIncludes(
    result,
    "<TaxWithheldOtherAmt>900</TaxWithheldOtherAmt>",
  );
  assertStringIncludes(
    result,
    "<AdditionalChildTaxCreditAmt>1600</AdditionalChildTaxCreditAmt>",
  );
  assertStringIncludes(
    result,
    "<RefundableAmerOppCreditAmt>2500</RefundableAmerOppCreditAmt>",
  );
  assertStringIncludes(
    result,
    "<RefundableAdoptionCreditAmt>2000</RefundableAdoptionCreditAmt>",
  );
  assertStringIncludes(
    result,
    "<RefundableCreditsAmt>5200</RefundableCreditsAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalOtherPaymentsRfdblCrAmt>1100</TotalOtherPaymentsRfdblCrAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalItemizedOrStandardDedAmt>27700</TotalItemizedOrStandardDedAmt>",
  );
  assertStringIncludes(result, "<TotalPaymentsAmt>12000</TotalPaymentsAmt>");
  assertStringIncludes(result, "<OverpaidAmt>6000</OverpaidAmt>");
  assertStringIncludes(result, "<RefundAmt>6000</RefundAmt>");
  assertStringIncludes(
    result,
    "<RefundProductCd>NO FINANCIAL PRODUCT</RefundProductCd>",
  );
});
