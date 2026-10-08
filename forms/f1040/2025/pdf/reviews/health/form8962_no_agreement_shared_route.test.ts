import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import type { MefFormsPending } from "../../../mef/types.ts";
import { buildPdfBytes } from "../../builder.ts";
import { form8962Pdf } from "../../forms/health/f8962.ts";
import type { Fields as Form8962Fields } from "../../../mef/forms/health/f8962/f8962.ts";
import { pdfReviewFixtures } from "../../review-fixtures.ts";

const agreed = pdfReviewFixtures.find((item) =>
  item.id === "single-situation4-nonenrolled-other-taxpayer"
)!;
const policy = (agreed.inputs.f1095a as Record<string, unknown>[])[0];
const reviewedPeriod = {
  basis: "other_no_agreement" as const,
  situations_1_to_3_reviewed_and_inapplicable: true as const,
  other_taxpayer_ssn: "222334444",
  start_month: 1,
  end_month: 12,
  allocated_enrollees_in_tax_family: 1,
  total_enrollees: 2,
  nonagreement_review: {
    tax_year: 2025 as const,
    policy_number: "TX-JOE-JANE-SHARED",
    filer_ssn: "111223333",
    other_taxpayer_ssn: "222334444",
    other_taxpayer_claimed_covered_ssn: "333445555",
    marketplace_enrollment_reference: "2025 TX Marketplace Joe/Jane enrollment",
    tax_family_review_reference: "2025 Alice/Jane family-claim review",
    tax_family_review_sha256: "a".repeat(64),
    no_agreement_review_reference: "2025 Joe/Alice no-agreement review",
    no_agreement_review_sha256: "b".repeat(64),
    filer_enrolled_count: 1,
    policy_enrolled_count: 2,
  },
};
const inputs = {
  ...agreed.inputs,
  f1095a: [{ ...policy, shared_policy_periods: [reviewedPeriod] }],
};

Deno.test("Situation 4 no-agreement enrollee ratio reaches final return, native, and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const monthlyRows = (result.pending.form8962 as Form8962Fields)
    .monthly_ptc_rows;
  assertEquals(monthlyRows?.[0].premium, 250);
  assertEquals(monthlyRows?.[0].slcsp, 300);
  assertEquals(monthlyRows?.[0].aptc, 100);
  assertEquals(result.pending.form8962.net_premium_tax_credit, 1_800);
  assertEquals(result.pending.schedule3.line9_premium_tax_credit, 1_800);
  assertEquals(result.pending.f1040.line31_additional_payments, 1_800);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: agreed.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<MonthlyPremiumPct>0.50</MonthlyPremiumPct>",
  );
  assertStringIncludes(
    bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>1800</ReconciledPremiumTaxCreditAmt>",
  );
  const projected = form8962Pdf.projectFields?.(
    pending.form8962!,
    pending as unknown as Record<string, Record<string, unknown>>,
  ) ??
    {};
  assertEquals(
    (projected as Record<string, unknown>).pdf_allocation_1_premium_pct,
    "0.50",
  );
  const pdf = await buildPdfBytes(pending, agreed.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  const sourcePolicy = pending.f1095a!.f1095as[0];
  const period =
    (sourcePolicy.shared_policy_periods as Record<string, unknown>[])[0];
  const review = period.nonagreement_review as Record<string, unknown>;
  for (
    const changed of [
      { ...review, other_taxpayer_claimed_covered_ssn: "999887777" },
      { ...review, other_taxpayer_ssn: "999887777" },
      { ...review, filer_enrolled_count: 2 },
      { ...review, no_agreement_review_sha256: "a".repeat(64) },
    ]
  ) {
    const drift = {
      ...pending,
      f1095a: {
        f1095as: [{
          ...sourcePolicy,
          shared_policy_periods: [{ ...period, nonagreement_review: changed }],
        }],
      },
    } as MefFormsPending;
    await assertRejects(
      () => buildMefBundle(drift, { filer: agreed.filer, attachments: [] }),
      Error,
    );
    await assertRejects(
      () => buildPdfBytes(drift, agreed.filer, ".pdf-cache", bundle),
      Error,
    );
  }
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        schedule3: { ...pending.schedule3, line9_premium_tax_credit: 1_799 },
      }, { filer: agreed.filer, attachments: [] }),
    Error,
  );
});
