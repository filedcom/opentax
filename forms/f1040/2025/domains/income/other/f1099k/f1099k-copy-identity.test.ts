import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { buildMefXml } from "../../../../mef/builder.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { registry } from "../../../../registry.ts";

Deno.test("1099-K reviewed owner and TIN owner cannot repeat one processor account in native or PDF export", async () => {
  const fixture = pdfReviewFixtures.find((row) =>
    row.id === "single-k-blank-tin-withholding"
  );
  if (!fixture) throw new Error("Missing retained 1099-K fixture");
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  if (!pending.f1099k) throw new Error("Missing retained 1099-K source");
  const issued = pending.f1099k.f1099ks[0];
  const changed = {
    ...pending,
    f1099k: {
      f1099ks: [{
        ...issued,
        account_number: "merchant-1",
        source_document_reference: "original-copy",
      }, {
        ...issued,
        recipient_tin: "111223333",
        recipient_identity_review: undefined,
        account_number: "merchant-1",
        source_document_reference: "corrected-copy",
      }],
    },
  };
  const message = "repeats the same identified payer, recipient, and account";
  assertThrows(() => buildMefXml(changed, fixture.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(changed, fixture.filer),
    Error,
    message,
  );
});
