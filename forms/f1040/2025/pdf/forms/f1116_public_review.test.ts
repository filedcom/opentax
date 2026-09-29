import { assert, assertEquals, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { form1116Pdf } from "./f1116.ts";
import { form1116ScheduleBPdf } from "./f1116_schedule_b.ts";

const bankReference = "2025 Canadian bank Form 1099-INT and source review";

const singleSourceReview = {
  source_document_reference: bankReference,
  all_foreign_tax_items_identified_confirmed: true as const,
  all_worldwide_income_sources_identified_confirmed: true as const,
  all_part_i_deductions_and_losses_except_standard_zero_confirmed:
    true as const,
  no_foreign_tax_reduction_confirmed: true as const,
  no_high_tax_kickout_confirmed: true as const,
  no_foreign_income_adjustment_confirmed: true as const,
  no_section_960c_increase_confirmed: true as const,
  no_international_boycott_confirmed: true as const,
  no_prior_year_carryover_or_carryback_confirmed: true as const,
  no_preferential_rate_income_confirmed: true as const,
  no_other_category_credit_confirmed: true as const,
};

function inputs() {
  return {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      digital_assets: false,
    },
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    f1099int: [{
      payer_name: "Canadian Bank",
      box1: 50_000,
      box6: 9_000,
      box7: "Canada",
      foreign_source_interest_usd: 50_000,
      foreign_tax_irs_country_code: "CA",
      foreign_tax_source_document_reference: bankReference,
    }],
    form1116_review: {
      all_foreign_sources_reviewed: true as const,
      foreign_qualified_dividends: 0 as const,
      foreign_capital_gains_or_losses_present: false as const,
      source_document_references: [bankReference],
      no_amt_liability_verified: true as const,
      single_source_pdf_review: singleSourceReview,
    },
    form1116_carryover_review: {
      reviews: [{
        income_category: "passive",
        prior_year_form1116_line23_limit: 700,
        prior_year_form1116_line24_allowed_credit: 700,
        prior_year_schedule_b_line8_balance: 0,
        source_document_references: [
          "Filed 2024 passive Form 1116 lines 23-24 and Schedule B line 8",
        ],
        no_foreign_tax_redetermination_or_special_adjustment: true,
      }],
    },
  };
}

function calculated() {
  return execute(buildExecutionPlan(registry), registry, inputs(), {
    taxYear: 2025,
    formType: "f1040",
  });
}

Deno.test("Form 1116 public review joins one sourced interest tax, standard deduction, and current excess Schedule B", () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  const parent = result.pending.form_1116;
  const scheduleB = result.pending.form1116_schedule_b;
  const f1040 = result.pending.f1040;
  assert(parent);
  assert(scheduleB);
  assert(f1040);
  assertEquals(parent.single_source_pdf_review, singleSourceReview);
  const standardDeduction = f1040.line12a_standard_deduction as number;
  assert(standardDeduction > 0);
  const projected = form1116Pdf.projectFields?.(parent, result.pending) ?? {};
  assertEquals(projected.pdf_line3a_a, standardDeduction);
  assertEquals(projected.pdf_line3g_a, standardDeduction);
  assertEquals(projected.pdf_line6_total, standardDeduction);
  assertEquals(projected.pdf_line7, 50_000 - standardDeduction);
  assertEquals(projected.pdf_line17, f1040.line15_taxable_income);
  assertEquals(
    projected.pdf_line35,
    result.pending.schedule3?.line1_foreign_tax_credit,
  );
  assertEquals(form1116Pdf.includeWhen?.(projected, result.pending), true);
  const scheduleProjection = form1116ScheduleBPdf.projectFields?.(
    scheduleB,
    result.pending,
  ) ?? {};
  assertEquals(
    scheduleProjection.line6_current,
    9_000 - (projected.pdf_line24 as number),
  );
  assertEquals(
    scheduleProjection.line8_current,
    scheduleProjection.line6_current,
  );
});

Deno.test("Form 1116 public PDF route rejects mixed income, wrong worldwide gross, and other deductions", () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  const parent = result.pending.form_1116;
  assert(parent);
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(parent, {
        ...result.pending,
        f1040: { ...result.pending.f1040, line1a_wages: 1 },
      }),
    Error,
    "only identified foreign interest",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.({
        ...parent,
        worldwide_gross_income: 50_001,
      }, result.pending),
    Error,
    "standard-deduction, zero-carryover",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.({
        ...parent,
        other_deductions: 1,
      }, result.pending),
    Error,
    "standard-deduction, zero-carryover",
  );
});

Deno.test("Form 1116 public PDF route rejects unreviewed or mismatched interest and foreign tax", () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  const parent = result.pending.form_1116;
  assert(parent);
  assertThrows(
    () =>
      form1116Pdf.projectFields?.({
        ...parent,
        single_source_pdf_review: undefined,
      }, result.pending),
    Error,
    "affirmative single-source",
  );
  const source = result.pending.f1099int;
  assert(source);
  const rows = source.f1099ints as Array<Record<string, unknown>>;
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(parent, {
        ...result.pending,
        f1099int: {
          ...source,
          f1099ints: [{ ...rows[0], box1: 49_999 }],
        },
      }),
    Error,
    "must match the identified source",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(parent, {
        ...result.pending,
        f1099int: {
          ...source,
          f1099ints: [{ ...rows[0], box6: 8_999 }],
        },
      }),
    Error,
    "must match the identified source",
  );
});
