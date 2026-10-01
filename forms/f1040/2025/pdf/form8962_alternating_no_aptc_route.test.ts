import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { form8962Pdf } from "./forms/f8962.ts";
import type { MefFormsPending } from "../mef/types.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-alternating-three-no-aptc-policies-200-fpl"
)!;

const pdfContext = (pending: MefFormsPending) =>
  pending as unknown as Record<string, Record<string, unknown>>;

function calculate(inputs: Record<string, unknown>) {
  const result = execute(buildExecutionPlan(registry), registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  return buildPending(result.pending);
}

Deno.test("three no-APTC policies alternate A-B-A-C through Form 1040, MeF and PDF projection", async () => {
  const pending = calculate(fixture.inputs);
  assertEquals(pending.form8962?.total_premium_tax_credit, 7_800);
  assertEquals(pending.schedule3?.line9_premium_tax_credit, 7_800);
  assertEquals(pending.f1040?.line31_additional_payments, 7_800);
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
    "<ReconciledPremiumTaxCreditAmt>7800</ReconciledPremiumTaxCreditAmt>",
  );
  const fields =
    form8962Pdf.projectFields?.(pending.form8962!, pdfContext(pending)) ?? {};
  assertEquals(fields.pdf_month_7_slcsp, "600");
  assertEquals(fields.pdf_month_6_slcsp, "700");
  assertEquals(fields.pdf_month_9_slcsp, "800");
  assertEquals(
    form8962Pdf.instances?.(fields, fixture.filer, pdfContext(pending))?.length,
    1,
  );

  const missingPayment = structuredClone(pending);
  const policies = (missingPayment.f1095a as {
    f1095as: Array<{ no_aptc_monthly_evidence: Array<{ month: number }> }>;
  }).f1095as;
  policies[0].no_aptc_monthly_evidence = policies[0].no_aptc_monthly_evidence
    .filter((proof) => proof.month !== 7);
  await assertRejects(() =>
    buildMefBundle(missingPayment, {
      filer: fixture.filer,
      attachments: [],
    }), Error);
  assertThrows(() =>
    form8962Pdf.instances?.(fields, fixture.filer, pdfContext(missingPayment))
  );

  const wrongOwner = structuredClone(pending);
  (wrongOwner.f1095a as {
    f1095as: Array<{ covered_individual_ssns: string[] }>;
  }).f1095as[0].covered_individual_ssns = ["999887777"];
  await assertRejects(() =>
    buildMefBundle(wrongOwner, {
      filer: fixture.filer,
      attachments: [],
    }), Error);
});

Deno.test("protected partial payment on a returning policy month reduces only that month's credit", async () => {
  const inputs = structuredClone(fixture.inputs);
  const policies = inputs.f1095a as Array<{
    no_aptc_monthly_evidence: Array<{
      month: number;
      premium_payment: Record<string, unknown>;
    }>;
  }>;
  const july = policies[0].no_aptc_monthly_evidence.find((item) =>
    item.month === 7
  )!;
  july.premium_payment = {
    status: "protected_partial",
    amount: 400.51,
    paid_on: "2026-03-01",
    reference: "TX-NO-APTC-A-PAID-7",
    record_sha256: "8".repeat(64),
    protection_basis: "premium_payment_threshold",
    minimum_payment_to_avoid_termination: 350.25,
    issuer_coverage_provided: true,
    issuer_confirmation_reference: "TX-NO-APTC-A-PROTECTED-7",
    issuer_confirmation_sha256: "7".repeat(64),
  };
  const pending = calculate(inputs);
  assertEquals(pending.form8962?.monthly_ptc_rows?.[6].premium, 401);
  assertEquals(pending.form8962?.total_premium_tax_credit, 7_601);
  assertEquals(pending.schedule3?.line9_premium_tax_credit, 7_601);
  assertEquals(pending.f1040?.line31_additional_payments, 7_601);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>7601</ReconciledPremiumTaxCreditAmt>",
  );
  const fields =
    form8962Pdf.projectFields?.(pending.form8962!, pdfContext(pending)) ?? {};
  assertEquals(fields.pdf_month_7_premium, "401");
  assertEquals(
    form8962Pdf.instances?.(fields, fixture.filer, pdfContext(pending))?.length,
    1,
  );

  const belowThreshold = structuredClone(pending);
  const julyProof = (belowThreshold.f1095a as {
    f1095as: Array<{
      no_aptc_monthly_evidence: Array<{
        month: number;
        premium_payment: { amount: number };
      }>;
    }>;
  }).f1095as[0].no_aptc_monthly_evidence.find((item) => item.month === 7)!;
  julyProof.premium_payment.amount = 300;
  await assertRejects(() =>
    buildMefBundle(belowThreshold, {
      filer: fixture.filer,
      attachments: [],
    }), Error);
  assertThrows(() =>
    form8962Pdf.instances?.(fields, fixture.filer, pdfContext(belowThreshold))
  );
});
