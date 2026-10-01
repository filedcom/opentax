import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { inputSchema as form1095aSchema } from "../../nodes/inputs/f1095a/index.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { form8962Pdf } from "./forms/f8962.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-sequential-no-aptc-policies-200-fpl"
)!;
const threePolicyFixture = pdfReviewFixtures.find((item) =>
  item.id === "single-sequential-three-no-aptc-policies-200-fpl"
)!;
const threeGapFixture = pdfReviewFixtures.find((item) =>
  item.id === "single-three-no-aptc-policies-three-uncovered-months"
)!;
const fourGapFixture = pdfReviewFixtures.find((item) =>
  item.id === "single-three-no-aptc-policies-four-uncovered-months"
)!;

for (
  const variant of [
    {
      id: "single-four-sequential-no-aptc-policies-full-year",
      credit: 8_400,
      coveredMonths: 12,
      gaps: [] as number[],
    },
    {
      id: "single-four-sequential-no-aptc-policies-four-gaps",
      credit: 5_600,
      coveredMonths: 8,
      gaps: [3, 6, 9, 12],
    },
  ]
) {
  Deno.test(`four sourced sequential no-APTC policies reconcile ${variant.coveredMonths} covered months to Form 1040, MeF, and PDF`, async () => {
    const policyFixture = pdfReviewFixtures.find((item) =>
      item.id === variant.id
    )!;
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      policyFixture.inputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.form8962.total_premium_tax_credit,
      variant.credit,
    );
    assertEquals(result.pending.form8962.total_advance_ptc, 0);
    assertEquals(
      result.pending.schedule3.line9_premium_tax_credit,
      variant.credit,
    );
    assertEquals(
      result.pending.f1040.line31_additional_payments,
      variant.credit,
    );
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: policyFixture.filer,
      attachments: [],
    });
    assertEquals(
      (bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
      variant.coveredMonths,
    );
    assertStringIncludes(
      bundle.xml,
      `<ReconciledPremiumTaxCreditAmt>${variant.credit}</ReconciledPremiumTaxCreditAmt>`,
    );
    const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
      {};
    assertEquals(
      form8962Pdf.instances?.(projected, policyFixture.filer, pending)?.length,
      1,
    );
    for (const month of variant.gaps) {
      const name = [
        "JANUARY",
        "FEBRUARY",
        "MARCH",
        "APRIL",
        "MAY",
        "JUNE",
        "JULY",
        "AUGUST",
        "SEPTEMBER",
        "OCTOBER",
        "NOVEMBER",
        "DECEMBER",
      ][month - 1];
      assertEquals(bundle.xml.includes(`<MonthCd>${name}</MonthCd>`), false);
      assertEquals(
        (projected as Record<string, unknown>)[`pdf_month_${month}_premium`],
        undefined,
      );
    }
    const pdf = await buildPdfBytes(
      pending,
      policyFixture.filer,
      ".pdf-cache",
      bundle,
    );
    assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

    const source = form1095aSchema.parse(pending.f1095a);
    const first = source.f1095as[0];
    const second = source.f1095as[1];
    const fourth = source.f1095as[3];
    const overlap = {
      ...pending,
      f1095a: {
        f1095as: [{
          ...first,
          monthly_premiums: first.monthly_premiums!.map((amount, index) =>
            index === 3 ? 900 : amount
          ),
          annual_premium: first.annual_premium! + 900,
        }, ...source.f1095as.slice(1)],
      },
    };
    await assertRejects(
      () =>
        buildMefBundle(overlap, {
          filer: policyFixture.filer,
          attachments: [],
        }),
      Error,
      "four-policy monthly PTC needs distinct same-state nonshared policies",
    );
    const wrongOwner = {
      ...pending,
      f1095a: {
        f1095as: [source.f1095as[0], {
          ...second,
          covered_individual_ssns: ["999887777"],
        }, ...source.f1095as.slice(2)],
      },
    };
    await assertRejects(
      () =>
        buildMefBundle(wrongOwner, {
          filer: policyFixture.filer,
          attachments: [],
        }),
      Error,
      "four-policy monthly PTC needs distinct same-state nonshared policies",
    );
    await assertRejects(
      async () => {
        form8962Pdf.instances?.(projected, policyFixture.filer, wrongOwner);
      },
      Error,
      "four-policy monthly PTC needs distinct same-state nonshared policies",
    );
    const missingPayment = {
      ...pending,
      f1095a: {
        f1095as: [...source.f1095as.slice(0, 3), {
          ...fourth,
          no_aptc_monthly_evidence: fourth.no_aptc_monthly_evidence!.slice(1),
        }],
      },
    };
    await assertRejects(
      () =>
        buildMefBundle(missingPayment, {
          filer: policyFixture.filer,
          attachments: [],
        }),
      Error,
      "four-policy monthly PTC needs a determination and payment for every policy-covered month",
    );
    if (variant.gaps.length > 0) {
      const returning = {
        ...pending,
        f1095a: {
          f1095as: [{
            ...first,
            monthly_premiums: first.monthly_premiums!.map((amount, index) =>
              index === 5 ? 900 : amount
            ),
            annual_premium: first.annual_premium! + 900,
          }, ...source.f1095as.slice(1)],
        },
      };
      await assertRejects(
        () =>
          buildMefBundle(returning, {
            filer: policyFixture.filer,
            attachments: [],
          }),
        Error,
        "four-policy monthly PTC needs distinct same-state nonshared policies",
      );
    }
    await assertRejects(
      () =>
        buildMefBundle({
          ...pending,
          schedule3: {
            ...pending.schedule3,
            line9_premium_tax_credit: variant.credit - 1,
          },
        }, {
          filer: policyFixture.filer,
          attachments: [],
        }),
      Error,
      "four-policy monthly credit differs from finalized return",
    );
  });
}

for (
  const variant of [
    {
      id: "single-five-sequential-no-aptc-policies-full-year",
      policyCount: 5,
      credit: 8_200,
    },
    {
      id: "single-twelve-sequential-no-aptc-policies-full-year",
      policyCount: 12,
      credit: 7_800,
    },
  ]
) {
  Deno.test(`${variant.policyCount} sourced sequential no-APTC policies reconcile every month to Form 1040, MeF, and PDF`, async () => {
    const policyFixture = pdfReviewFixtures.find((item) =>
      item.id === variant.id
    )!;
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      policyFixture.inputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.form8962.total_premium_tax_credit,
      variant.credit,
    );
    assertEquals(result.pending.form8962.total_advance_ptc, 0);
    assertEquals(
      result.pending.schedule3.line9_premium_tax_credit,
      variant.credit,
    );
    assertEquals(
      result.pending.f1040.line31_additional_payments,
      variant.credit,
    );
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: policyFixture.filer,
      attachments: [],
    });
    assertEquals(
      (bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
      12,
    );
    assertStringIncludes(
      bundle.xml,
      `<ReconciledPremiumTaxCreditAmt>${variant.credit}</ReconciledPremiumTaxCreditAmt>`,
    );
    const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
      {};
    assertEquals(
      form8962Pdf.instances?.(projected, policyFixture.filer, pending)?.length,
      1,
    );
    const pdf = await buildPdfBytes(
      pending,
      policyFixture.filer,
      ".pdf-cache",
      bundle,
    );
    assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

    const source = form1095aSchema.parse(pending.f1095a);
    const first = source.f1095as[0];
    const second = source.f1095as[1];
    await assertRejects(
      () =>
        buildMefBundle({
          ...pending,
          f1095a: {
            f1095as: [
              first,
              { ...second, policy_number: first.policy_number },
              ...source.f1095as.slice(2),
            ],
          },
        }, {
          filer: policyFixture.filer,
          attachments: [],
        }),
      Error,
      `${variant.policyCount}-policy monthly PTC needs distinct same-state nonshared policies`,
    );
    await assertRejects(
      () =>
        buildMefBundle({
          ...pending,
          f1095a: {
            f1095as: [first, {
              ...second,
              no_aptc_monthly_evidence: second.no_aptc_monthly_evidence!.slice(
                1,
              ),
            }, ...source.f1095as.slice(2)],
          },
        }, {
          filer: policyFixture.filer,
          attachments: [],
        }),
      Error,
      `${variant.policyCount}-policy monthly PTC needs a determination and payment for every policy-covered month`,
    );
    await assertRejects(
      () =>
        buildMefBundle({
          ...pending,
          schedule3: {
            ...pending.schedule3,
            line9_premium_tax_credit: variant.credit - 1,
          },
        }, {
          filer: policyFixture.filer,
          attachments: [],
        }),
      Error,
      `${variant.policyCount}-policy monthly credit differs from finalized return`,
    );
  });
}

for (
  const variant of [
    {
      id: "single-two-no-aptc-policies-ten-uncovered-months",
      coveredMonths: [1, 12],
      credit: 1_200,
      policyCount: 2,
    },
    {
      id: "single-three-no-aptc-policies-nine-uncovered-months",
      coveredMonths: [1, 6, 12],
      credit: 1_950,
      policyCount: 3,
    },
  ] as const
) {
  Deno.test(`${variant.policyCount} sequential no-APTC policies support every possible uncovered-month count`, async () => {
    const sparseFixture = pdfReviewFixtures.find((item) =>
      item.id === variant.id
    )!;
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      sparseFixture.inputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.form8962.total_premium_tax_credit,
      variant.credit,
    );
    assertEquals(
      result.pending.schedule3.line9_premium_tax_credit,
      variant.credit,
    );
    assertEquals(
      result.pending.f1040.line31_additional_payments,
      variant.credit,
    );
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: sparseFixture.filer,
      attachments: [],
    });
    assertEquals(
      (bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
      variant.policyCount,
    );
    assertStringIncludes(
      bundle.xml,
      `<ReconciledPremiumTaxCreditAmt>${variant.credit}</ReconciledPremiumTaxCreditAmt>`,
    );
    const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
      {};
    assertEquals(
      form8962Pdf.instances?.(projected, sparseFixture.filer, pending)?.length,
      1,
    );
    for (let month = 1; month <= 12; month++) {
      if (variant.coveredMonths.some((covered) => covered === month)) continue;
      const name = [
        "JANUARY",
        "FEBRUARY",
        "MARCH",
        "APRIL",
        "MAY",
        "JUNE",
        "JULY",
        "AUGUST",
        "SEPTEMBER",
        "OCTOBER",
        "NOVEMBER",
        "DECEMBER",
      ][month - 1];
      assertEquals(bundle.xml.includes(`<MonthCd>${name}</MonthCd>`), false);
      assertEquals(
        (projected as Record<string, unknown>)[`pdf_month_${month}_premium`],
        undefined,
      );
    }
    const pdf = await buildPdfBytes(
      pending,
      sparseFixture.filer,
      ".pdf-cache",
      bundle,
    );
    assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

    const source = form1095aSchema.parse(pending.f1095a);
    const changedPolicy = source.f1095as[variant.policyCount - 1];
    const unsupportedCoverage = variant.policyCount === 2
      ? {
        ...changedPolicy,
        monthly_premiums: changedPolicy.monthly_premiums!.map((amount, index) =>
          index === 0 ? 900 : index === 11 ? 0 : amount
        ),
      }
      : {
        ...source.f1095as[0],
        monthly_premiums: source.f1095as[0].monthly_premiums!.map((
          amount,
          index,
        ) => index === 2 ? 900 : amount),
        annual_premium: 1_800,
      };
    const unsupported = {
      ...pending,
      f1095a: {
        f1095as: variant.policyCount === 2
          ? [source.f1095as[0], unsupportedCoverage]
          : [unsupportedCoverage, ...source.f1095as.slice(1)],
      },
    };
    await assertRejects(
      () =>
        buildMefBundle(unsupported, {
          filer: sparseFixture.filer,
          attachments: [],
        }),
      Error,
      "monthly PTC needs distinct same-state nonshared policies",
    );
    await assertRejects(
      async () => {
        form8962Pdf.instances?.(projected, sparseFixture.filer, unsupported);
      },
      Error,
      "monthly PTC needs distinct same-state nonshared policies",
    );
    await assertRejects(
      () =>
        buildMefBundle({
          ...pending,
          schedule3: {
            ...pending.schedule3,
            line9_premium_tax_credit: variant.credit - 1,
          },
        }, {
          filer: sparseFixture.filer,
          attachments: [],
        }),
      Error,
      "monthly credit differs from finalized return",
    );
  });
}

Deno.test("three sequential no-APTC policies leave four sourced months uncovered at 200% FPL", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fourGapFixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962.total_premium_tax_credit, 5_200);
  assertEquals(result.pending.schedule3.line9_premium_tax_credit, 5_200);
  assertEquals(result.pending.f1040.line31_additional_payments, 5_200);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: fourGapFixture.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
    8,
  );
  for (const month of ["APRIL", "JULY", "AUGUST", "DECEMBER"]) {
    assertEquals(bundle.xml.includes(`<MonthCd>${month}</MonthCd>`), false);
  }
  assertStringIncludes(
    bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>5200</ReconciledPremiumTaxCreditAmt>",
  );
  const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
    {};
  assertEquals(
    form8962Pdf.instances?.(projected, fourGapFixture.filer, pending)?.length,
    1,
  );
  for (const month of [4, 7, 8, 12]) {
    assertEquals(
      (projected as Record<string, unknown>)[`pdf_month_${month}_premium`],
      undefined,
    );
  }
  const pdf = await buildPdfBytes(
    pending,
    fourGapFixture.filer,
    ".pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  const source = form1095aSchema.parse(pending.f1095a);
  const third = source.f1095as[2];
  const fifthGap = {
    ...pending,
    f1095a: {
      f1095as: [...source.f1095as.slice(0, 2), {
        ...third,
        monthly_premiums: third.monthly_premiums!.map((amount, index) =>
          index === 10 ? 0 : amount
        ),
        annual_premium: 1_800,
        slcsp_corrections: third.slcsp_corrections!.filter((item) =>
          item.month !== 11
        ),
        no_aptc_monthly_evidence: third.no_aptc_monthly_evidence!.filter((
          item,
        ) => item.month !== 11),
      }],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(fifthGap, {
        filer: fourGapFixture.filer,
        attachments: [],
      }),
    Error,
    "uncovered month 11 must have zero policy and credit amounts",
  );
  await assertRejects(
    async () => {
      form8962Pdf.instances?.(projected, fourGapFixture.filer, fifthGap);
    },
    Error,
    "uncovered month 11 must have zero policy and credit amounts",
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        schedule3: {
          ...pending.schedule3,
          line9_premium_tax_credit: 5_199,
        },
      }, {
        filer: fourGapFixture.filer,
        attachments: [],
      }),
    Error,
    "monthly credit differs from finalized return",
  );
});

Deno.test("three sequential no-APTC policies leave three sourced months uncovered at 200% FPL", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    threeGapFixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962.total_premium_tax_credit, 5_850);
  assertEquals(result.pending.schedule3.line9_premium_tax_credit, 5_850);
  assertEquals(result.pending.f1040.line31_additional_payments, 5_850);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: threeGapFixture.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
    9,
  );
  for (const month of ["APRIL", "AUGUST", "DECEMBER"]) {
    assertEquals(bundle.xml.includes(`<MonthCd>${month}</MonthCd>`), false);
  }
  assertStringIncludes(
    bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>5850</ReconciledPremiumTaxCreditAmt>",
  );
  const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
    {};
  assertEquals(
    form8962Pdf.instances?.(projected, threeGapFixture.filer, pending)?.length,
    1,
  );
  for (const month of [4, 8, 12]) {
    assertEquals(
      (projected as Record<string, unknown>)[`pdf_month_${month}_premium`],
      undefined,
    );
  }
  const pdf = await buildPdfBytes(
    pending,
    threeGapFixture.filer,
    ".pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);
  const source = form1095aSchema.parse(pending.f1095a);
  const second = source.f1095as[1];
  const third = source.f1095as[2];
  const fifthGap = {
    ...pending,
    f1095a: {
      f1095as: [source.f1095as[0], {
        ...second,
        monthly_premiums: second.monthly_premiums!.map((amount, index) =>
          index === 6 ? 0 : amount
        ),
        annual_premium: 1_800,
        slcsp_corrections: second.slcsp_corrections!.filter((item) =>
          item.month !== 7
        ),
        no_aptc_monthly_evidence: second.no_aptc_monthly_evidence!.filter((
          item,
        ) => item.month !== 7),
      }, {
        ...third,
        monthly_premiums: third.monthly_premiums!.map((amount, index) =>
          index === 10 ? 0 : amount
        ),
        annual_premium: 1_800,
        slcsp_corrections: third.slcsp_corrections!.filter((item) =>
          item.month !== 11
        ),
        no_aptc_monthly_evidence: third.no_aptc_monthly_evidence!.filter((
          item,
        ) => item.month !== 11),
      }],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(fifthGap, {
        filer: threeGapFixture.filer,
        attachments: [],
      }),
    Error,
    "uncovered month 7 must have zero policy and credit amounts",
  );
  await assertRejects(
    async () => {
      form8962Pdf.instances?.(projected, threeGapFixture.filer, fifthGap);
    },
    Error,
    "uncovered month 7 must have zero policy and credit amounts",
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        schedule3: {
          ...pending.schedule3,
          line9_premium_tax_credit: 5_849,
        },
      }, {
        filer: threeGapFixture.filer,
        attachments: [],
      }),
    Error,
    "monthly credit differs from finalized return",
  );
});

for (
  const variant of [
    {
      id: "single-two-no-aptc-policies-july-uncovered",
      policyCount: 2,
      uncoveredMonth: 7,
      credit: 6_550,
    },
    {
      id: "single-three-no-aptc-policies-september-uncovered",
      policyCount: 3,
      uncoveredMonth: 9,
      credit: 7_050,
    },
  ] as const
) {
  Deno.test(`${variant.policyCount} no-APTC policies leave one sourced month uncovered with zero PTC`, async () => {
    const gapFixture = pdfReviewFixtures.find((item) =>
      item.id === variant.id
    )!;
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      gapFixture.inputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.form8962.total_premium_tax_credit,
      variant.credit,
    );
    assertEquals(result.pending.form8962.total_advance_ptc, 0);
    assertEquals(
      result.pending.schedule3.line9_premium_tax_credit,
      variant.credit,
    );
    assertEquals(
      result.pending.f1040.line31_additional_payments,
      variant.credit,
    );
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: gapFixture.filer,
      attachments: [],
    });
    assertEquals(
      (bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
      11,
    );
    const monthName = variant.uncoveredMonth === 7 ? "JULY" : "SEPTEMBER";
    assertEquals(bundle.xml.includes(`<MonthCd>${monthName}</MonthCd>`), false);
    assertStringIncludes(
      bundle.xml,
      `<ReconciledPremiumTaxCreditAmt>${variant.credit}</ReconciledPremiumTaxCreditAmt>`,
    );
    const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
      {};
    assertEquals(
      (projected as Record<string, unknown>)[
        `pdf_month_${variant.uncoveredMonth}_premium`
      ],
      undefined,
    );
    const pdf = await buildPdfBytes(
      pending,
      gapFixture.filer,
      ".pdf-cache",
      bundle,
    );
    assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

    const source = form1095aSchema.parse(pending.f1095a);
    const firstPolicy = source.f1095as[0];
    const ghostEvidence = {
      ...pending,
      f1095a: {
        f1095as: [{
          ...firstPolicy,
          no_aptc_monthly_evidence: [
            ...firstPolicy.no_aptc_monthly_evidence!,
            {
              ...firstPolicy.no_aptc_monthly_evidence![0],
              month: variant.uncoveredMonth,
            },
          ],
        }, ...source.f1095as.slice(1)],
      },
    };
    await assertRejects(
      () =>
        buildMefBundle(ghostEvidence, {
          filer: gapFixture.filer,
          attachments: [],
        }),
      Error,
      "determination and payment for every policy-covered month",
    );
    await assertRejects(
      () =>
        buildPdfBytes(
          ghostEvidence,
          gapFixture.filer,
          ".pdf-cache",
          bundle,
        ),
      Error,
      "determination and payment for every policy-covered month",
    );
    const lastPolicyIndex = variant.policyCount - 1;
    const lastPolicy = source.f1095as[lastPolicyIndex];
    const secondGap = {
      ...pending,
      f1095a: {
        f1095as: source.f1095as.map((policy, index) =>
          index === lastPolicyIndex
            ? {
              ...lastPolicy,
              monthly_premiums: lastPolicy.monthly_premiums?.map(
                (amount, month) =>
                  month === variant.uncoveredMonth ? 0 : amount,
              ),
            }
            : policy
        ),
      },
    };
    await assertRejects(
      () =>
        buildMefBundle(secondGap, {
          filer: gapFixture.filer,
          attachments: [],
        }),
      Error,
      "monthly PTC needs distinct same-state nonshared policies",
    );
  });
}

Deno.test("two sequential no-APTC policies at 200% FPL reconcile every paid month through Form 8962, Schedule 3, Form 1040, MeF, and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962.total_premium_tax_credit, 7_200);
  assertEquals(result.pending.form8962.total_advance_ptc, 0);
  assertEquals(result.pending.schedule3.line9_premium_tax_credit, 7_200);
  assertEquals(result.pending.f1040.line31_additional_payments, 7_200);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
    12,
  );
  assertStringIncludes(
    bundle.xml,
    "<TotalPremiumTaxCreditAmt>7200</TotalPremiumTaxCreditAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>7200</ReconciledPremiumTaxCreditAmt>",
  );
  const pdf = await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  const source = form1095aSchema.parse(pending.f1095a);
  const missingJulyPayment = {
    ...pending,
    f1095a: {
      f1095as: [source.f1095as[0], {
        ...source.f1095as[1],
        no_aptc_monthly_evidence: source.f1095as[1]
          .no_aptc_monthly_evidence?.slice(1),
      }],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(missingJulyPayment, {
        filer: fixture.filer,
        attachments: [],
      }),
    Error,
    "determination and payment for every policy-covered month",
  );
  await assertRejects(
    () =>
      buildPdfBytes(
        missingJulyPayment,
        fixture.filer,
        ".pdf-cache",
        bundle,
      ),
    Error,
    "determination and payment for every policy-covered month",
  );
  const lateJulyPayment = {
    ...pending,
    f1095a: {
      f1095as: [source.f1095as[0], {
        ...source.f1095as[1],
        no_aptc_monthly_evidence: source.f1095as[1]
          .no_aptc_monthly_evidence?.map((item) =>
            item.month === 7
              ? {
                ...item,
                premium_payment: {
                  ...item.premium_payment,
                  paid_on: "2026-04-16",
                },
              }
              : item
          ),
      }],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(lateJulyPayment, {
        filer: fixture.filer,
        attachments: [],
      }),
    Error,
    "lacks matching SLCSP or full payment evidence",
  );
});

Deno.test("three sequential no-APTC policies at 200% FPL reconcile their own reviewed months through the complete return", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    threePolicyFixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962.total_premium_tax_credit, 7_800);
  assertEquals(result.pending.form8962.total_advance_ptc, 0);
  assertEquals(result.pending.schedule3.line9_premium_tax_credit, 7_800);
  assertEquals(result.pending.f1040.line31_additional_payments, 7_800);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: threePolicyFixture.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
    12,
  );
  for (const slcsp of [600, 700, 800]) {
    assertEquals(
      (bundle.xml.match(
        new RegExp(
          `<MonthlyPremiumSLCSPAmt>${slcsp}</MonthlyPremiumSLCSPAmt>`,
          "g",
        ),
      ) ?? []).length,
      4,
    );
  }
  assertStringIncludes(
    bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>7800</ReconciledPremiumTaxCreditAmt>",
  );
  const pdf = await buildPdfBytes(
    pending,
    threePolicyFixture.filer,
    ".pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  const source = form1095aSchema.parse(pending.f1095a);
  const missingThirdPolicyProof = {
    ...pending,
    f1095a: {
      f1095as: [source.f1095as[0], source.f1095as[1], {
        ...source.f1095as[2],
        no_aptc_monthly_evidence: source.f1095as[2]
          .no_aptc_monthly_evidence?.slice(1),
      }],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(missingThirdPolicyProof, {
        filer: threePolicyFixture.filer,
        attachments: [],
      }),
    Error,
    "three-policy monthly PTC needs a determination and payment for every policy-covered month",
  );
  await assertRejects(
    () =>
      buildPdfBytes(
        missingThirdPolicyProof,
        threePolicyFixture.filer,
        ".pdf-cache",
        bundle,
      ),
    Error,
    "three-policy monthly PTC needs a determination and payment for every policy-covered month",
  );
  const overlappingThirdPolicy = {
    ...pending,
    f1095a: {
      f1095as: [source.f1095as[0], source.f1095as[1], {
        ...source.f1095as[2],
        monthly_premiums: source.f1095as[2].monthly_premiums?.map(
          (amount, index) => index === 7 ? 900 : amount,
        ),
      }],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(overlappingThirdPolicy, {
        filer: threePolicyFixture.filer,
        attachments: [],
      }),
    Error,
    "three-policy monthly PTC needs distinct same-state nonshared policies",
  );
  const returningFirstPolicy = {
    ...pending,
    f1095a: {
      f1095as: [
        {
          ...source.f1095as[0],
          monthly_premiums: source.f1095as[0].monthly_premiums?.map(
            (amount, index) => index === 11 ? 900 : amount,
          ),
        },
        source.f1095as[1],
        {
          ...source.f1095as[2],
          monthly_premiums: source.f1095as[2].monthly_premiums?.map(
            (amount, index) => index === 11 ? 0 : amount,
          ),
        },
      ],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(returningFirstPolicy, {
        filer: threePolicyFixture.filer,
        attachments: [],
      }),
    Error,
    "three-policy monthly PTC needs distinct same-state nonshared policies",
  );
});
