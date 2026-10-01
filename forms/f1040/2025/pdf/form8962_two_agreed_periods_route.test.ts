import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { form8962Pdf } from "./forms/f8962.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-situation4-two-agreed-percentages"
)!;

Deno.test("two sourced Situation 4 percentages reach monthly Form 8962, Part IV, Schedule 3, Form 1040, MeF, and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962.total_premium_tax_credit, 7_200);
  assertEquals(result.pending.form8962.total_advance_ptc, 4_800);
  assertEquals(result.pending.form8962.net_premium_tax_credit, 2_400);
  assertEquals(result.pending.schedule3.line9_premium_tax_credit, 2_400);
  assertEquals(result.pending.f1040.line31_additional_payments, 2_400);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<SharedPolicyAllocationGrp>/g) ?? []).length,
    2,
  );
  for (const percentage of ["0.20", "0.80"]) {
    assertStringIncludes(
      bundle.xml,
      `<MonthlyPremiumPct>${percentage}</MonthlyPremiumPct>`,
    );
    assertStringIncludes(
      bundle.xml,
      `<MonthlyPremiumSLCSPPct>${percentage}</MonthlyPremiumSLCSPPct>`,
    );
    assertStringIncludes(
      bundle.xml,
      `<MonthlyAdvancedPTCPct>${percentage}</MonthlyAdvancedPTCPct>`,
    );
  }
  for (const amount of [240, 960]) {
    assertStringIncludes(
      bundle.xml,
      `<MonthlyPremiumAmt>${amount}</MonthlyPremiumAmt>`,
    );
  }
  for (const amount of [300, 1_200]) {
    assertStringIncludes(
      bundle.xml,
      `<MonthlyPremiumSLCSPAmt>${amount}</MonthlyPremiumSLCSPAmt>`,
    );
  }
  for (const amount of [160, 640]) {
    assertStringIncludes(
      bundle.xml,
      `<MonthlyAdvancedPTCAmt>${amount}</MonthlyAdvancedPTCAmt>`,
    );
  }
  assertStringIncludes(
    bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>2400</ReconciledPremiumTaxCreditAmt>",
  );
  const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
    {};
  assertEquals(
    (projected as Record<string, unknown>).pdf_allocation_1_premium_pct,
    "0.20",
  );
  assertEquals(
    (projected as Record<string, unknown>).pdf_allocation_2_premium_pct,
    "0.80",
  );
  const pdf = await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  const policy = (pending.f1095a?.f1095as as Record<string, unknown>[])[0];
  const periods = policy.shared_policy_periods as Record<string, unknown>[];
  const firstReview = periods[0].agreement_review as Record<string, unknown>;
  const secondReview = periods[1].agreement_review as Record<string, unknown>;
  for (
    const changedSecondReview of [
      { ...secondReview, filer_allocation_pct: 0.2 },
      { ...secondReview, start_month: 6 },
      { ...secondReview, other_taxpayer_ssn: "999887777" },
      { ...secondReview, agreement_reference: firstReview.agreement_reference },
      { ...secondReview, agreement_sha256: firstReview.agreement_sha256 },
    ]
  ) {
    const drift = {
      ...pending,
      f1095a: {
        f1095as: [{
          ...policy,
          shared_policy_periods: [periods[0], {
            ...periods[1],
            agreement_review: changedSecondReview,
          }],
        }],
      },
    };
    await assertRejects(
      () => buildMefBundle(drift, { filer: fixture.filer, attachments: [] }),
      Error,
      "distinct source agreements",
    );
    await assertRejects(
      () => buildPdfBytes(drift, fixture.filer, ".pdf-cache", bundle),
      Error,
      "distinct source agreements",
    );
  }
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        schedule3: {
          ...pending.schedule3,
          line9_premium_tax_credit: 2_399,
        },
      }, { filer: fixture.filer, attachments: [] }),
    Error,
    "differs from finalized return",
  );
});

Deno.test("the same two Situation 4 agreement periods reconcile excess APTC to Schedule 2 and Form 1040", async () => {
  const originalW2 = (fixture.inputs.w2 as Record<string, unknown>[])[0];
  const originalPolicy =
    (fixture.inputs.f1095a as Record<string, unknown>[])[0];
  const income = 45_180;
  const inputs = {
    ...fixture.inputs,
    w2: [{
      ...originalW2,
      box1_wages: income,
      box3_ss_wages: income,
      box4_ss_withheld: income * 0.062,
      box5_medicare_wages: income,
      box6_medicare_withheld: income * 0.0145,
    }],
    f1095a: [{
      ...originalPolicy,
      monthly_aptcs: Array(12).fill(1_200),
      annual_aptc: 14_400,
    }],
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const repayment = result.pending.form8962.excess_advance_premium;
  assertEquals(typeof repayment === "number" && repayment > 0, true);
  assertEquals(
    result.pending.schedule2.line1a_excess_advance_premium,
    repayment,
  );
  assertEquals(result.pending.f1040.line17_additional_taxes, repayment);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<SharedPolicyAllocationGrp>/g) ?? []).length,
    2,
  );
  assertStringIncludes(
    bundle.xml,
    `<PremiumTaxCreditTaxLiabAmt>${repayment}</PremiumTaxCreditTaxLiabAmt>`,
  );
  const pdf = await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);
});
