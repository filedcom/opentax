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
  item.id === "single-five-sequential-corrected-slcsp-policies"
)!;

Deno.test("five independently corrected sequential policies reconcile through Form 1040, MeF, and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962.total_premium_tax_credit, 1_054);
  assertEquals(result.pending.form8962.total_advance_ptc, 2_400);
  assertEquals(result.pending.form8962.excess_advance_premium, 1_346);
  assertEquals(result.pending.schedule2.line1a_excess_advance_premium, 1_346);
  assertEquals(result.pending.f1040.line17_additional_taxes, 1_346);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
    12,
  );
  assertEquals(
    (bundle.xml.match(
      /<MonthlyPremiumSLCSPAmt>650<\/MonthlyPremiumSLCSPAmt>/g,
    ) ?? [])
      .length,
    5,
  );
  assertStringIncludes(
    bundle.xml,
    "<PremiumTaxCreditTaxLiabAmt>1346</PremiumTaxCreditTaxLiabAmt>",
  );
  const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
    {};
  assertEquals(
    form8962Pdf.instances?.(projected, fixture.filer, pending)?.length,
    1,
  );
  const pdf = await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  const policies = pending.f1095a?.f1095as as Record<string, unknown>[];
  const fifth = policies[4];
  const correction = (fifth.slcsp_corrections as Record<string, unknown>[])[0];
  for (
    const tamperedCorrection of [
      { ...correction, determination_record_sha256: undefined },
      { ...correction, month: 8 },
    ]
  ) {
    const drift = {
      ...pending,
      f1095a: {
        f1095as: [...policies.slice(0, 4), {
          ...fifth,
          slcsp_corrections: [tamperedCorrection],
        }],
      },
    };
    await assertRejects(
      () => buildMefBundle(drift, { filer: fixture.filer, attachments: [] }),
      Error,
    );
    await assertRejects(
      () => buildPdfBytes(drift, fixture.filer, ".pdf-cache", bundle),
      Error,
    );
  }
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f1040: { ...pending.f1040, line17_additional_taxes: 1_345 },
      }, { filer: fixture.filer, attachments: [] }),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
});
