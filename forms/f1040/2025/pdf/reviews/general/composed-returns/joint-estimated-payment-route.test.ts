import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../registry.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../builder.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";

Deno.test("agreed 2025 joint estimated payment reaches final return, native SSN, and filled PDF", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-divorced-agreed-joint-estimated-payment"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line26_estimated_tax, 300);
  const bundle = await buildMefBundle(buildPending(result.pending), {
    filer: fixture.filer,
    attachments: [],
  });
  assertStringIncludes(bundle.xml, 'divorcedSpouseSSN="222334444"');
  const bytes = await buildPdfBytes(
    bundle.pending,
    fixture.filer,
    ".pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 2);
});
