import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form1116Pdf } from "./f1116.ts";
import { form1116ScheduleBPdf } from "./f1116_schedule_b.ts";
import { form1116 as form1116Mef } from "../../mef/forms/f1116.ts";
import { testFiler } from "../../mef/test-filer.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { ordinaryTax2025 } from "../../../nodes/intermediate/worksheets/tax_table_2025.ts";
import {
  ForeignTaxCreditMethod,
  foreignTaxItemSchema,
  ForeignTaxKind,
  form1116,
  IncomeCategory,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import { scheduleCLedger } from "../../../nodes/inputs/form1116_schedule_c_source/test-fixture.ts";
import { k1Partnership } from "../../../nodes/inputs/k1_partnership/index.ts";
import { k1SCorpNode } from "../../../nodes/inputs/k1_s_corp/index.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";

Deno.test("Form 1116 PDF accepts context-only Schedule 1-A on the sourced interest return", () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-foreign-interest-current-excess"
  );
  if (!fixture) throw new Error("missing foreign-interest review fixture");
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a?.senior_zero_exclusions_review, undefined);
  const projected = form1116Pdf.projectFields?.(
    result.pending.form_1116,
    result.pending,
  );
  assertEquals(projected?.pdf_line24, 3_875);
  assertThrows(() => form1116Pdf.projectFields?.(
    result.pending.form_1116,
    {
      ...result.pending,
      f1040: { ...result.pending.f1040, line13b_additional_deductions: 1 },
    },
  ), Error, "only identified foreign interest");
});

Deno.test("Form 1116 PDF rejects disclosed redetermination without Schedule C", () => {
  assertThrows(
    () =>
      form1116Pdf.projectFields?.({
        foreign_tax_redeterminations: [scheduleCLedger()],
      }, {}),
    Error,
    "needs native Schedule C",
  );
});

Deno.test("Form 1116 PDF cannot omit an unpaid-accrual event on a zero-credit return", () => {
  assertThrows(
    () =>
      form1116Pdf.projectFields?.({
        foreign_tax_redeterminations: [scheduleCLedger(
          IncomeCategory.Passive,
          "accrued_tax_unpaid_after_24_months",
        )],
        us_tax_before_credits: 0,
      }, {}),
    Error,
    "needs native Schedule C",
  );
});

Deno.test("Form 1116 PDF maps worldwide taxable income to 2025 line 18", () => {
  const entry = form1116Pdf.fields.find((field) =>
    field.domainKey === "total_income"
  );
  assertEquals(entry?.pdfField, "topmostSubform[0].Page2[0].f2_10[0]");
});

Deno.test("Form 1116 PDF maps U.S. tax before credits to 2025 line 20", () => {
  const entry = form1116Pdf.fields.find((field) =>
    field.domainKey === "us_tax_before_credits"
  );
  assertEquals(entry?.pdfField, "topmostSubform[0].Page2[0].f2_12[0]");
});

Deno.test("Form 1116 PDF maps alternative compensation source to line 1b", () => {
  const entry = form1116Pdf.fields.find((field) =>
    field.domainKey === "alternative_compensation_source"
  );
  assertEquals(
    entry?.pdfField,
    "topmostSubform[0].Page1[0].Line1b_ReadOrder[0].c1_2[0]",
  );
});

Deno.test("Form 1116 PDF line 1b requires the same identified compensation source", () => {
  const alternative = {
    specific_compensation_description: "Salary",
    alternative_allocation_basis: "Client locations",
    alternative_allocation_computation: "140000 foreign of 300000 total",
    geographical_comparison:
      "Project location better reflects service delivery",
    compensation_item_total_usd: 300_000,
    alternative_us_source_usd: 160_000,
    alternative_foreign_source_usd: 140_000,
    ordinary_us_source_usd: 180_000,
    ordinary_foreign_source_usd: 120_000,
    source_document_reference: "Employer project ledger",
  };
  const result = form1116.compute({ taxYear: 2025, formType: "f1040" }, {
    foreign_tax_items: [{
      foreign_tax_paid: 2_000,
      foreign_gross_income: 140_000,
      income_category: IncomeCategory.General,
      alternative_compensation_sourcing: alternative,
    }],
    worldwide_taxable_income: 250_000,
    us_tax_before_credits: 50_000,
  });
  const fields = result.outputs.find((item) => item.nodeType === "form_1116")
    ?.fields as Record<string, unknown>;
  const fec = {
    fecs: [{
      foreign_employer_name: "Employer",
      country_code: "DE",
      compensation_amount: 300_000,
      compensation_usd: 300_000,
      foreign_tax_paid_usd: 2_000,
      foreign_service_compensation_usd: 140_000,
      alternative_compensation_sourcing: alternative,
    }],
  };
  assertThrows(
    () => form1116Pdf.projectFields?.(fields, { fec }),
    Error,
    "needs affirmative single-source",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.({
        ...fields,
        pdf_complete_single_source: true,
        single_source_pdf_review: {
          source_document_reference: alternative.source_document_reference,
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
      }, { fec }),
    Error,
    "dated, converted foreign tax",
  );
  assertThrows(
    () => form1116Pdf.projectFields?.(fields, {}),
    Error,
    "needs the foreign-employer compensation source",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(fields, {
        fec: {
          fecs: [{ ...fec.fecs[0], compensation_usd: 249_999 }],
        },
      }),
    Error,
    "must match each sourced",
  );
});

Deno.test("Form 1116 PDF projects reviewed one-employer general wages", () => {
  const usTax = ordinaryTax2025(300_000, FilingStatus.Single);
  const alternative = {
    specific_compensation_description: "Salary",
    alternative_allocation_basis: "Client locations",
    alternative_allocation_computation: "140000 foreign of 300000 total",
    geographical_comparison: "Foreign 140000 vs ordinary 120000",
    compensation_item_total_usd: 300_000,
    alternative_us_source_usd: 160_000,
    alternative_foreign_source_usd: 140_000,
    ordinary_us_source_usd: 180_000,
    ordinary_foreign_source_usd: 120_000,
    source_document_reference: "Employer project ledger",
  };
  const currency = {
    currency_code: "EUR",
    amount: 1_600,
    usd_per_foreign_unit: 1.25,
    conversion_date: "2025-06-15",
    conversion_rate_explanation: "Bank posted rate on payment day",
    source_document_reference: "Payroll tax ledger",
  };
  const result = form1116.compute({ taxYear: 2025, formType: "f1040" }, {
    foreign_tax_items: [{
      foreign_tax_paid: 2_000,
      foreign_gross_income: 140_000,
      foreign_income_source_document_reference: "Employer project ledger",
      income_category: IncomeCategory.General,
      irs_country_code: "GM",
      tax_kind: ForeignTaxKind.Other,
      tax_credit_method: ForeignTaxCreditMethod.Paid,
      tax_paid_or_accrued_date: "2025-06-15",
      foreign_tax_currency: currency,
      alternative_compensation_sourcing: alternative,
    }],
    worldwide_gross_income: 300_000,
    worldwide_taxable_income: 300_000,
    us_tax_before_credits: usTax,
    regular_tax_preference_facts: {
      taxable_income: 300_000,
      qualified_dividends: 0,
      net_capital_gain: 0,
      filing_status: FilingStatus.Single,
      special_rate_gain: 0,
      form4952_election: 0,
      foreign_earned_income_exclusion: 0,
      form8615_applies: false,
      regular_tax_before_additional_items: usTax,
    },
    single_source_pdf_review: {
      ...singleSourceReview,
      source_document_reference: "Employer project ledger",
    },
  });
  const fields = result.outputs.find((item) => item.nodeType === "form_1116")
    ?.fields as Record<string, unknown>;
  const pending = {
    fec: {
      fecs: [{
        foreign_employer_name: "Employer",
        country_code: "DE",
        compensation_amount: 240_000,
        currency: "EUR",
        compensation_usd: 300_000,
        foreign_tax_paid_usd: 2_000,
        foreign_tax_irs_country_code: "GM",
        foreign_tax_paid_or_accrued_date: "2025-06-15",
        foreign_tax_credit_method: ForeignTaxCreditMethod.Paid,
        foreign_tax_currency: currency,
        foreign_service_compensation_usd: 140_000,
        alternative_compensation_sourcing: alternative,
      }],
    },
    f1040: {
      line1h_other_earned: 300_000,
      line1z_total_wages: 300_000,
      line9_total_income: 300_000,
      line10_adjustments: 0,
      line11_agi: 300_000,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 300_000,
      line16_income_tax: usTax,
    },
    schedule3: { line1_foreign_tax_credit: 2_000 },
  };
  const projected = form1116Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.income_category, IncomeCategory.General);
  assertEquals(projected.alternative_compensation_source, true);
  assertEquals(projected.pdf_line1a_a, 140_000);
  assertEquals(projected.pdf_line3e_a, 300_000);
  assertEquals(projected.pdf_part2_foreign_other_a, 1_600);
  assertEquals(projected.pdf_part2_us_other_a, 2_000);
  assertEquals(projected.pdf_line19, "0.46667");
  assertEquals(projected.pdf_line28, 2_000);
  assertEquals(projected.pdf_line35, 2_000);
  assertEquals(form1116Pdf.includeWhen?.(projected, pending), true);
  assertEquals(
    form1116Pdf.fields.find((field) => field.domainKey === "pdf_line28")
      ?.pdfField,
    "topmostSubform[0].Page2[0].f2_20[0]",
  );
  assertEquals(
    form1116Pdf.fields.find((field) =>
      field.domainKey === "pdf_part2_foreign_other_a"
    )?.pdfField,
    "topmostSubform[0].Page1[0].Table_Part2[0].RowA[0].f1_56[0]",
  );
  assertEquals(
    form1116Pdf.fields.find((field) =>
      field.domainKey === "pdf_part2_us_other_a"
    )?.pdfField,
    "topmostSubform[0].Page1[0].Table_Part2[0].RowA[0].f1_60[0]",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(fields, {
        ...pending,
        f1040: { ...pending.f1040, line14_deductions_qbi_total: 15_750 },
      }),
    Error,
    "no other income or deductions",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(fields, {
        ...pending,
        fec: { fecs: [{ ...pending.fec.fecs[0], compensation_usd: 310_000 }] },
      }),
    Error,
    "must match each sourced foreign-employer compensation item",
  );
});

Deno.test("Form 1116 PDF fails closed for active category summaries even with zero tax", () => {
  const result = form1116.compute({ taxYear: 2025, formType: "f1040" }, {
    foreign_tax_items: [{
      foreign_tax_paid: 0,
      foreign_gross_income: 1_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 40_000,
    us_tax_before_credits: 4_000,
  });
  const active = result.outputs.find((item) => item.nodeType === "form_1116")
    ?.fields as Record<string, unknown>;
  assertThrows(
    () => form1116Pdf.projectFields?.(active, {}),
    Error,
    "cannot render an active category",
  );
  assertThrows(
    () => form1116Pdf.instances?.(active),
    Error,
    "cannot render an unreviewed category",
  );
});

Deno.test("Form 1116 PDF fails closed for a positive tax without category summaries", () => {
  const active = { foreign_tax_paid: 500 };
  assertThrows(
    () => form1116Pdf.projectFields?.(active, {}),
    Error,
    "supports one reviewed passive category",
  );
  assertThrows(
    () => form1116Pdf.instances?.(active),
    Error,
    "cannot render an unreviewed category",
  );
  assertEquals(form1116Pdf.projectFields?.({}, {}), {});
});

Deno.test("Form 1116 PDF does not include inactive limitation-only context", () => {
  const inactive = {
    foreign_tax_paid: 0,
    total_income: 40_000,
    us_tax_before_credits: 4_000,
  };
  const projected = form1116Pdf.projectFields?.(inactive, {}) ?? {};
  assertEquals(form1116Pdf.includeWhen?.(projected, {}), false);
  assertEquals(form1116Pdf.includeWhen?.({}, {}), false);
});

const singleSourceReview = {
  source_document_reference:
    "German bank interest statement and tax assessment",
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

function reviewedSingleSource() {
  const result = form1116.compute({ taxYear: 2025, formType: "f1040" }, {
    foreign_tax_items: [{
      foreign_tax_paid: 50,
      foreign_gross_income: 1_000,
      foreign_income_source_document_reference:
        "German bank interest statement and tax assessment",
      income_category: IncomeCategory.Passive,
      irs_country_code: "DE",
      tax_kind: ForeignTaxKind.Interest,
      tax_credit_method: ForeignTaxCreditMethod.Paid,
      tax_paid_or_accrued_date: "2025-06-15",
      foreign_tax_currency: {
        currency_code: "EUR",
        amount: 40,
        usd_per_foreign_unit: 1.25,
        source_document_reference:
          "German bank interest statement and tax assessment",
      },
    }],
    worldwide_gross_income: 1_000,
    worldwide_taxable_income: 1_000,
    us_tax_before_credits: 100,
    general_deductions: 0,
    standard_or_itemized_deduction: 0,
    regular_tax_preference_facts: {
      taxable_income: 1_000,
      qualified_dividends: 0,
      net_capital_gain: 0,
      filing_status: FilingStatus.Single,
      special_rate_gain: 0,
      form4952_election: 0,
      foreign_earned_income_exclusion: 0,
      form8615_applies: false,
      regular_tax_before_additional_items: 100,
    },
    single_source_pdf_review: singleSourceReview,
  });
  const fields = result.outputs.find((item) => item.nodeType === "form_1116")
    ?.fields as Record<string, unknown>;
  const pending = {
    f1040: {
      line2b_taxable_interest: 1_000,
      line9_total_income: 1_000,
      line10_adjustments: 0,
      line11_agi: 1_000,
      line12a_standard_deduction: 0,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 1_000,
      line16_income_tax: 100,
    },
    schedule3: { line1_foreign_tax_credit: 50 },
  };
  return { fields, pending };
}

Deno.test("Form 1116 PDF keeps a K-3 line 12 reduction outside the one-interest route", () => {
  const { fields, pending } = reviewedSingleSource();
  const summary = (fields.category_summaries as Array<{
    items: Array<Record<string, unknown>>;
  }>)[0];
  const reduced = {
    ...fields,
    category_summaries: [{
      ...summary,
      foreignTaxReduction: 10,
      allowedCredit: 40,
      items: [{
        ...summary.items[0],
        schedule_k3_line12_reduction: {
          amount: 10,
          source_document_reference: "Partnership Schedule K-3 section 4",
        },
      }],
    }],
  };
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(reduced, {
        ...pending,
        schedule3: { line1_foreign_tax_credit: 40 },
      }),
    Error,
    "needs a matching K-1 and K-3 source",
  );
});

Deno.test("Form 1116 PDF prints a source-joined 1065 K-3 line 12 reduction", () => {
  const k3 = {
    partnership_ein: "123456789",
    k1_source_document_reference: "2025 partnership K-1",
    k3_source_document_reference: "2025 partnership K-3",
    part_ii_section_1_line_6_passive_interest: 1_000,
    part_ii_section_1_line_24_passive_total: 1_000,
    part_iii_section_4_line_1_foreign_tax: 50,
    part_iii_section_4_line_2_tax_reduction: 10,
    irs_country_code: "DE",
    tax_paid_date: "2025-06-15",
    foreign_tax_currency: {
      currency_code: "EUR",
      amount: 40,
      usd_per_foreign_unit: 1.25,
      source_document_reference: "2025 partnership K-3",
    },
    no_other_income_tax_or_reduction_on_k3_confirmed: true as const,
  };
  const k1 = {
    partnership_name: "Test Partnership",
    partnership_ein: "123456789",
    source_document_reference: "2025 partnership K-1",
    box5_interest: 1_000,
    box16_foreign_income: 1_000,
    box16_foreign_tax: 50,
    box16_foreign_income_category: IncomeCategory.Passive,
    box16_foreign_tax_irs_country_code: "DE",
    box16_foreign_tax_paid_or_accrued_date: "2025-06-15",
    box16_foreign_tax_kind: ForeignTaxKind.Interest,
    box16_foreign_tax_credit_method: ForeignTaxCreditMethod.Paid,
    schedule_k3_passive_interest: k3,
  };
  const source = k1Partnership.compute({ taxYear: 2025, formType: "f1040" }, {
    k1_partnerships: [k1],
  });
  const sourcedItem = foreignTaxItemSchema.parse(
    (source.outputs.find((entry) => entry.nodeType === "form_1116")
      ?.fields.foreign_tax_items as unknown[])[0],
  );
  const {
    no_foreign_tax_reduction_confirmed: _noForeignTaxReduction,
    ...k3Review
  } = singleSourceReview;
  const result = form1116.compute({ taxYear: 2025, formType: "f1040" }, {
    foreign_tax_items: [sourcedItem],
    worldwide_gross_income: 1_000,
    worldwide_taxable_income: 1_000,
    us_tax_before_credits: 100,
    general_deductions: 0,
    standard_or_itemized_deduction: 0,
    regular_tax_preference_facts: {
      taxable_income: 1_000,
      qualified_dividends: 0,
      net_capital_gain: 0,
      filing_status: FilingStatus.Single,
      special_rate_gain: 0,
      form4952_election: 0,
      foreign_earned_income_exclusion: 0,
      form8615_applies: false,
      regular_tax_before_additional_items: 100,
    },
    single_source_pdf_review: {
      ...k3Review,
      source_document_reference: "2025 partnership K-3",
      only_identified_k3_line12_reduction_confirmed: true,
    },
  });
  const fields = result.outputs.find((entry) => entry.nodeType === "form_1116")
    ?.fields as Record<string, unknown>;
  const pending = {
    k1_partnership: { k1_partnerships: [k1] },
    f1040: {
      line2b_taxable_interest: 1_000,
      line9_total_income: 1_000,
      line10_adjustments: 0,
      line11_agi: 1_000,
      line12a_standard_deduction: 0,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 1_000,
      line16_income_tax: 100,
    },
    schedule3: { line1_foreign_tax_credit: 40 },
  };
  const projected = form1116Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_part2_us_interest_a, 50);
  assertEquals(projected.pdf_line8, 50);
  assertEquals(projected.pdf_line12, 10);
  assertEquals(projected.pdf_line14, 40);
  assertEquals(projected.pdf_line24, 40);
  assertEquals(projected.pdf_line35, 40);
  const doubleReported = structuredClone(fields);
  const doubleReportedSummaries = doubleReported.category_summaries as Array<{
    items: Array<Record<string, unknown>>;
  }>;
  doubleReportedSummaries[0].items[0].tax_reported_on_1099 = true;
  assertThrows(
    () => form1116Pdf.projectFields?.(doubleReported, pending),
    Error,
    "cannot also be a 1099-INT tax item",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(fields, {
        ...pending,
        k1_partnership: {
          k1_partnerships: [{ ...k1, box5_interest: 999 }],
        },
      }),
    Error,
    "must match the sole partnership source",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(fields, {
        ...pending,
        k1_partnership: {
          k1_partnerships: [{ ...k1, box1_ordinary_business: 200 }],
        },
      }),
    Error,
    "must match the sole partnership source",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(fields, {
        ...pending,
        schedule3: { line1_foreign_tax_credit: 50 },
      }),
    Error,
    "differ from MeF or Schedule 3",
  );
});

Deno.test("Form 1116 MeF and PDF join one 1120-S K-3 passive-interest reduction", () => {
  const k3 = {
    corporation_ein: "123456789",
    k1_source_document_reference: "2025 S-corp K-1",
    k3_source_document_reference: "2025 S-corp K-3",
    part_ii_section_1_line_6_passive_interest: 1_000,
    part_ii_section_1_line_24_passive_total: 1_000,
    part_iii_section_3_line_1_foreign_tax: 50,
    part_iii_section_3_line_2_tax_reduction: 10,
    irs_country_code: "DE",
    tax_paid_date: "2025-06-15",
    foreign_tax_currency: {
      currency_code: "EUR",
      amount: 40,
      usd_per_foreign_unit: 1.25,
      source_document_reference: "2025 S-corp K-3",
    },
    no_other_income_tax_or_reduction_on_k3_confirmed: true as const,
  };
  const k1 = {
    corporation_name: "Test S Corporation",
    corporation_ein: "123456789",
    source_document_reference: "2025 S-corp K-1",
    box4_interest: 1_000,
    box14_foreign_income: 1_000,
    box14_foreign_tax: 50,
    box14_foreign_income_category: IncomeCategory.Passive,
    box14_foreign_tax_irs_country_code: "DE",
    box14_foreign_tax_paid_or_accrued_date: "2025-06-15",
    box14_foreign_tax_kind: ForeignTaxKind.Interest,
    box14_foreign_tax_credit_method: ForeignTaxCreditMethod.Paid,
    schedule_k3_passive_interest: k3,
  };
  const source = k1SCorpNode.compute({ taxYear: 2025, formType: "f1040" }, {
    k1_s_corps: [k1],
  });
  assertThrows(
    () =>
      k1SCorpNode.compute({ taxYear: 2025, formType: "f1040" }, {
        k1_s_corps: [{ ...k1, box4_interest: 999 }],
      }),
    Error,
    "must match its K-1",
  );
  const item = foreignTaxItemSchema.parse(
    (source.outputs.find((entry) => entry.nodeType === "form_1116")
      ?.fields.foreign_tax_items as unknown[])[0],
  );
  const {
    no_foreign_tax_reduction_confirmed: _noForeignTaxReduction,
    ...k3Review
  } = singleSourceReview;
  const result = form1116.compute({ taxYear: 2025, formType: "f1040" }, {
    foreign_tax_items: [item],
    worldwide_gross_income: 1_000,
    worldwide_taxable_income: 1_000,
    us_tax_before_credits: 100,
    general_deductions: 0,
    standard_or_itemized_deduction: 0,
    regular_tax_preference_facts: {
      taxable_income: 1_000,
      qualified_dividends: 0,
      net_capital_gain: 0,
      filing_status: FilingStatus.Single,
      special_rate_gain: 0,
      form4952_election: 0,
      foreign_earned_income_exclusion: 0,
      form8615_applies: false,
      regular_tax_before_additional_items: 100,
    },
    single_source_pdf_review: {
      ...k3Review,
      source_document_reference: "2025 S-corp K-3",
      only_identified_k3_line12_reduction_confirmed: true,
    },
  });
  const fields = result.outputs.find((entry) => entry.nodeType === "form_1116")
    ?.fields as Record<string, unknown>;
  const pending = {
    k1_s_corp: { k1_s_corps: [k1] },
    f1040: {
      line2b_taxable_interest: 1_000,
      line9_total_income: 1_000,
      line10_adjustments: 0,
      line11_agi: 1_000,
      line12a_standard_deduction: 0,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 1_000,
      line16_income_tax: 100,
    },
    schedule3: { line1_foreign_tax_credit: 40 },
  };
  const projected = form1116Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_line8, 50);
  assertEquals(projected.pdf_line12, 10);
  assertEquals(projected.pdf_line14, 40);
  assertEquals(projected.pdf_line24, 40);
  const [xml] = form1116Mef.build(
    fields as Parameters<typeof form1116Mef.build>[0],
    { pending },
  );
  assertStringIncludes(
    xml,
    "<ForeignTaxReductionAmt>10</ForeignTaxReductionAmt>",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(fields, {
        ...pending,
        k1_s_corp: { k1_s_corps: [{ ...k1, box14_foreign_tax: 49 }] },
      }),
    Error,
    "sole S-corporation source",
  );
  assertThrows(
    () => form1116Mef.build(fields as Parameters<typeof form1116Mef.build>[0]),
    Error,
    "matching S-corporation K-1 and K-3 source",
  );
});

Deno.test("Form 1116 PDF projects a complete one-country paid passive category", () => {
  const { fields, pending } = reviewedSingleSource();
  const projected = form1116Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_country_a, "DE");
  assertEquals(projected.pdf_line1a_a, 1_000);
  assertEquals(projected.pdf_line3e_a, 1_000);
  assertEquals(projected.pdf_part2_foreign_interest_a, 40);
  assertEquals(projected.pdf_part2_us_interest_a, 50);
  assertEquals(projected.pdf_tax_credit_method, "paid");
  assertEquals(projected.pdf_line19, "1.00000");
  assertEquals(projected.pdf_line21, 100);
  assertEquals(projected.pdf_line24, 50);
  assertEquals(projected.pdf_line27, 50);
  assertEquals(projected.pdf_line32, 50);
  assertEquals(projected.pdf_line35, 50);
  for (
    const key of [
      "pdf_country_a",
      "pdf_line1a_a",
      "pdf_line1a_total",
      "pdf_line2_a",
      "pdf_line3a_a",
      "pdf_line3b_a",
      "pdf_line3c_a",
      "pdf_line3d_a",
      "pdf_line3e_a",
      "pdf_line3f_a",
      "pdf_line3g_a",
      "pdf_line4a_a",
      "pdf_line4b_a",
      "pdf_line5_a",
      "pdf_line6_a",
      "pdf_line6_total",
      "pdf_line7",
      "pdf_tax_credit_method",
      "pdf_part2_date_a",
      "pdf_part2_foreign_interest_a",
      "pdf_part2_us_interest_a",
      "pdf_part2_total_a",
      "pdf_line8",
      "pdf_line9",
      "pdf_line10",
      "pdf_line11",
      "pdf_line12",
      "pdf_line13",
      "pdf_line14",
      "pdf_line15",
      "pdf_line16",
      "pdf_line17",
      "total_income",
      "pdf_line19",
      "us_tax_before_credits",
      "pdf_line21",
      "pdf_line22",
      "pdf_line23",
      "pdf_line24",
      "pdf_line27",
      "pdf_line32",
      "pdf_line33",
      "pdf_line34",
      "pdf_line35",
    ]
  ) {
    assertEquals(projected[key] !== undefined, true, `${key} is sourced`);
    assertEquals(
      form1116Pdf.fields.some((entry) => entry.domainKey === key),
      true,
      `${key} has a canonical PDF field`,
    );
  }
  assertEquals(projected.total_income, 1_000);
  assertEquals(projected.us_tax_before_credits, 100);
  const [xml] = form1116Mef.build(
    fields as Parameters<typeof form1116Mef.build>[0],
  );
  assertStringIncludes(
    xml,
    "<GrossForeignTaxCreditAmt>50</GrossForeignTaxCreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<ForeignPassiveIncTaxCreditAmt>50</ForeignPassiveIncTaxCreditAmt>",
  );
  assertEquals(form1116Pdf.includeWhen?.(projected, pending), true);
  assertEquals(
    form1116Pdf.instances?.(projected, testFiler())?.[0].pdf_ssn,
    "123456789",
  );
  assertEquals(
    form1116Pdf.fields.find((entry) =>
      entry.domainKey === "pdf_part2_foreign_interest_a"
    )
      ?.pdfField,
    "topmostSubform[0].Page1[0].Table_Part2[0].RowA[0].f1_55[0]",
  );
});

Deno.test("Form 1116 PDF prints a reviewed one-source current-year excess with Schedule B", () => {
  const priorReview = {
    income_category: IncomeCategory.Passive,
    prior_year_form1116_line23_limit: 70,
    prior_year_form1116_line24_allowed_credit: 70,
    prior_year_schedule_b_line8_balance: 0,
    source_document_references: ["2024 filed Form 1116 and Schedule B"],
    no_foreign_tax_redetermination_or_special_adjustment: true as const,
  };
  const result = form1116.compute({ taxYear: 2025, formType: "f1040" }, {
    foreign_tax_items: [{
      foreign_tax_paid: 150,
      foreign_gross_income: 1_000,
      foreign_income_source_document_reference:
        singleSourceReview.source_document_reference,
      income_category: IncomeCategory.Passive,
      irs_country_code: "DE",
      tax_kind: ForeignTaxKind.Interest,
      tax_credit_method: ForeignTaxCreditMethod.Paid,
      tax_paid_or_accrued_date: "2025-06-15",
      foreign_tax_currency: {
        currency_code: "EUR",
        amount: 120,
        usd_per_foreign_unit: 1.25,
        source_document_reference: singleSourceReview.source_document_reference,
      },
    }],
    worldwide_gross_income: 1_000,
    worldwide_taxable_income: 1_000,
    us_tax_before_credits: 100,
    general_deductions: 0,
    standard_or_itemized_deduction: 0,
    regular_tax_preference_facts: {
      taxable_income: 1_000,
      qualified_dividends: 0,
      net_capital_gain: 0,
      filing_status: FilingStatus.Single,
      special_rate_gain: 0,
      form4952_election: 0,
      foreign_earned_income_exclusion: 0,
      form8615_applies: false,
      regular_tax_before_additional_items: 100,
    },
    single_source_pdf_review: singleSourceReview,
    carryover_reviews: [priorReview],
  });
  const fields = result.outputs.find((item) => item.nodeType === "form_1116")!
    .fields as Record<string, unknown>;
  const scheduleB = result.outputs.find((item) =>
    item.nodeType === "form1116_schedule_b"
  )!.fields as Record<string, unknown>;
  const pending = {
    f1040: {
      line2b_taxable_interest: 1_000,
      line9_total_income: 1_000,
      line10_adjustments: 0,
      line11_agi: 1_000,
      line12a_standard_deduction: 0,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 1_000,
      line16_income_tax: 100,
    },
    schedule3: { line1_foreign_tax_credit: 100 },
    form_1116: fields,
    form1116_schedule_b: scheduleB,
  };
  const projected = form1116Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_line8, 150);
  assertEquals(projected.pdf_line23, 100);
  assertEquals(projected.pdf_line24, 100);
  assertEquals(projected.pdf_line27, 100);
  assertEquals(form1116Pdf.includeWhen?.(projected, pending), true);
  const projectedB = form1116ScheduleBPdf.projectFields?.(
    scheduleB,
    pending,
  ) ?? {};
  assertEquals(projectedB.line6_current, 50);
  assertEquals(projectedB.line8_total, 50);
  const [xml] = form1116Mef.build(
    fields as Parameters<typeof form1116Mef.build>[0],
    { pending },
  );
  assertStringIncludes(
    xml,
    "<GrossForeignTaxCreditAmt>100</GrossForeignTaxCreditAmt>",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(
        fields,
        Object.fromEntries(
          Object.entries(pending).filter(([key]) =>
            key !== "form1116_schedule_b"
          ),
        ),
      ),
    Error,
    "needs the matching sourced Schedule B",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(fields, {
        ...pending,
        form1116_schedule_b: { ...scheduleB, current_year_excess_tax: 49 },
      }),
    Error,
    "needs the matching sourced Schedule B",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(fields, {
        ...pending,
        form1116_schedule_b: {
          ...scheduleB,
          prior_year_review: {
            ...priorReview,
            prior_year_form1116_line23_limit: 71,
          },
        },
      }),
    Error,
    "resolved prior-year carryback",
  );
});

Deno.test("Form 1116 PDF projects one identified 1099-INT tax in U.S. dollars", () => {
  const { fields, pending } = reviewedSingleSource();
  const summary = (fields.category_summaries as Record<string, unknown>[])[0];
  const item = (summary.items as Record<string, unknown>[])[0];
  const source = {
    f1099ints: [{
      payer_name: "German bank",
      box1: 1_000,
      box6: 50,
      foreign_source_interest_usd: 1_000,
      foreign_tax_irs_country_code: "DE",
      foreign_tax_source_document_reference:
        singleSourceReview.source_document_reference,
    }],
  };
  const reportedFields = {
    ...fields,
    category_summaries: [{
      ...summary,
      items: [{
        ...item,
        tax_reported_on_1099: true,
        tax_paid_or_accrued_date: undefined,
        foreign_tax_currency: undefined,
      }],
    }],
  };
  const projected = form1116Pdf.projectFields?.(reportedFields, {
    ...pending,
    f1099int: source,
  }) ?? {};
  assertEquals(projected.pdf_part2_date_a, "1099 taxes");
  assertEquals(projected.pdf_part2_foreign_interest_a, undefined);
  assertEquals(projected.pdf_part2_us_interest_a, 50);
  assertEquals(projected.pdf_line35, 50);
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(reportedFields, {
        ...pending,
        f1099int: { f1099ints: [{ ...source.f1099ints[0], box6: 49 }] },
      }),
    Error,
    "must match the identified source",
  );
  assertThrows(
    () => form1116Pdf.projectFields?.(reportedFields, pending),
    Error,
    "must match the identified source",
  );
});

Deno.test("Form 1116 PDF rejects tampered conversion, missing review, and omitted credit line", () => {
  const { fields, pending } = reviewedSingleSource();
  const summary = (fields.category_summaries as Record<string, unknown>[])[0];
  const item = (summary.items as Record<string, unknown>[])[0];
  assertThrows(
    () =>
      form1116Pdf.projectFields?.({
        ...fields,
        single_source_pdf_review: undefined,
      }, pending),
    Error,
    "affirmative single-source",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.({
        ...fields,
        single_source_pdf_review: {
          ...singleSourceReview,
          source_document_reference: "Unrelated ledger",
        },
      }, pending),
    Error,
    "same foreign income and tax source",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.({
        ...fields,
        worldwide_gross_income: 2_000,
      }, pending),
    Error,
    "standard-deduction, zero-carryover calculation",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(fields, {
        ...pending,
        f1040: {
          ...pending.f1040,
          line8_additional_income: 100,
        },
      }),
    Error,
    "only identified foreign interest",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.({
        ...fields,
        regular_tax_preference_facts: undefined,
      }, pending),
    Error,
    "regular-tax preference and zero special-rate facts",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.({
        ...fields,
        category_summaries: [{
          ...summary,
          items: [{
            ...item,
            foreign_tax_currency: {
              ...(item.foreign_tax_currency as Record<string, unknown>),
              amount: 41,
            },
          }],
        }],
      }, pending),
    Error,
    "conversion differs",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(fields, {
        ...pending,
        schedule3: {},
      }),
    Error,
    "Part IV credit differ",
  );
});

Deno.test("Form 1116 PDF keeps a fully identified 1099-INT passive category closed", () => {
  const result = form1116.compute({ taxYear: 2025, formType: "f1040" }, {
    foreign_tax_items: [{
      foreign_tax_paid: 50,
      foreign_gross_income: 1_000,
      income_category: IncomeCategory.Passive,
      irs_country_code: "DE",
      tax_kind: ForeignTaxKind.Interest,
      tax_credit_method: ForeignTaxCreditMethod.Paid,
      tax_reported_on_1099: true,
    }],
    worldwide_taxable_income: 40_000,
    us_tax_before_credits: 4_000,
  });
  const active = result.outputs.find((item) => item.nodeType === "form_1116")
    ?.fields as Record<string, unknown>;
  assertThrows(
    () => form1116Pdf.projectFields?.(active, {}),
    Error,
    "cannot render an active category",
  );
});

Deno.test("Form 1116 PDF keeps a dated non-1099 category closed without foreign-currency tax", () => {
  const result = form1116.compute({ taxYear: 2025, formType: "f1040" }, {
    foreign_tax_items: [{
      foreign_tax_paid: 50,
      foreign_gross_income: 1_000,
      income_category: IncomeCategory.General,
      irs_country_code: "DE",
      tax_kind: ForeignTaxKind.Other,
      tax_credit_method: ForeignTaxCreditMethod.Paid,
      tax_paid_or_accrued_date: "2025-06-15",
    }],
    worldwide_taxable_income: 40_000,
    us_tax_before_credits: 4_000,
  });
  const active = result.outputs.find((item) => item.nodeType === "form_1116")
    ?.fields as Record<string, unknown>;
  assertThrows(
    () => form1116Pdf.projectFields?.(active, {}),
    Error,
    "supports one reviewed passive tax item",
  );
});

Deno.test("Form 1116 PDF line 18 source is the computed senior-adjusted amount", () => {
  const result = form1116.compute({ taxYear: 2025, formType: "f1040" }, {
    foreign_tax_items: [{
      foreign_tax_paid: 500,
      foreign_gross_income: 5_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 40_000,
    enhanced_senior_deduction: 6_000,
    us_tax_before_credits: 5_000,
  });
  const fields = result.outputs.find((item) => item.nodeType === "form_1116")
    ?.fields;
  assertEquals(fields?.total_income, 46_000);
  assertEquals(fields?.us_tax_before_credits, 5_000);
  assertEquals(
    form1116Pdf.fields.find((field) => field.domainKey === "total_income")
      ?.pdfField,
    "topmostSubform[0].Page2[0].f2_10[0]",
  );
});
