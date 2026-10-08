import { assertRejects } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { buildMefBundle } from "../../mef/builder.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";
import { assertSchedule2Form8828Tax } from "./schedule2-form8828-reconciliation.ts";

const filer = {
  primarySSN: "123456789",
  firstNameWithInitial: "Jane",
  lastName: "Taxpayer",
  fullName: "Jane Taxpayer",
  nameLine1: "JANE TAXPAYER",
  nameControl: "TAXP",
  address: {
    line1: "14 Main St",
    city: "Boise",
    state: "ID",
    zip: "83702",
  },
  filingStatus: FilingStatus.Single,
};

Deno.test("Schedule 2 line 17b rejects bare mortgage subsidy recapture", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line23_other_taxes: 1_000,
    },
    schedule2: { line17b_mortgage_subsidy_recapture: 1_000 },
  };
  for (
    const build of [
      () => buildMefBundle(pending, { filer, attachments: [] }),
      () => buildPdfBytes(pending, filer),
    ]
  ) {
    await assertRejects(
      build,
      Error,
      "Schedule 2 line 17b differs from retained Form 8828 tax",
    );
  }
});

Deno.test("Schedule 2 line 17b replays reviewed Form 8828 gift recapture before attachment gate", async () => {
  const property = {
    line1: "14 Main St",
    city: "Boise",
    state: "ID",
    zip: "83702",
  };
  const f8828 = {
    f8828s: [{
      source_transaction_id: "gift-14 Main St",
      property_address: property,
      subsidy_type: "tax_exempt_bond_loan",
      disposition_kind: "gift",
      issuer_type: "agency",
      issuer_name: "Idaho Housing Agency",
      issuer_state: "ID",
      original_lender_name: "Example Bank",
      original_lender_address: {
        line1: "10 Bank St",
        city: "Boise",
        state: "ID",
        zip: "83702",
      },
      original_loan_closing_date: "2020-06-01",
      disposition_date: "2025-03-01",
      full_repayment_date: "2025-03-01",
      sales_price_of_interest: 280_000,
      selling_expenses: 0,
      adjusted_basis_of_interest: 250_000,
      adjusted_gross_income: 105_000,
      tax_exempt_interest: 1_000,
      home_gain_included_in_gross_income: 0,
      family_size_at_disposition: 3,
      adjusted_qualifying_income: 97_500,
      highest_federally_subsidized_loan_amount: 200_000,
      issuer_federally_subsidized_amount: 12_500,
      issuer_holding_period_percentage: 100,
      reviewed_issuer: {
        document_reference: "issuer-notification-14-main",
        borrower_ssn: "123456789",
        issuer_name: "Idaho Housing Agency",
        issuer_state: "ID",
        issuer_type: "agency",
        original_loan_closing_date: "2020-06-01",
        highest_federally_subsidized_loan_amount: 200_000,
        federally_subsidized_amount: 12_500,
        adjusted_qualifying_income: 97_500,
        holding_period_percentage: 100,
      },
      reviewed_disposition: {
        document_reference: "gift-deed-14-main",
        basis_record_reference: "basis-record-14-main",
        source_transaction_id: "gift-14 Main St",
        owner_ssn: "123456789",
        property_address: property,
        disposition_date: "2025-03-01",
        sales_price_of_interest: 280_000,
        selling_expenses: 0,
        adjusted_basis_of_interest: 250_000,
        gain_included_in_gross_income: 0,
      },
      reviewed_gift: {
        deed_reference: "gift-deed-14-main",
        valuation_reference: "appraisal-14-main",
        donee_name: "Adult Child",
        donee_relationship: "relative_other_than_spouse",
        donee_is_spouse_or_former_spouse: false,
        deed_date: "2025-03-01",
        fair_market_value_of_interest: 280_000,
        loan_payoff_reference: "payoff-14-main",
        loan_payoff_date: "2025-03-01",
        entire_taxpayer_interest_transferred: true,
        no_consideration_confirmed: true,
      },
    }],
  };
  const pending = {
    f8828,
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line11_agi: 105_000,
      line23_other_taxes: 12_500,
    },
    schedule2: { line17b_mortgage_subsidy_recapture: 12_500 },
  };
  assertSchedule2Form8828Tax(pending);
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Form 8828 mortgage-credit recapture needs a native attachment",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Form 8828 mortgage-credit recapture needs a native attachment",
  );
  for (
    const build of [
      () =>
        buildMefBundle({
          ...pending,
          schedule2: { line17b_mortgage_subsidy_recapture: 12_499 },
        }, { filer, attachments: [] }),
      () =>
        buildPdfBytes({
          ...pending,
          schedule2: { line17b_mortgage_subsidy_recapture: 12_499 },
        }, filer),
    ]
  ) {
    await assertRejects(
      build,
      Error,
      "Schedule 2 line 17b differs from retained Form 8828 tax",
    );
  }
});
