import { assert, assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { form1116 } from "./mef/forms/f1116.ts";
import { form1116Pdf } from "./pdf/forms/f1116.ts";
import { FilingStatus } from "../nodes/types.ts";

const canadaRef = "2025 Canadian Bank 1099-INT";
const franceRef = "2025 French Bank 1099-INT";
const treasuryRef = "2025 Treasury Broker 1099-INT";
const canada = {
  payer_name: "Canadian Bank",
  box1: 20_000,
  box6: 4_000,
  box7: "Canada",
  foreign_source_interest_usd: 20_000,
  foreign_tax_irs_country_code: "CA",
  foreign_tax_source_document_reference: canadaRef,
};
const france = {
  payer_name: "French Bank",
  box1: 30_000,
  box6: 5_000,
  box7: "France",
  foreign_source_interest_usd: 30_000,
  foreign_tax_irs_country_code: "FR",
  foreign_tax_source_document_reference: franceRef,
};
const treasury = {
  payer_name: "Treasury Broker",
  source_document_reference: treasuryRef,
  box3: 10_000,
};
const review = {
  column_a_source_document_reference: canadaRef,
  column_a_irs_country_code: "CA",
  column_b_source_document_reference: franceRef,
  column_b_irs_country_code: "FR",
  domestic_treasury_source_document_reference: treasuryRef,
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
    f1099int: [canada, france, treasury],
    form1116_review: {
      all_foreign_sources_reviewed: true,
      foreign_qualified_dividends: 0,
      foreign_capital_gains_or_losses_present: false,
      source_document_references: [canadaRef, franceRef, treasuryRef],
      no_amt_liability_verified: true,
      two_country_treasury_pdf_review: review,
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

Deno.test("two countries plus one Treasury payer reconcile Form 1116, worldwide denominator, native and PDF", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  const summary = (parent.category_summaries as
    | Array<{
      foreignGrossIncome: number;
      automaticallyApportionedDeductions: number;
    }>
    | undefined)?.[0];
  assert(summary);
  assertEquals(summary.foreignGrossIncome, 50_000);
  assertEquals(summary.automaticallyApportionedDeductions, 13_125);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 60_000);
  const pdf = form1116Pdf.projectFields!(parent, result.pending);
  assertEquals(pdf.pdf_country_a, "CA");
  assertEquals(pdf.pdf_country_b, "FR");
  assertEquals(pdf.pdf_line1a_a, 20_000);
  assertEquals(pdf.pdf_line1a_b, 30_000);
  assertEquals(pdf.pdf_line3e_a, 60_000);
  assertEquals(pdf.pdf_line3e_b, 60_000);
  assertEquals(pdf.pdf_line3g_a, 5_250);
  assertEquals(pdf.pdf_line3g_b, 7_875);
  assertEquals(pdf.pdf_line7, 36_875);
  assertEquals(pdf.pdf_part2_us_interest_a, 4_000);
  assertEquals(pdf.pdf_part2_us_interest_b, 5_000);
  assertEquals(
    pdf.pdf_line35,
    result.pending.schedule3.line1_foreign_tax_credit,
  );
  const [xml] = form1116.build(parent as Parameters<typeof form1116.build>[0], {
    pending: result.pending,
  });
  assert(xml.includes("<GrossIncomeAmt>60000</GrossIncomeAmt>"));
  assert(xml.includes("<ForeignCountryCd>CA</ForeignCountryCd>"));
  assert(xml.includes("<ForeignCountryCd>FR</ForeignCountryCd>"));
  assert(
    xml.includes(
      "<ProRataDeductionsNotRelatedAmt>5250</ProRataDeductionsNotRelatedAmt>",
    ),
  );
  assert(
    xml.includes(
      "<ProRataDeductionsNotRelatedAmt>7875</ProRataDeductionsNotRelatedAmt>",
    ),
  );
});

Deno.test("two-country Treasury route rejects changed domestic/foreign payer, review and return at native/PDF export", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  for (
    const pending of [
      {
        ...result.pending,
        f1099int: { f1099ints: [canada, france, { ...treasury, box3: 9_999 }] },
      },
      {
        ...result.pending,
        f1099int: { f1099ints: [canada, { ...france, box6: 4_999 }, treasury] },
      },
      {
        ...result.pending,
        f1099int: {
          f1099ints: [
            canada,
            { ...france, foreign_tax_irs_country_code: "CA" },
            treasury,
          ],
        },
      },
      {
        ...result.pending,
        f1099int: {
          f1099ints: [canada, france, {
            ...treasury,
            source_document_reference: "Other broker",
          }],
        },
      },
      {
        ...result.pending,
        f1040: { ...result.pending.f1040, line2b_taxable_interest: 59_999 },
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
  const missingReview = {
    ...parent,
    two_country_treasury_pdf_review: undefined,
  };
  assertThrows(
    () =>
      form1116.build(missingReview as Parameters<typeof form1116.build>[0], {
        pending: result.pending,
      }),
    Error,
  );
  assertThrows(
    () => form1116Pdf.projectFields!(missingReview, result.pending),
    Error,
  );
  const conflictingReview = {
    ...parent,
    two_country_interest_pdf_review: {
      ...review,
      domestic_treasury_source_document_reference: undefined,
    },
  };
  assertThrows(
    () =>
      form1116.build(
        conflictingReview as Parameters<typeof form1116.build>[0],
        { pending: result.pending },
      ),
    Error,
  );
  assertThrows(
    () => form1116Pdf.projectFields!(conflictingReview, result.pending),
    Error,
  );
});
