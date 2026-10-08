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
import { pdfReviewFixtures } from "../../review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-situation4-nonenrolled-other-taxpayer"
)!;

Deno.test("Situation 4 binds a nonenrolled other taxpayer's covered dependent through Form 8962, Schedule 3, Form 1040, MeF, and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962.total_premium_tax_credit, 4_800);
  assertEquals(result.pending.form8962.total_advance_ptc, 1_920);
  assertEquals(result.pending.form8962.net_premium_tax_credit, 2_880);
  assertEquals(result.pending.schedule3.line9_premium_tax_credit, 2_880);
  assertEquals(result.pending.f1040.line31_additional_payments, 2_880);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertStringIncludes(bundle.xml, "<SSN>222334444</SSN>");
  assertStringIncludes(
    bundle.xml,
    "<MonthlyPremiumPct>0.80</MonthlyPremiumPct>",
  );
  assertStringIncludes(
    bundle.xml,
    "<MonthlyPremiumSLCSPPct>0.80</MonthlyPremiumSLCSPPct>",
  );
  assertStringIncludes(
    bundle.xml,
    "<MonthlyAdvancedPTCPct>0.80</MonthlyAdvancedPTCPct>",
  );
  assertStringIncludes(
    bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>2880</ReconciledPremiumTaxCreditAmt>",
  );
  const projected = form8962Pdf.projectFields?.(pending.form8962!, {
    general: pending.general!,
    f1095a: pending.f1095a!,
    f1040: pending.f1040!,
    schedule3: pending.schedule3!,
  }) ??
    {};
  assertEquals(
    (projected as Record<string, unknown>).pdf_allocation_1_other_taxpayer_ssn,
    "222334444",
  );
  const pdf = await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  const policy = pending.f1095a!.f1095as[0];
  const period = (policy.shared_policy_periods as Record<string, unknown>[])[0];
  const review = period.other_family_claim_review as Record<string, unknown>;
  for (
    const tampered of [
      { ...review, covered_individual_ssn: "999887777" },
      { ...review, other_taxpayer_ssn: "999887777" },
      { ...review, filer_allocation_pct: 0.7 },
      { ...review, policy_number: "WRONG-POLICY" },
    ]
  ) {
    // Each changed source below intentionally violates the validated policy.
    const drift = {
      ...pending,
      f1095a: {
        f1095as: [{
          ...policy,
          shared_policy_periods: [{
            ...period,
            other_family_claim_review: tampered,
          }],
        }],
      },
    } as MefFormsPending;
    await assertRejects(
      () => buildMefBundle(drift, { filer: fixture.filer, attachments: [] }),
      Error,
      "covered family member",
    );
    await assertRejects(
      () => buildPdfBytes(drift, fixture.filer, ".pdf-cache", bundle),
      Error,
      "PDF source differs from the prepared MeF return",
    );
  }
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f1095a: { f1095as: [{ ...policy, recipient_ssn: "999887777" }] },
      } as MefFormsPending, { filer: fixture.filer, attachments: [] }),
    Error,
    "covered family member",
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f1095a: {
          f1095as: [{
            ...policy,
            shared_policy_periods: [{
              ...period,
              other_family_claim_review: undefined,
            }],
          }],
        },
      } as MefFormsPending, { filer: fixture.filer, attachments: [] }),
    Error,
    "covered family member",
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        schedule3: {
          ...pending.schedule3,
          line9_premium_tax_credit: 2_879,
        },
      }, { filer: fixture.filer, attachments: [] }),
    Error,
    "Schedule 3 line 15 must equal lines 9 through 14",
  );
});
