import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  form1116,
  IncomeCategory,
  inputSchema as form1116InputSchema,
} from "../../../../../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";
import { stagedCase } from "./f1116_schedule_c.fixture.ts";
import { reconcileScheduleCCurrentYearCandidate } from "./f1116_schedule_c_current_year.ts";

const currentForm1116 = form1116InputSchema.parse({
  foreign_tax_items: [{
    foreign_tax_paid: 50,
    foreign_gross_income: 1_000,
    income_category: IncomeCategory.Passive,
    foreign_income_source_document_reference: "2025 bank interest statement",
    irs_country_code: "SW",
    tax_paid_or_accrued_date: "2025-05-01",
  }],
  worldwide_taxable_income: 10_000,
  worldwide_gross_income: 10_000,
  general_deductions: 0,
  us_tax_before_credits: 1_000,
  single_source_pdf_review: {
    source_document_reference: "2025 bank interest and tax record",
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
  },
});

function currentReturn() {
  const computed = form1116.compute(
    { taxYear: 2025, formType: "f1040" },
    currentForm1116,
  ).outputs;
  return {
    form_1116: {
      category_summaries: computed.find((row) => row.nodeType === "form_1116")
        ?.fields.category_summaries,
    },
    schedule3: {
      line1_foreign_tax_credit: 50,
      line1_total: 50,
      line8_total: 50,
    },
    f1040: {
      line15_taxable_income: 10_000,
      line16_income_tax: 1_000,
      line18_total_tax_before_credits: 1_000,
      line20_nonrefundable_credits: 50,
      line21_credits_total: 50,
      line22_tax_after_credits: 950,
      line24_total_tax: 950,
      form1116_line18_worldwide_taxable_income: 10_000,
      form1116_line20_us_tax: 1_000,
    },
  };
}

Deno.test("Schedule C staged refund joins a no-carryover 2025 Form 1116, Schedule 3, and Form 1040", () => {
  const { ledger, evidence } = stagedCase();
  const result = reconcileScheduleCCurrentYearCandidate(
    ledger,
    evidence,
    currentForm1116,
    currentReturn(),
  );
  assertEquals(result.current_year_credit, 50);
  assertEquals(result.schedule_b_required, false);
  assertEquals(result.export_ready, false);
  assertStringIncludes(result.native_xml_candidate, "<IRS1116ScheduleC>");
  assertEquals(result.pdf_fields_candidate.part3_col5, 80);
  assertThrows(
    () =>
      form1116.compute(
        { taxYear: 2025, formType: "f1040" },
        { ...currentForm1116, foreign_tax_redeterminations: [ledger] },
      ),
    Error,
    "authenticated affected-year filing and amendment receipts",
  );
});

Deno.test("Schedule C current-year join rejects changed credit, tax total, and Schedule B", () => {
  const { ledger, evidence } = stagedCase();
  const base = currentReturn();
  assertThrows(
    () =>
      reconcileScheduleCCurrentYearCandidate(
        ledger,
        evidence,
        currentForm1116,
        { ...base, schedule3: { ...base.schedule3, line1_total: 49 } },
      ),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      reconcileScheduleCCurrentYearCandidate(
        ledger,
        evidence,
        currentForm1116,
        { ...base, f1040: { ...base.f1040, line24_total_tax: 949 } },
      ),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      reconcileScheduleCCurrentYearCandidate(
        ledger,
        evidence,
        currentForm1116,
        { ...base, form1116_schedule_b: { current_year_excess_tax: 1 } },
      ),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      reconcileScheduleCCurrentYearCandidate(
        ledger,
        evidence,
        {
          ...currentForm1116,
          prior_year_carryovers: [{
            income_category: IncomeCategory.Passive,
            vintages: [{
              vintage_tax_year: 2024,
              prior_year_schedule_b_line8_vintage_amount: 1,
            }],
            prior_year_schedule_b_line8_total: 1,
            prior_year_schedule_b_line8_other_vintages_total: 0,
            no_intervening_adjustments: true,
            source_document_references: ["2024 Schedule B"],
          }],
        },
        base,
      ),
    Error,
    "no carryover",
  );
});
