import { assert, assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import { f1040_2025 } from "./index.ts";
import { form1116 } from "./mef/forms/f1116.ts";
import { form1116Pdf } from "./pdf/forms/f1116.ts";

const interestRef = "2025 Canadian interest copy";
const dividendRef = "2025 French dividend copy";
const interest = {
  payer_name: "Canadian Bank",
  box1: 20_000,
  box6: 2_000,
  box7: "Canada",
  foreign_source_interest_usd: 20_000,
  foreign_tax_irs_country_code: "CA",
  foreign_tax_source_document_reference: interestRef,
};
const holding = {
  ex_dividend_date: "2025-06-15",
  qualifying_held_days_in_31_day_window: 24,
  diminished_risk_days_excluded: 2,
  no_related_payment_obligation_confirmed: true,
  ordinary_stock_holding_rule_confirmed: true,
  review_reference: "French corporation holding ledger",
  reviewed_on: "2026-02-01",
};
const dividend = {
  payerName: "French Corporation",
  source_document_reference: dividendRef,
  isNominee: false,
  box11: false,
  box1a: 30_000,
  box7: 3_000,
  box8: "France",
  foreign_source_dividends_usd: 30_000,
  foreign_tax_irs_country_code: "FR",
  holdingPeriodDays: 30,
  foreign_tax_holding_review: holding,
};
const review = {
  column_a_interest_source_document_reference: interestRef,
  column_a_interest_irs_country_code: "CA",
  column_b_dividend_source_document_reference: dividendRef,
  column_b_dividend_irs_country_code: "FR",
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
    f1099int: [interest],
    f1099div: [dividend],
    form1116_review: {
      all_foreign_sources_reviewed: true,
      foreign_qualified_dividends: 0,
      foreign_capital_gains_or_losses_present: false,
      source_document_references: [interestRef, dividendRef],
      no_amt_liability_verified: true,
      two_country_mixed_pdf_review: review,
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

Deno.test("two-country interest and ordinary dividends reconcile the return, native Form 1116, and PDF columns", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  const pdf = form1116Pdf.projectFields!(parent, result.pending);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 20_000);
  assertEquals(result.pending.f1040.line3b_ordinary_dividends, 30_000);
  assertEquals(pdf.pdf_country_a, "CA");
  assertEquals(pdf.pdf_country_b, "FR");
  assertEquals(pdf.pdf_line3g_a, 6_300);
  assertEquals(pdf.pdf_line3g_b, 9_450);
  assertEquals(pdf.pdf_part2_us_interest_a, 2_000);
  assertEquals(pdf.pdf_part2_us_dividend_b, 3_000);
  assertEquals(
    pdf.pdf_line35,
    result.pending.schedule3.line1_foreign_tax_credit,
  );
  const [xml] = form1116.build(parent as Parameters<typeof form1116.build>[0], {
    pending: result.pending,
  });
  assert(xml.includes("<ForeignCountryCd>CA</ForeignCountryCd>"));
  assert(xml.includes("<ForeignCountryCd>FR</ForeignCountryCd>"));
  assert(
    xml.includes(
      "<USTaxWithheldOnInterestAmt>2000</USTaxWithheldOnInterestAmt>",
    ),
  );
  assert(
    xml.includes(
      "<USTaxWithheldOnDividendAmt>3000</USTaxWithheldOnDividendAmt>",
    ),
  );
});

Deno.test("two-country mixed credit rejects changed source, review, holding and return at both exports", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  const pendingCases = [
    {
      ...result.pending,
      f1099int: { f1099ints: [{ ...interest, box6: 1_999 }] },
    },
    {
      ...result.pending,
      f1099div: { f1099divs: [{ ...dividend, box7: 2_999 }] },
    },
    {
      ...result.pending,
      f1099div: {
        f1099divs: [{ ...dividend, foreign_tax_irs_country_code: "CA" }],
      },
    },
    {
      ...result.pending,
      f1099div: {
        f1099divs: [{ ...dividend, box8: undefined }],
      },
    },
    {
      ...result.pending,
      f1099div: {
        f1099divs: [{ ...dividend, source_document_reference: "Other copy" }],
      },
    },
    {
      ...result.pending,
      f1099div: {
        f1099divs: [{
          ...dividend,
          foreign_tax_holding_review: {
            ...holding,
            diminished_risk_days_excluded: 8,
          },
        }],
      },
    },
    {
      ...result.pending,
      f1040: { ...result.pending.f1040, line3b_ordinary_dividends: 29_999 },
    },
  ];
  for (const pending of pendingCases) {
    assertThrows(
      () =>
        form1116.build(parent as Parameters<typeof form1116.build>[0], {
          pending,
        }),
      Error,
    );
    assertThrows(() => form1116Pdf.projectFields!(parent, pending), Error);
  }
  const parentCases = [
    { ...parent, two_country_mixed_pdf_review: undefined },
    {
      ...parent,
      two_country_mixed_pdf_review: {
        ...review,
        column_b_dividend_irs_country_code: "CA",
      },
    },
  ];
  for (const changed of parentCases) {
    assertThrows(
      () =>
        form1116.build(changed as Parameters<typeof form1116.build>[0], {
          pending: result.pending,
        }),
      Error,
    );
    assertThrows(
      () => form1116Pdf.projectFields!(changed, result.pending),
      Error,
    );
  }
});
