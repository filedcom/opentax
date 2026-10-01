import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import { computeF8828Lines, f8828 } from "./index.ts";

function transaction(overrides: Record<string, unknown> = {}) {
  const facts = {
    property_address: {
      line1: "14 Main St",
      city: "Boise",
      state: "ID",
      zip: "83702",
    },
    subsidy_type: "tax_exempt_bond_loan",
    disposition_kind: "sale",
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
    ...overrides,
  };
  const source_transaction_id =
    `${facts.disposition_kind}-${facts.property_address.line1}`;
  return {
    ...facts,
    source_transaction_id,
    reviewed_issuer: {
      document_reference: "issuer-notification-14-main",
      borrower_ssn: "123456789",
      issuer_name: facts.issuer_name,
      issuer_state: facts.issuer_state,
      issuer_type: facts.issuer_type,
      original_loan_closing_date: facts.original_loan_closing_date,
      highest_federally_subsidized_loan_amount:
        facts.highest_federally_subsidized_loan_amount,
      federally_subsidized_amount: facts.issuer_federally_subsidized_amount,
      adjusted_qualifying_income: facts.adjusted_qualifying_income,
      holding_period_percentage: facts.issuer_holding_period_percentage,
    },
    reviewed_disposition: {
      document_reference: facts.disposition_kind === "gift"
        ? "gift-deed-14-main"
        : "closing-statement-14-main",
      basis_record_reference: "basis-record-14-main",
      source_transaction_id,
      owner_ssn: "123456789",
      property_address: facts.property_address,
      disposition_date: facts.disposition_date,
      sales_price_of_interest: facts.sales_price_of_interest,
      selling_expenses: facts.selling_expenses,
      adjusted_basis_of_interest: facts.adjusted_basis_of_interest,
      gain_included_in_gross_income: facts.home_gain_included_in_gross_income,
      ...(facts.disposition_kind === "sale"
        ? { exclusion_record_reference: "home-exclusion-14-main" }
        : {}),
    },
  };
}

function gift(overrides: Record<string, unknown> = {}) {
  const disposition = transaction({
    disposition_kind: "gift",
    sales_price_of_interest: 280_000,
    selling_expenses: 0,
    home_gain_included_in_gross_income: 0,
    ...overrides,
  });
  return {
    ...disposition,
    reviewed_gift: {
      deed_reference: "gift-deed-14-main",
      valuation_reference: "appraisal-14-main",
      donee_name: "Adult Child",
      donee_relationship: "relative_other_than_spouse",
      donee_is_spouse_or_former_spouse: false,
      deed_date: disposition.disposition_date,
      fair_market_value_of_interest: disposition.sales_price_of_interest,
      loan_payoff_reference: "payoff-14-main",
      loan_payoff_date: disposition.full_repayment_date,
      entire_taxpayer_interest_transferred: true,
      no_consideration_confirmed: true,
    },
  };
}

function compute(...items: ReturnType<typeof transaction>[]) {
  const input = f8828.inputSchema.parse({ f8828s: items });
  return f8828.compute({ taxYear: 2025, formType: "f1040" }, input);
}

Deno.test("f8828: source-backed Form 8828 lines 9-23 route to Schedule 2 line 17b", () => {
  const item = f8828.inputSchema.parse({ f8828s: [transaction()] }).f8828s[0];
  const lines = computeF8828Lines(item);
  assertEquals(lines.line7_full_years, 4);
  assertEquals(lines.line7_full_months, 9);
  assertEquals(lines.line11_amount_realized, 282_000);
  assertEquals(lines.line13_gain_or_loss, 32_000);
  assertEquals(lines.line14_half_gain, 16_000);
  assertEquals(lines.line15_modified_agi, 100_000);
  assertEquals(lines.line17_income_excess, 2_500);
  assertEquals(lines.line18_income_percentage, 50);
  assertEquals(lines.line19_federally_subsidized_amount, 12_500);
  assertEquals(lines.line20_holding_period_percentage, 100);
  assertEquals(lines.line21_holding_adjusted_amount, 12_500);
  assertEquals(lines.line22_recapture_amount, 6_250);
  assertEquals(lines.line23_tax, 6_250);
  assertEquals(
    fieldsOf(compute(transaction()).outputs, schedule2)
      ?.line17b_mortgage_subsidy_recapture,
    6_250,
  );
});

Deno.test("f8828: gift outside divorce uses deed-date FMV as line 9 and recaptures tax", () => {
  const source = f8828.inputSchema.parse({ f8828s: [gift()] }).f8828s[0];
  const lines = computeF8828Lines(source);
  assertEquals(lines.line9_sales_price, 280_000);
  assertEquals(lines.line13_gain_or_loss, 30_000);
  assertEquals(lines.line23_tax, 12_500);
  assertEquals(
    fieldsOf(compute(gift()).outputs, schedule2)
      ?.line17b_mortgage_subsidy_recapture,
    12_500,
  );
});

Deno.test("f8828: gift needs exact deed, appraisal, payoff, and no-consideration facts", () => {
  const valid = gift();
  for (
    const reviewed_gift of [
      { ...valid.reviewed_gift, deed_date: "2025-02-28" },
      { ...valid.reviewed_gift, fair_market_value_of_interest: 250_000 },
      { ...valid.reviewed_gift, valuation_reference: "" },
      { ...valid.reviewed_gift, donee_relationship: "spouse" },
      { ...valid.reviewed_gift, donee_is_spouse_or_former_spouse: true },
      { ...valid.reviewed_gift, no_consideration_confirmed: false },
      { ...valid.reviewed_gift, loan_payoff_date: "2025-02-28" },
    ]
  ) {
    assertThrows(() => compute({ ...valid, reviewed_gift }), Error);
  }
  assertThrows(() => compute(gift({ selling_expenses: 100 })), Error);
  assertThrows(
    () => compute(gift({ home_gain_included_in_gross_income: 100 })),
    Error,
  );
});

Deno.test("f8828: income percentage rounds to nearest whole percent and caps at 100", () => {
  const partial = f8828.inputSchema.parse({
    f8828s: [transaction({ adjusted_qualifying_income: 98_725 })],
  }).f8828s[0];
  assertEquals(computeF8828Lines(partial).line18_income_percentage, 26);
  const full = f8828.inputSchema.parse({
    f8828s: [transaction({ adjusted_qualifying_income: 95_000 })],
  }).f8828s[0];
  assertEquals(computeF8828Lines(full).line18_income_percentage, 100);
});

Deno.test("f8828: half the gain caps tax and zero-gain form yields no Schedule 2 amount", () => {
  const capped = transaction({
    sales_price_of_interest: 269_000,
    adjusted_basis_of_interest: 250_000,
    adjusted_qualifying_income: 95_000,
    home_gain_included_in_gross_income: 0,
  });
  assertEquals(
    fieldsOf(compute(capped).outputs, schedule2)
      ?.line17b_mortgage_subsidy_recapture,
    500,
  );
  assertEquals(
    compute(transaction({
      adjusted_basis_of_interest: 282_000,
      home_gain_included_in_gross_income: 0,
    })).outputs,
    [],
  );
});

Deno.test("f8828: early full repayment uses the IRS holding period worksheet", () => {
  // Repayment after 2 years: 40%; sale 3 years later: 60%; line 20 = 24%.
  const item = transaction({
    original_loan_closing_date: "2020-01-01",
    full_repayment_date: "2022-01-01",
    disposition_date: "2025-01-01",
    issuer_holding_period_percentage: 24,
  });
  const lines = computeF8828Lines(
    f8828.inputSchema.parse({ f8828s: [item] }).f8828s[0],
  );
  assertEquals(lines.line20_holding_period_percentage, 24);
  assertEquals(lines.line23_tax, 1_500);
});

Deno.test("f8828: partial years use the issuer's year of disposition", () => {
  const yearSix = transaction({
    original_loan_closing_date: "2020-01-01",
    disposition_date: "2025-02-01",
    full_repayment_date: "2025-02-01",
    issuer_holding_period_percentage: 80,
  });
  assertEquals(
    computeF8828Lines(f8828.inputSchema.parse({ f8828s: [yearSix] }).f8828s[0])
      .line20_holding_period_percentage,
    80,
  );
});

Deno.test("f8828: multiple separate homes aggregate only calculated tax", () => {
  const result = compute(
    transaction(),
    transaction({
      property_address: {
        line1: "28 Hill St",
        city: "Boise",
        state: "ID",
        zip: "83702",
      },
    }),
  );
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17b_mortgage_subsidy_recapture,
    12_500,
  );
});

Deno.test("f8828: rejects tampered issuer amount, percentage, dates, and MAGI gain", () => {
  for (
    const change of [
      { issuer_federally_subsidized_amount: 375 },
      { issuer_holding_period_percentage: 80 },
      { original_loan_closing_date: "1990-12-31" },
      { disposition_date: "2019-12-31" },
      { full_repayment_date: "2026-01-01" },
      { home_gain_included_in_gross_income: 33_000 },
      { disposition_date: "2025-02-30" },
    ]
  ) {
    assertThrows(() => compute(transaction(change)), Error);
  }
});
