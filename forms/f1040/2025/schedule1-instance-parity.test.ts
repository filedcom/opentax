import { assertEquals, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

Deno.test("zero-only computed Schedule 1 is absent from both prepared outputs", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-w2-refund"
  )!;
  const result = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.schedule1, {
    line10_total_additional_income: 0,
    line26_total_adjustments: 0,
  });
  const xml = f1040_2025.buildMefXml(pending, fixture.filer);
  assertEquals(xml.includes("<IRS1040Schedule1 "), false);
  const origins: PdfPageOrigin[] = [];
  await buildPdfBytes(pending, fixture.filer, ".pdf-cache", undefined, origins);
  assertEquals(origins.some((page) => page.formKey === "schedule1"), false);
});

Deno.test("fully repaid unemployment keeps its zero source line and PDF page", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-fully-repaid-unemployment"
  )!;
  const result = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const xml = f1040_2025.buildMefXml(pending, fixture.filer);
  assertStringIncludes(xml, "<UnemploymentCompAmt>0</UnemploymentCompAmt>");
  const origins: PdfPageOrigin[] = [];
  await buildPdfBytes(pending, fixture.filer, ".pdf-cache", undefined, origins);
  assertEquals(
    origins.filter((page) => page.formKey === "schedule1").length,
    2,
  );
});
