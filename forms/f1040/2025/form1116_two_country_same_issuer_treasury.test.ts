import { assert, assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { form1116 } from "./mef/forms/f1116.ts";
import { form1116Pdf } from "./pdf/forms/f1116.ts";
import { FilingStatus } from "../nodes/types.ts";

const canadaRef = "2025 Canadian Bank combined Form 1099-INT";
const franceRef = "2025 French Bank Form 1099-INT";
const canada = {
  payer_name: "Canadian Bank",
  source_document_reference: canadaRef,
  foreign_tax_source_document_reference: canadaRef,
  box1: 20_000,
  box3: 10_000,
  box6: 4_000,
  box7: "Canada",
  foreign_source_interest_usd: 20_000,
  foreign_tax_irs_country_code: "CA",
};
const france = {
  payer_name: "French Bank",
  foreign_tax_source_document_reference: franceRef,
  box1: 30_000,
  box6: 5_000,
  box7: "France",
  foreign_source_interest_usd: 30_000,
  foreign_tax_irs_country_code: "FR",
};
const review = {
  column_a_source_document_reference: canadaRef,
  column_a_irs_country_code: "CA",
  column_b_source_document_reference: franceRef,
  column_b_irs_country_code: "FR",
  domestic_treasury_source_document_reference: canadaRef,
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
    f1099int: [canada, france],
    form1116_review: {
      all_foreign_sources_reviewed: true,
      foreign_qualified_dividends: 0,
      foreign_capital_gains_or_losses_present: false,
      source_document_references: [canadaRef, franceRef],
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

Deno.test("two-country passive Form 1116 joins foreign and U.S. Treasury interest on one issued 1099-INT", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  const summary = (parent.category_summaries as Array<{
    foreignGrossIncome: number;
    automaticallyApportionedDeductions: number;
  }>)[0];
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

Deno.test("two-country same-issuer Treasury route rejects changed box 3, source identity, tax, review, and final return", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  for (
    const pending of [
      {
        ...result.pending,
        f1099int: { f1099ints: [{ ...canada, box3: 9_999 }, france] },
      },
      {
        ...result.pending,
        f1099int: {
          f1099ints: [{
            ...canada,
            source_document_reference: "Other 1099-INT",
          }, france],
        },
      },
      {
        ...result.pending,
        f1099int: { f1099ints: [{ ...canada, box6: 3_999 }, france] },
      },
      {
        ...result.pending,
        f1099int: {
          f1099ints: [canada, {
            ...france,
            foreign_tax_irs_country_code: "CA",
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
  assertThrows(
    () =>
      form1116.build(
        {
          ...parent,
          two_country_treasury_pdf_review: {
            ...review,
            domestic_treasury_source_document_reference: franceRef,
          },
        } as Parameters<typeof form1116.build>[0],
        { pending: result.pending },
      ),
    Error,
  );
});
