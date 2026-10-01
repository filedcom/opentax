import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { buildMefBundle } from "../../mef/builder.ts";
import { buildPending } from "../../mef/pending.ts";
import { buildPdfBytes } from "../builder.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { form1116Pdf } from "./f1116.ts";
import { form1116ScheduleBPdf } from "./f1116_schedule_b.ts";
import { form1116 } from "../../mef/forms/f1116.ts";
import {
  form1116ScheduleB,
  scheduleBFieldsSchema,
} from "../../mef/forms/f1116_schedule_b.ts";

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

Deno.test("Form 1116 passive 2015 carryover expires while 2025 excess reaches native and PDF", async () => {
  const source = inputs();
  const filer =
    pdfReviewFixtures.find((fixture) => fixture.id === "single-w2-refund")!
      .filer;
  const result = execute(buildExecutionPlan(registry), registry, {
    ...source,
    form1116_review: {
      ...source.form1116_review,
      single_source_pdf_review: {
        ...singleSourceReview,
        no_prior_year_carryover_or_carryback_confirmed: false,
      },
    },
    form1116_carryover_review: {
      reviews: [{
        ...source.form1116_carryover_review.reviews[0],
        prior_year_schedule_b_line8_balance: 100,
      }],
    },
    form1116_prior_carryover: {
      carryovers: [{
        income_category: "passive",
        vintages: [{
          vintage_tax_year: 2015,
          prior_year_schedule_b_line8_vintage_amount: 100,
        }],
        prior_year_schedule_b_line8_total: 100,
        prior_year_schedule_b_line8_other_vintages_total: 0,
        no_intervening_adjustments: true,
        source_document_references: [
          "Filed 2024 passive Schedule B line 8, 2015-origin credit",
        ],
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const parent = result.pending.form_1116;
  const scheduleB = result.pending.form1116_schedule_b;
  assert(parent);
  assert(scheduleB);
  const summary =
    (parent.category_summaries as Array<Record<string, number>>)[0];
  assert(summary);
  assert(result.pending.schedule3);
  assert(summary.currentYearExcessTax > 0);
  assertEquals(summary.priorYearCarryover, 100);
  assertEquals(summary.usedPriorYearCarryover, 0);
  assertEquals(scheduleB.case, "combined_current_excess_prior_balance");
  assertEquals(scheduleB.remaining_prior_year_carryover, 0);
  assertEquals(
    result.pending.schedule3.line1_foreign_tax_credit,
    summary.allowedCredit,
  );
  const parentPdf = form1116Pdf.projectFields?.(parent, result.pending) ?? {};
  const schedulePdf = form1116ScheduleBPdf.projectFields?.(
    scheduleB,
    result.pending,
  ) ?? {};
  assertEquals(parentPdf.pdf_line24, summary.allowedCredit);
  assertEquals(parentPdf.pdf_line35, summary.allowedCredit);
  assertEquals(schedulePdf.line5_2015, -100);
  assertEquals(schedulePdf.line8_2015, 0);
  assertEquals(schedulePdf.line6_current, summary.currentYearExcessTax);
  assertEquals(schedulePdf.line8_current, summary.currentYearExcessTax);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(bundle.xml, "<ForeignTxCyovExprUnsdCurrTYGrp>");
  assertStringIncludes(
    bundle.xml,
    "<TenthPrecedingTYAmt>-100</TenthPrecedingTYAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    `<CurrentTaxYearAmt>${summary.currentYearExcessTax}</CurrentTaxYearAmt>`,
  );
  const pdf = await buildPdfBytes(pending, filer, ".pdf-cache", bundle);
  assert(pdf.length > 0);

  for (
    const altered of [
      {
        ...pending,
        form1116_schedule_b: {
          ...pending.form1116_schedule_b,
          remaining_prior_year_carryover: 100,
        },
      },
      {
        ...pending,
        form1116_schedule_b: {
          ...pending.form1116_schedule_b,
          current_year_excess_tax: summary.currentYearExcessTax + 1,
        },
      },
    ]
  ) {
    await assertRejects(() =>
      buildMefBundle(altered, { filer, attachments: [] })
    );
    await assertRejects(() =>
      buildPdfBytes(altered, filer, ".pdf-cache", bundle)
    );
  }
});

Deno.test("Form 1116 apportions standard deduction across foreign box 1 and domestic Treasury box 3", () => {
  const source = inputs();
  const result = execute(buildExecutionPlan(registry), registry, {
    ...source,
    f1099int: [{ ...source.f1099int[0], box3: 10_000 }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const parent = result.pending.form_1116;
  assert(parent);
  const projected = form1116Pdf.projectFields?.(parent, result.pending) ?? {};
  assertEquals(projected.pdf_line1a_a, 50_000);
  assertEquals(projected.pdf_line3e_a, 60_000);
  assertEquals(projected.pdf_line3f_a, "0.83333");
  assertEquals(projected.pdf_line3g_a, 13_125);
  assertEquals(projected.pdf_line7, 36_875);
  assertEquals(parent.total_income, 44_250);
  assertEquals(
    projected.pdf_line35,
    result.pending.schedule3?.line1_foreign_tax_credit,
  );
  const [xml] = form1116.build(
    parent as Parameters<typeof form1116.build>[0],
    { pending: result.pending },
  );
  assert(xml.includes("<GrossIncomeAmt>60000</GrossIncomeAmt>"));
  assert(
    xml.includes(
      "<ProRataDeductionsNotRelatedAmt>13125</ProRataDeductionsNotRelatedAmt>",
    ),
  );
  assertThrows(() =>
    form1116.build(
      parent as Parameters<typeof form1116.build>[0],
      {
        pending: {
          ...result.pending,
          f1099int: {
            ...result.pending.f1099int,
            f1099ints: [{
              ...(result.pending.f1099int?.f1099ints as Record<
                string,
                unknown
              >[])[0],
              box3: 9_000,
            }],
          },
        },
      },
    )
  );
  assertThrows(() =>
    form1116Pdf.projectFields?.(parent, {
      ...result.pending,
      f1040: {
        ...result.pending.f1040,
        line2b_taxable_interest: 59_000,
      },
    })
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
    "Treasury-interest route",
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

Deno.test("Form 1116 sole 1099-INT PDF rejects other payer amounts that contradict the sole-income review", () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  const parent = result.pending.form_1116;
  const source = result.pending.f1099int;
  assert(parent);
  assert(source);
  const row = (source.f1099ints as Array<Record<string, unknown>>)[0];
  assert(row);
  for (
    const extra of [
      { box3: 200 },
      { box8: 100 },
      { box4: 25 },
      { box11: 50, elect_bond_premium_amortization: true },
    ]
  ) {
    assertThrows(
      () =>
        form1116Pdf.projectFields?.(parent, {
          ...result.pending,
          f1099int: { ...source, f1099ints: [{ ...row, ...extra }] },
        }),
      Error,
      "box3" in extra
        ? "Treasury-interest deduction"
        : "must match the identified source",
    );
  }
});

Deno.test("Form 1116 single-source passive credit uses and expires a reviewed 2015 vintage", () => {
  const { form1116_carryover_review: _excessReview, ...source } = inputs();
  const result = execute(buildExecutionPlan(registry), registry, {
    ...source,
    f1099int: [{ ...source.f1099int[0], box6: 100 }],
    form1116_review: {
      ...source.form1116_review,
      single_source_pdf_review: {
        ...singleSourceReview,
        no_prior_year_carryover_or_carryback_confirmed: false,
      },
    },
    form1116_prior_carryover: {
      carryovers: [{
        income_category: "passive",
        vintages: [{
          vintage_tax_year: 2015,
          prior_year_schedule_b_line8_vintage_amount: 9_000,
        }],
        prior_year_schedule_b_line8_total: 9_000,
        prior_year_schedule_b_line8_other_vintages_total: 0,
        no_intervening_adjustments: true,
        source_document_references: [
          "Filed 2024 passive Schedule B line 8, 2015-origin credit",
        ],
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const parent = result.pending.form_1116;
  const scheduleB = result.pending.form1116_schedule_b;
  assert(parent);
  assert(scheduleB);
  const summary =
    (parent.category_summaries as Array<Record<string, number>>)[0];
  assert(summary);
  const projected = form1116Pdf.projectFields?.(parent, result.pending) ?? {};
  const scheduleProjection = form1116ScheduleBPdf.projectFields?.(
    scheduleB,
    result.pending,
  ) ?? {};
  assertEquals(projected.pdf_line10, 9_000);
  assertEquals(projected.pdf_line24, summary.allowedCredit);
  assertEquals(
    projected.pdf_line35,
    result.pending.schedule3?.line1_foreign_tax_credit,
  );
  assertEquals(
    scheduleProjection.line5_2015,
    -9_000 + summary.usedPriorYearCarryover,
  );
  assertEquals(scheduleProjection.line8_2015, 0);
  const [xml] = form1116.build(
    parent as Parameters<typeof form1116.build>[0],
    { pending: result.pending },
  );
  assert(
    xml.includes(
      "<ForeignTaxCrCarrybackOrOverAmt>9000</ForeignTaxCrCarrybackOrOverAmt>",
    ),
  );
  const scheduleXml = form1116ScheduleB.build(
    scheduleBFieldsSchema.parse(scheduleB),
  );
  assert(scheduleXml.includes("ForeignTxCyovExprUnsdCurrTYGrp"));

  assertThrows(() =>
    form1116Pdf.projectFields?.(parent, {
      ...result.pending,
      form1116_schedule_b: {
        ...scheduleB,
        remaining_prior_year_carryover: 1,
      },
    }), Error);
  assertThrows(
    () =>
      form1116Pdf.projectFields?.({
        ...parent,
        single_source_pdf_review: singleSourceReview,
      }, result.pending),
    Error,
    "carryover review",
  );
});

Deno.test("Form 1116 uses filed 2023 before 2024 carryover through return, native forms, and PDFs", async () => {
  const { form1116_carryover_review: _excessReview, ...source } = inputs();
  const filedScheduleB = {
    income_category: "passive",
    vintages: [
      {
        vintage_tax_year: 2024,
        prior_year_schedule_b_line8_vintage_amount: 9_000,
      },
      {
        vintage_tax_year: 2023,
        prior_year_schedule_b_line8_vintage_amount: 100,
      },
    ],
    prior_year_schedule_b_line8_total: 9_100,
    prior_year_schedule_b_line8_other_vintages_total: 0,
    no_intervening_adjustments: true,
    source_document_references: [
      "Filed 2024 passive Schedule B (Form 1116), line 8 2023 and 2024 columns and total",
    ],
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    ...source,
    f1099int: [{ ...source.f1099int[0], box6: 100 }],
    form1116_review: {
      ...source.form1116_review,
      single_source_pdf_review: {
        ...singleSourceReview,
        no_prior_year_carryover_or_carryback_confirmed: false,
      },
    },
    form1116_prior_carryover: { carryovers: [filedScheduleB] },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const parent = result.pending.form_1116;
  const scheduleB = result.pending.form1116_schedule_b;
  const schedule3 = result.pending.schedule3;
  const return1040 = result.pending.f1040;
  assert(parent && scheduleB && schedule3 && return1040);
  const summary =
    (parent.category_summaries as Array<Record<string, number>>)[0];
  assertEquals(summary.priorYearCarryover, 9_100);
  assert(summary.usedPriorYearCarryover > 100);
  assert(summary.usedPriorYearCarryover < 9_100);
  assertEquals(summary.allowedCredit, 100 + summary.usedPriorYearCarryover);
  assertEquals(scheduleB.case, "prior_year_use");
  assertEquals(
    scheduleB.remaining_prior_year_carryover,
    9_100 - summary.usedPriorYearCarryover,
  );
  assertEquals(schedule3.line1_foreign_tax_credit, summary.allowedCredit);
  assertEquals(return1040.line20_nonrefundable_credits, schedule3.line8_total);
  const parentPdf = form1116Pdf.projectFields?.(parent, result.pending) ?? {};
  const schedulePdf = form1116ScheduleBPdf.projectFields?.(
    scheduleB,
    result.pending,
  ) ?? {};
  assertEquals(parentPdf.pdf_line10, 9_100);
  assertEquals(parentPdf.pdf_line24, summary.allowedCredit);
  assertEquals(parentPdf.pdf_line35, summary.allowedCredit);
  assertEquals(schedulePdf.line1_2023, 100);
  assertEquals(schedulePdf.line1_2024, 9_000);
  assertEquals(schedulePdf.line4_2023, -100);
  assertEquals(schedulePdf.line4_2024, -(summary.usedPriorYearCarryover - 100));
  assertEquals(schedulePdf.line8_2023, 0);
  assertEquals(schedulePdf.line8_2024, 9_100 - summary.usedPriorYearCarryover);
  const filer =
    pdfReviewFixtures.find((fixture) => fixture.id === "single-w2-refund")!
      .filer;
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    bundle.xml,
    "<ForeignTaxCrCarrybackOrOverAmt>9100</ForeignTaxCrCarrybackOrOverAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<SecondPrecedingTYAmt>100</SecondPrecedingTYAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<FirstPrecedingTYAmt>9000</FirstPrecedingTYAmt>",
  );
  assert(
    (await buildPdfBytes(pending, filer, ".pdf-cache", bundle)).length > 0,
  );

  // A changed vintage split preserves the $9,100 total and the same parent
  // credit, but must not replace the reviewed filed 2024 Schedule B columns.
  const changedSplit = {
    ...pending,
    form1116_schedule_b: {
      ...pending.form1116_schedule_b,
      prior_year_carryover_source: {
        ...filedScheduleB,
        vintages: [
          {
            vintage_tax_year: 2023,
            prior_year_schedule_b_line8_vintage_amount: 200,
          },
          {
            vintage_tax_year: 2024,
            prior_year_schedule_b_line8_vintage_amount: 8_900,
          },
        ],
      },
    },
  };
  assertThrows(
    () =>
      form1116.build(parent as Parameters<typeof form1116.build>[0], {
        pending: changedSplit,
      }),
    Error,
    "filed source",
  );
  assertThrows(
    () =>
      form1116ScheduleBPdf.projectFields?.(
        changedSplit.form1116_schedule_b,
        changedSplit,
      ),
    Error,
    "filed source",
  );
  await assertRejects(() =>
    buildMefBundle(changedSplit, { filer, attachments: [] })
  );
  await assertRejects(() =>
    buildPdfBytes(changedSplit, filer, ".pdf-cache", bundle)
  );
  const changedIntake = {
    ...pending,
    form1116_prior_carryover: {
      carryovers: [
        changedSplit.form1116_schedule_b.prior_year_carryover_source,
      ],
    },
  };
  assertThrows(
    () =>
      form1116.build(parent as Parameters<typeof form1116.build>[0], {
        pending: changedIntake,
      }),
    Error,
    "filed source",
  );
  assertThrows(
    () =>
      form1116ScheduleBPdf.projectFields?.(
        scheduleB,
        changedIntake,
      ),
    Error,
    "filed source",
  );

  for (
    const altered of [
      {
        ...pending,
        form1116_schedule_b: {
          ...pending.form1116_schedule_b,
          used_prior_year_carryover: summary.usedPriorYearCarryover - 1,
        },
      },
      {
        ...pending,
        form1116_schedule_b: {
          ...pending.form1116_schedule_b,
          prior_year_carryover_source: {
            ...filedScheduleB,
            vintages: [
              filedScheduleB.vintages[0],
              {
                ...filedScheduleB.vintages[1],
                prior_year_schedule_b_line8_vintage_amount: 101,
              },
            ],
          },
        },
      },
    ]
  ) {
    await assertRejects(() =>
      buildMefBundle(altered, { filer, attachments: [] })
    );
    await assertRejects(() =>
      buildPdfBytes(altered, filer, ".pdf-cache", bundle)
    );
  }
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(parent, {
        ...result.pending,
        form1116_schedule_b: {
          ...scheduleB,
          prior_year_carryover_source: {
            ...filedScheduleB,
            vintages: [
              {
                vintage_tax_year: 2023,
                prior_year_schedule_b_line8_vintage_amount: 200,
              },
              {
                vintage_tax_year: 2024,
                prior_year_schedule_b_line8_vintage_amount: 8_900,
              },
            ],
          },
        },
      }),
    Error,
    "filed source",
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(parent, {
        ...result.pending,
        f1040: {
          ...return1040,
          line20_nonrefundable_credits: summary.allowedCredit - 1,
        },
      }),
    Error,
    "Form 1040",
  );
  const changedReturn = {
    ...pending,
    f1040: {
      ...pending.f1040,
      line20_nonrefundable_credits: summary.allowedCredit - 1,
    },
  };
  assertThrows(
    () =>
      form1116.build(parent as Parameters<typeof form1116.build>[0], {
        pending: changedReturn,
      }),
    Error,
    "Schedule 3 and Form 1040",
  );
  assertThrows(
    () => form1116ScheduleBPdf.projectFields?.(scheduleB, changedReturn),
    Error,
    "Schedule 3 and Form 1040",
  );
});
