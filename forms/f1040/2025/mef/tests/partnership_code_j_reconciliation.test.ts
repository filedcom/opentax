import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { buildMefXml } from "../builder.ts";
import { buildPending } from "../execution/pending.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-two-partnership-code-j-recoveries"
)!;

function prepared() {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    {
      taxYear: 2025,
      formType: "f1040",
    },
  );
  assertEquals(result.diagnostics, []);
  return buildPending(result.pending);
}

Deno.test("partnership code J export rejects a changed recovery source", async () => {
  const pending = prepared();
  const source = pending.k1_partnership as {
    k1_partnerships: Array<Record<string, unknown>>;
  };
  source.k1_partnerships[0] = {
    ...source.k1_partnerships[0],
    partnership_ein: "111111111",
  };
  assertThrows(
    () => buildMefXml(pending, fixture.filer),
    Error,
    "do not match the issued K-1 facts",
  );
  await assertRejects(
    () => buildPdfBytes(pending, fixture.filer),
    Error,
    "do not match the issued K-1 facts",
  );
});

Deno.test("partnership code J export rejects another recipient", async () => {
  const pending = prepared();
  const source = pending.k1_partnership as {
    k1_partnerships: Array<Record<string, unknown>>;
  };
  const row = source.k1_partnerships[0].box11_code_j_recovery as Record<
    string,
    unknown
  >;
  source.k1_partnerships[0] = {
    ...source.k1_partnerships[0],
    box11_code_j_recovery: { ...row, recipient_tin: "999999999" },
  };
  assertThrows(
    () => buildMefXml(pending, fixture.filer),
    Error,
    "recipient is not the filer",
  );
  await assertRejects(
    () => buildPdfBytes(pending, fixture.filer),
    Error,
    "recipient is not the filer",
  );
});
