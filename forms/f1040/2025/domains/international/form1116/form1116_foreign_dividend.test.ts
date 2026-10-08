import { assert, assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { form1116 } from "../../../mef/forms/international/f1116/f1116.ts";
import { form1116Pdf } from "../../../pdf/forms/international/f1116/f1116.ts";
import { FilingStatus } from "../../../../nodes/types.ts";

const sourceReference = "2025 Canadian Fund Form 1099-DIV";
const holdingReview = {
  ex_dividend_date: "2025-06-15",
  qualifying_held_days_in_31_day_window: 24,
  diminished_risk_days_excluded: 2,
  no_related_payment_obligation_confirmed: true,
  ordinary_stock_holding_rule_confirmed: true,
  review_reference: "Canadian Fund holding ledger",
  reviewed_on: "2026-02-01",
};
const dividend = {
  recipient_tin: "111223333",
  payerName: "Canadian Fund",
  source_document_reference: sourceReference,
  isNominee: false,
  box11: false,
  box1a: 50_000,
  box7: 5_000,
  box8: "Canada",
  foreign_source_dividends_usd: 50_000,
  foreign_tax_irs_country_code: "CA",
  holdingPeriodDays: 30,
  foreign_tax_holding_review: holdingReview,
};
const review = {
  source_document_reference: sourceReference,
  all_foreign_tax_items_identified_confirmed: true,
  all_worldwide_income_sources_identified_confirmed: true,
  all_part_i_deductions_and_losses_except_standard_zero_confirmed: true,
  no_foreign_tax_reduction_confirmed: true,
  no_high_tax_kickout_confirmed: true,
  no_foreign_income_adjustment_confirmed: true,
  no_section_960c_increase_confirmed: true,
  no_international_boycott_confirmed: true,
  no_prior_year_carryover_or_carryback_confirmed: true,
  no_preferential_rate_income_confirmed: true,
  no_other_category_credit_confirmed: true,
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    f1099div: [dividend],
    form1116_review: {
      all_foreign_sources_reviewed: true,
      foreign_qualified_dividends: 0,
      foreign_capital_gains_or_losses_present: false,
      source_document_references: [sourceReference],
      no_amt_liability_verified: true,
      single_source_pdf_review: review,
    },
    form1116_carryover_review: {
      reviews: [{
        income_category: "passive",
        prior_year_form1116_line23_limit: 500,
        prior_year_form1116_line24_allowed_credit: 500,
        prior_year_schedule_b_line8_balance: 0,
        source_document_references: [
          "Filed 2024 passive Form 1116 and Schedule B",
        ],
        no_foreign_tax_redetermination_or_special_adjustment: true,
      }],
    },
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("one ordinary foreign 1099-DIV reaches Form 1116, Schedule 3, Form 1040, native and PDF", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  assertEquals(result.pending.f1040.line3b_ordinary_dividends, 50_000);
  assertEquals(result.pending.f1040.line3a_qualified_dividends ?? 0, 0);
  const pdf = form1116Pdf.projectFields!(parent, result.pending);
  assertEquals(pdf.pdf_income_description, "Dividend income");
  assertEquals(pdf.pdf_part2_us_dividend_a, 5_000);
  assertEquals(
    pdf.pdf_line35,
    result.pending.schedule3.line1_foreign_tax_credit,
  );
  const [xml] = form1116.build(parent as Parameters<typeof form1116.build>[0], {
    pending: result.pending,
  });
  assert(
    xml.includes(
      "<USTaxWithheldOnDividendAmt>5000</USTaxWithheldOnDividendAmt>",
    ),
  );
});

Deno.test("foreign dividend native and PDF replay reject source, holding and return tampering", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  for (
    const pending of [
      {
        ...result.pending,
        f1099div: { f1099divs: [{ ...dividend, box7: 4_999 }] },
      },
      {
        ...result.pending,
        f1099div: {
          f1099divs: [{
            ...dividend,
            foreign_tax_holding_review: {
              ...holdingReview,
              qualifying_held_days_in_31_day_window: 15,
            },
          }],
        },
      },
      {
        ...result.pending,
        f1099div: {
          f1099divs: [{
            ...dividend,
            foreign_tax_holding_review: {
              ...holdingReview,
              no_related_payment_obligation_confirmed: false,
            },
          }],
        },
      },
      {
        ...result.pending,
        f1099div: {
          f1099divs: [{
            ...dividend,
            foreign_tax_holding_review: {
              ...holdingReview,
              diminished_risk_days_excluded: 8,
            },
          }],
        },
      },
      {
        ...result.pending,
        f1040: { ...result.pending.f1040, line3b_ordinary_dividends: 49_999 },
      },
    ]
  ) {
    assertThrows(
      () =>
        form1116.build(parent as Parameters<typeof form1116.build>[0], {
          pending,
        }),
      Error,
    );
    assertThrows(() => form1116Pdf.projectFields!(parent, pending), Error);
  }
});
