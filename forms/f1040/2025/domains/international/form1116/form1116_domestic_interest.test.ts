import { assert, assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { form1116 } from "../../../mef/forms/international/f1116/f1116.ts";
import { form1116Pdf } from "../../../pdf/forms/international/f1116/f1116.ts";
import { FilingStatus } from "../../../../nodes/types.ts";

const foreignReference = "2025 Canadian bank Form 1099-INT";
const domesticReference = "2025 U.S. bank Form 1099-INT";

const foreignPayer = {
  recipient_tin: "111223333",
  payer_name: "Canadian Bank",
  box1: 50_000,
  box6: 9_000,
  box7: "Canada",
  foreign_source_interest_usd: 50_000,
  foreign_tax_irs_country_code: "CA",
  foreign_tax_source_document_reference: foreignReference,
};

const domesticPayer = {
  recipient_tin: "111223333",
  payer_name: "Domestic Bank",
  source_document_reference: domesticReference,
  box1: 10_000,
};

const review = {
  source_document_reference: foreignReference,
  domestic_interest_source_document_reference: domesticReference,
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
    f1099int: [foreignPayer, domesticPayer],
    form1116_review: {
      all_foreign_sources_reviewed: true,
      foreign_qualified_dividends: 0,
      foreign_capital_gains_or_losses_present: false,
      source_document_references: [foreignReference, domesticReference],
      no_amt_liability_verified: true,
      single_source_pdf_review: review,
    },
    form1116_carryover_review: {
      reviews: [{
        income_category: "passive",
        prior_year_form1116_line23_limit: 700,
        prior_year_form1116_line24_allowed_credit: 700,
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

Deno.test("separate foreign and domestic-interest 1099-INT payers reconcile Form 1116, Form 1040, native and PDF", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 60_000);
  assertEquals(result.pending.f1040.line11_agi, 60_000);
  const pdf = form1116Pdf.projectFields!(parent, result.pending);
  assertEquals(pdf.pdf_line1a_a, 50_000);
  assertEquals(pdf.pdf_line3e_a, 60_000);
  assertEquals(pdf.pdf_line3g_a, 13_125);
  assertEquals(pdf.pdf_line7, 36_875);
  assertEquals(
    pdf.pdf_line35,
    result.pending.schedule3.line1_foreign_tax_credit,
  );
  const [xml] = form1116.build(parent as Parameters<typeof form1116.build>[0], {
    pending: result.pending,
  });
  assert(xml.includes("<GrossIncomeAmt>60000</GrossIncomeAmt>"));
  assert(
    xml.includes(
      "<ProRataDeductionsNotRelatedAmt>13125</ProRataDeductionsNotRelatedAmt>",
    ),
  );
});

Deno.test("two-payer Form 1116 with domestic interest rejects changed domestic interest, source review, foreign tax and final return", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  const changed = (overrides: Record<string, Record<string, unknown>>) => ({
    ...result.pending,
    ...overrides,
  });
  for (
    const pending of [
      changed({
        f1099int: {
          f1099ints: [foreignPayer, { ...domesticPayer, box1: 9_999 }],
        },
      }),
      changed({
        f1099int: {
          f1099ints: [foreignPayer, {
            ...domesticPayer,
            source_document_reference: "Other bank",
          }],
        },
      }),
      changed({
        f1099int: {
          f1099ints: [{ ...foreignPayer, box6: 8_999 }, domesticPayer],
        },
      }),
      changed({
        f1040: { ...result.pending.f1040, line2b_taxable_interest: 59_999 },
      }),
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
  const changedReview = {
    ...parent,
    single_source_pdf_review: {
      ...review,
      domestic_interest_source_document_reference: "Other bank document",
    },
  };
  assertThrows(() =>
    form1116.build(
      changedReview as Parameters<typeof form1116.build>[0],
      { pending: result.pending },
    )
  );
  assertThrows(() => form1116Pdf.projectFields!(changedReview, result.pending));
});
