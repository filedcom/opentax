import { assert, assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { form1116 } from "../../../mef/forms/international/f1116/f1116.ts";
import { form1116Pdf } from "../../../pdf/forms/international/f1116/f1116.ts";
import { form1116ScheduleB } from "../../../mef/forms/international/f1116/f1116_schedule_b.ts";
import { form1116ScheduleBPdf } from "../../../pdf/forms/international/f1116/f1116_schedule_b.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { FilingStatus } from "../../../../nodes/types.ts";

const canadaRef = "2025 Canadian Bank 1099-INT";
const franceRef = "2025 French Bank 1099-INT";
const canada = {
  recipient_tin: "111223333",
  payer_name: "Canadian Bank",
  box1: 20_000,
  box6: 4_000,
  box7: "Canada",
  foreign_source_interest_usd: 20_000,
  foreign_tax_irs_country_code: "CA",
  foreign_tax_source_document_reference: canadaRef,
};
const france = {
  recipient_tin: "111223333",
  payer_name: "French Bank",
  box1: 30_000,
  box6: 5_000,
  box7: "France",
  foreign_source_interest_usd: 30_000,
  foreign_tax_irs_country_code: "FR",
  foreign_tax_source_document_reference: franceRef,
};
const review = {
  column_a_source_document_reference: canadaRef,
  column_a_irs_country_code: "CA",
  column_b_source_document_reference: franceRef,
  column_b_irs_country_code: "FR",
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
      digital_assets: false,
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
      two_country_interest_pdf_review: review,
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

Deno.test("two countries' passive interest reconciles Form 1116 columns A/B, Schedule 3, Form 1040 and native sources", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  const summary = (parent.category_summaries as
    | Array<{
      automaticallyApportionedDeductions: number;
      foreignGrossIncome: number;
    }>
    | undefined)?.[0];
  assert(summary);
  assertEquals(summary.foreignGrossIncome, 50_000);
  assertEquals(summary.automaticallyApportionedDeductions, 15_750);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 50_000);
  const pdf = form1116Pdf.projectFields!(parent, result.pending);
  assertEquals(pdf.pdf_country_a, "Canada");
  assertEquals(pdf.pdf_country_b, "France");
  assertEquals(pdf.pdf_line1a_a, 20_000);
  assertEquals(pdf.pdf_line1a_b, 30_000);
  assertEquals(pdf.pdf_line3g_a, 6_300);
  assertEquals(pdf.pdf_line3g_b, 9_450);
  assertEquals(pdf.pdf_part2_us_interest_a, 4_000);
  assertEquals(pdf.pdf_part2_us_interest_b, 5_000);
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
      "<USTaxWithheldOnInterestAmt>4000</USTaxWithheldOnInterestAmt>",
    ),
  );
  assert(
    xml.includes(
      "<USTaxWithheldOnInterestAmt>5000</USTaxWithheldOnInterestAmt>",
    ),
  );
});

Deno.test("two-country passive interest rejects changed payer, country, review, tax and return at native/PDF export", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  for (
    const pending of [
      {
        ...result.pending,
        f1099int: { f1099ints: [canada, { ...france, box6: 4_999 }] },
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
        f1099int: {
          f1099ints: [canada, {
            ...france,
            foreign_tax_source_document_reference: "Other France copy",
          }],
        },
      },
      {
        ...result.pending,
        f1040: { ...result.pending.f1040, line2b_taxable_interest: 49_999 },
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
  const conflicting = {
    ...parent,
    multi_source_pdf_review: {
      ...review,
      payer_source_document_references: [canadaRef, franceRef],
    },
  };
  assertThrows(
    () =>
      form1116.build(conflicting as Parameters<typeof form1116.build>[0], {
        pending: result.pending,
      }),
    Error,
  );
  assertThrows(
    () => form1116Pdf.projectFields!(conflicting, result.pending),
    Error,
  );
  const missingReview = {
    ...parent,
    two_country_interest_pdf_review: undefined,
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
});

Deno.test("two-country passive interest uses a filed 2024 vintage through both Form 1116 attachments", async () => {
  const filedForm1040Id = "filed-2024-form1040-111223333";
  const filedScheduleBId = "filed-2024-passive-schedule-b-111223333";
  const carryoverSource = {
    income_category: "passive",
    vintages: [{
      vintage_tax_year: 2024,
      prior_year_schedule_b_line8_vintage_amount: 500,
    }],
    prior_year_schedule_b_line8_total: 500,
    prior_year_schedule_b_line8_other_vintages_total: 0,
    no_intervening_adjustments: true,
    source_document_references: [filedForm1040Id, filedScheduleBId],
    filed_2024_schedule_b: {
      taxpayer_ssn: "111223333",
      tax_year: 2024 as const,
      income_category: "passive" as const,
      form1040_source_document_id: filedForm1040Id,
      schedule_b_source_document_id: filedScheduleBId,
      line8_2024_current_year_amount: 500,
      line8_total: 500,
    },
  };
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: FilingStatus.Single,
      digital_assets: false,
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
    f1099int: [{ ...canada, box6: 100 }, { ...france, box6: 100 }],
    form1116_review: {
      all_foreign_sources_reviewed: true,
      foreign_qualified_dividends: 0,
      foreign_capital_gains_or_losses_present: false,
      source_document_references: [canadaRef, franceRef],
      no_amt_liability_verified: true,
      two_country_interest_pdf_review: {
        ...review,
        no_prior_year_carryover_or_carryback_confirmed: false,
      },
    },
    form1116_prior_carryover: { carryovers: [carryoverSource] },
  });
  assertEquals(result.diagnostics, []);
  const parent = result.pending.form_1116;
  const scheduleB = result.pending.form1116_schedule_b;
  assert(parent && scheduleB);
  const summary = (parent.category_summaries as Array<{
    allowedCredit: number;
    usedPriorYearCarryover: number;
  }>)[0];
  assertEquals(summary.usedPriorYearCarryover, 500);
  assertEquals(summary.allowedCredit, 700);
  assertEquals(result.pending.schedule3.line1_foreign_tax_credit, 700);
  assertEquals(
    result.pending.f1040.line20_nonrefundable_credits,
    result.pending.schedule3.line8_total,
  );
  const parentPdf = form1116Pdf.projectFields!(parent, result.pending);
  const schedulePdf = form1116ScheduleBPdf.projectFields!(
    scheduleB,
    result.pending,
  );
  assertEquals(parentPdf.pdf_country_a, "Canada");
  assertEquals(parentPdf.pdf_country_b, "France");
  assertEquals(parentPdf.pdf_line10, 500);
  assertEquals(parentPdf.pdf_line35, 700);
  assertEquals(schedulePdf.line1_2024, 500);
  assertEquals(schedulePdf.line4_2024, -500);
  assertEquals(schedulePdf.line8_2024, 0);
  const [parentXml] = form1116.build(
    parent as Parameters<typeof form1116.build>[0],
    { pending: result.pending },
  );
  const scheduleXml = form1116ScheduleB.build(
    scheduleB as Parameters<typeof form1116ScheduleB.build>[0],
    { pending: result.pending },
  );
  assert(parentXml.includes("<ForeignCountryCd>CA</ForeignCountryCd>"));
  assert(parentXml.includes("<ForeignCountryCd>FR</ForeignCountryCd>"));
  assert(
    parentXml.includes(
      "<ForeignTaxCrCarrybackOrOverAmt>500</ForeignTaxCrCarrybackOrOverAmt>",
    ),
  );
  assert(
    scheduleXml.includes("<FirstPrecedingTYAmt>500</FirstPrecedingTYAmt>"),
  );
  const filer =
    pdfReviewFixtures.find((fixture) => fixture.id === "single-w2-refund")!
      .filer;
  const fullPending = buildPending(result.pending);
  const bundle = await buildMefBundle(fullPending, { filer, attachments: [] });
  assert(bundle.xml.includes("<IRS1116ScheduleB "));
  assert(bundle.xml.includes("<ForeignCountryCd>FR</ForeignCountryCd>"));
  assert(
    (await buildPdfBytes(fullPending, filer, ".pdf-cache", bundle)).length > 0,
  );

  const changedSource = {
    ...result.pending,
    form1116_schedule_b: {
      ...scheduleB,
      prior_year_carryover_source: {
        ...carryoverSource,
        source_document_references: ["Unreviewed 2024 Schedule B"],
      },
    },
  };
  assertThrows(
    () =>
      form1116.build(parent as Parameters<typeof form1116.build>[0], {
        pending: changedSource,
      }),
    Error,
    "filed source",
  );
  assertThrows(
    () => form1116Pdf.projectFields!(parent, changedSource),
    Error,
    "filed source",
  );
  assertThrows(
    () =>
      form1116ScheduleBPdf.projectFields!(
        changedSource.form1116_schedule_b,
        changedSource,
      ),
    Error,
    "filed source",
  );
  assertThrows(
    () =>
      form1116ScheduleB.build(
        changedSource.form1116_schedule_b as Parameters<
          typeof form1116ScheduleB.build
        >[0],
        { pending: changedSource },
      ),
    Error,
    "filed source",
  );
  const changedCountry = {
    ...result.pending,
    f1099int: {
      f1099ints: [{ ...canada, box6: 100 }, {
        ...france,
        box6: 100,
        foreign_tax_irs_country_code: "CA",
      }],
    },
  };
  assertThrows(
    () =>
      form1116.build(parent as Parameters<typeof form1116.build>[0], {
        pending: changedCountry,
      }),
    Error,
  );
  assertThrows(() => form1116Pdf.projectFields!(parent, changedCountry), Error);
  const changedSchedule3 = {
    ...result.pending,
    schedule3: {
      ...result.pending.schedule3,
      line1_foreign_tax_credit: 699,
    },
  };
  assertThrows(
    () =>
      form1116ScheduleB.build(
        scheduleB as Parameters<typeof form1116ScheduleB.build>[0],
        { pending: changedSchedule3 },
      ),
    Error,
  );
  const changedReturn = {
    ...result.pending,
    f1040: {
      ...result.pending.f1040,
      line20_nonrefundable_credits: 699,
    },
  };
  assertThrows(
    () =>
      form1116.build(parent as Parameters<typeof form1116.build>[0], {
        pending: changedReturn,
      }),
    Error,
  );
  assertThrows(() => form1116Pdf.projectFields!(parent, changedReturn), Error);
  assertThrows(
    () => form1116ScheduleBPdf.projectFields!(scheduleB, changedReturn),
    Error,
  );
  assertThrows(
    () =>
      form1116ScheduleB.build(
        scheduleB as Parameters<typeof form1116ScheduleB.build>[0],
        { pending: changedReturn },
      ),
    Error,
  );
});
