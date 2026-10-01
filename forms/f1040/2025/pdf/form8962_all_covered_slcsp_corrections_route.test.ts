import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-alternating-policies-all-covered-slcsp-corrections"
)!;
const bothPoliciesFixture = pdfReviewFixtures.find((item) =>
  item.id === "single-alternating-policies-both-slcsp-corrected"
)!;

Deno.test("all covered middle-policy SLCSP months reconcile through Form 8962, Schedule 2, Form 1040, MeF, and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962.total_premium_tax_credit, 1_304);
  assertEquals(result.pending.form8962.excess_advance_premium, 1_096);
  assertEquals(result.pending.schedule2.line1a_excess_advance_premium, 1_096);
  assertEquals(result.pending.f1040.line17_additional_taxes, 1_096);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<MonthlyPremiumSLCSPAmt>650</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<MonthlyPremiumSLCSPAmt>700</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<MonthlyPremiumSLCSPAmt>750</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<MonthlyPremiumSLCSPAmt>800</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<PremiumTaxCreditTaxLiabAmt>1096</PremiumTaxCreditTaxLiabAmt>",
  );
  const pdf = await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);
});

Deno.test("independent SLCSP corrections on both alternating policies reconcile through the full return, MeF, and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    bothPoliciesFixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962.total_premium_tax_credit, 1_354);
  assertEquals(result.pending.form8962.excess_advance_premium, 1_046);
  assertEquals(result.pending.schedule2.line1a_excess_advance_premium, 1_046);
  assertEquals(result.pending.f1040.line17_additional_taxes, 1_046);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: bothPoliciesFixture.filer,
    attachments: [],
  });
  for (const slcsp of [650, 700, 750, 800]) {
    assertStringIncludes(
      bundle.xml,
      `<MonthlyPremiumSLCSPAmt>${slcsp}</MonthlyPremiumSLCSPAmt>`,
    );
  }
  assertEquals(
    (bundle.xml.match(
      /<MonthlyPremiumSLCSPAmt>650<\/MonthlyPremiumSLCSPAmt>/g,
    ) ?? []).length,
    2,
  );
  assertStringIncludes(
    bundle.xml,
    "<PremiumTaxCreditTaxLiabAmt>1046</PremiumTaxCreditTaxLiabAmt>",
  );
  const pdf = await buildPdfBytes(
    pending,
    bothPoliciesFixture.filer,
    ".pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);
});
