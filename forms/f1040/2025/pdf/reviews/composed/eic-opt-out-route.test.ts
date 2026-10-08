import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../builder.ts";
import { pdfReviewFixtures } from "../../review-fixtures.ts";

Deno.test("retained EIC opt-out reaches final Form 1040, native XML, and filled PDF", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-w2-eic-opt-out"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.do_not_claim_eic, true);
  assertEquals(result.pending.eitc.credit_amount, 0);
  assertEquals(result.pending.f1040.line27_eitc ?? 0, 0);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertStringIncludes(bundle.xml, "<DoNotClaimEICInd>X</DoNotClaimEICInd>");
  assertEquals(bundle.xml.includes("<EarnedIncomeCreditAmt>"), false);
  const bytes = await buildPdfBytes(
    bundle.pending,
    fixture.filer,
    ".pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 2);
});
