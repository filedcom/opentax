import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { form8862 as nativeForm8862 } from "../../../mef/forms/credits/f8862.ts";
import { form8862Pdf } from "../../forms/credits/f8862.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { pdfReviewFixtures } from "../../review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-8862-ctc-reinstatement"
)!;

Deno.test("reviewed CTC credit calculates, but notice assertions cannot authorize export", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line19_child_tax_credit, 2_200);
  const pending = buildPending(result.pending);
  assertThrows(
    () => nativeForm8862.build(pending.f8862!, { pending }),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
  assertThrows(
    () =>
      form8862Pdf.instances?.(pending.f8862!, fixture.filer, {
        f1040: pending.f1040!,
        general: pending.general!,
        f8812: pending.f8812!,
      }),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
  await assertRejects(
    () => buildMefBundle(pending, { filer: fixture.filer, attachments: [] }),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
});
