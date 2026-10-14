import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateForm8396,
  calculateForm8396Line3,
  form8396SourceSchema,
} from "../../../../../nodes/intermediate/forms/credits/individual/form8396/calculation.ts";
import { reissuedMccSource } from "../../../../../nodes/intermediate/forms/credits/individual/form8396/reissued_mcc.fixture.ts";
import { form8396 } from "./f8396.ts";

const home = reissuedMccSource.reviewed_reissued_mcc!.property_address;
const reissue = reissuedMccSource.reviewed_reissued_mcc!;
const f8828 = {
  f8828s: [{
    source_transaction_id: "sale-14-main",
    reviewed_issuer: {
      document_reference: reissue.original_certificate_reference,
      borrower_ssn: "123456789",
      issuer_name: reissue.issuer_name,
      issuer_state: "ID",
      issuer_type: "agency",
      original_loan_closing_date: reissue.original_loan_closing_date,
      highest_federally_subsidized_loan_amount: 200_000,
      federally_subsidized_amount: 12_500,
      adjusted_qualifying_income: 97_500,
      holding_period_percentage: 100,
    },
    reviewed_disposition: {
      document_reference: "closing-statement-14-main",
      basis_record_reference: "basis-record-14-main",
      source_transaction_id: "sale-14-main",
      owner_ssn: "123456789",
      property_address: home,
      disposition_date: "2025-03-01",
      sales_price_of_interest: 300_000,
      selling_expenses: 18_000,
      adjusted_basis_of_interest: 250_000,
      gain_included_in_gross_income: 6_000,
      exclusion_record_reference: "home-exclusion-14-main",
    },
    disposition_kind: "sale",
    property_address: home,
    subsidy_type: "mortgage_credit_certificate",
    issuer_type: "agency",
    issuer_name: reissue.issuer_name,
    issuer_state: "ID",
    original_lender_name: "Example Bank",
    original_lender_address: {
      line1: "10 Bank St",
      city: "Boise",
      state: "ID",
      zip: "83702",
    },
    original_loan_closing_date: reissue.original_loan_closing_date,
    disposition_date: "2025-03-01",
    full_repayment_date: "2025-03-01",
    sales_price_of_interest: 300_000,
    selling_expenses: 18_000,
    adjusted_basis_of_interest: 250_000,
    adjusted_gross_income: 105_000,
    tax_exempt_interest: 1_000,
    home_gain_included_in_gross_income: 6_000,
    family_size_at_disposition: 3,
    adjusted_qualifying_income: 97_500,
    highest_federally_subsidized_loan_amount: 200_000,
    issuer_federally_subsidized_amount: 12_500,
    issuer_holding_period_percentage: 100,
    reviewed_mcc_reissue: {
      original_certificate_reference: reissue.original_certificate_reference,
      reissued_certificate_reference: reissue.reissued_certificate_reference,
      refinance_settlement_reference: reissue.refinance_settlement_reference,
      issuer_compliance_reference: reissue.issuer_compliance_reference,
      final_payoff_reference: "sale-payoff-14-main",
      original_certificate_issued_to_borrower_confirmed: true,
      original_certificate_replaced_entirely_confirmed: true,
      issuer_no_annual_credit_increase_confirmed: true,
      issuer_name: reissue.issuer_name,
      issuer_state: "ID",
      property_address: home,
      original_loan_closing_date: reissue.original_loan_closing_date,
      refinance_date: reissue.refinance_date,
      reissued_certificate_effective_date:
        reissue.reissued_certificate_effective_date,
      final_replacement_loan_payoff_date: "2025-03-01",
      original_certificate_outstanding_debt_at_refinance: 170_000,
      replacement_certificate_mortgage_debt: 160_000,
      original_certificate_credit_rate: 0.20,
      replacement_certificate_credit_rate: 0.18,
    },
  }],
};
const lines = calculateForm8396(reissuedMccSource, 1_000);
const fields = {
  ...reissuedMccSource,
  ...lines,
  credit_limit_worksheet_line1: 1_000,
  credit_limit_worksheet_line2: 0,
};
const pending = {
  schedule3: { line6g_mortgage_interest_credit: 800 },
  f1098: {
    f1098s: [{
      source_document_reference: "1098-2025-reissued-mcc",
      box1_mortgage_interest: 5_000,
    }],
  },
  f8828,
};

Deno.test("Form 8396 reissued MCC uses the original-loan annual ceiling", () => {
  assertEquals(lines.line1, 5_000);
  assertEquals(lines.line3, 800);
  assertEquals(lines.line9, 800);
  const xml = form8396.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<MortgageCreditCertificateRt>0.18000</MortgageCreditCertificateRt>",
  );
  assertStringIncludes(
    xml,
    "<MortgageInterestReductionAmt>800</MortgageInterestReductionAmt>",
  );
  assertStringIncludes(
    xml,
    "<MortgageInterestCreditAmt>800</MortgageInterestCreditAmt>",
  );
});

Deno.test("Form 8396 reissue source rejects debt, rate, date and holder tampering", () => {
  const cases = [
    { replacement_mortgage_amount: 171_000 },
    { replacement_certificate_credit_rate: 0.21 },
    { refinance_date: "2025-01-01" },
    { same_original_certificate_holders_confirmed: false },
  ];
  for (const change of cases) {
    assertEquals(
      form8396SourceSchema.safeParse({
        ...reissuedMccSource,
        reviewed_reissued_mcc: { ...reissue, ...change },
      }).success,
      false,
    );
  }
  assertEquals(
    calculateForm8396Line3(form8396SourceSchema.parse({
      ...reissuedMccSource,
      reviewed_reissued_mcc: {
        ...reissue,
        scheduled_original_loan_interest_2025: 2_000,
      },
    })),
    400,
  );
});

Deno.test("Form 8396 rejects tampered Form 8828 certificate lineage", () => {
  const item = f8828.f8828s[0];
  assertThrows(
    () =>
      form8396.build(fields, {
        pending: {
          ...pending,
          f8828: {
            f8828s: [{
              ...item,
              reviewed_mcc_reissue: {
                ...item.reviewed_mcc_reissue,
                reissued_certificate_reference: "other-certificate",
              },
            }],
          },
        },
      }),
    Error,
    "one matching Form 8828 certificate pair",
  );
  assertThrows(
    () =>
      form8396.build(fields, {
        pending: {
          ...pending,
          f8828: {
            f8828s: [{
              ...item,
              reviewed_mcc_reissue: {
                ...item.reviewed_mcc_reissue,
                replacement_certificate_mortgage_debt: 150_000,
              },
            }],
          },
        },
      }),
    Error,
    "terms differ from the linked Form 8828 source",
  );
  assertThrows(
    () => form8396.build({ ...fields, line3: 900 }, { pending }),
    Error,
    "line3 differs from its source calculation",
  );
});
