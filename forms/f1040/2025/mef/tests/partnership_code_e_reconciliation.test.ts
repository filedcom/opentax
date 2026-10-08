import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { buildMefXml } from "../builder.ts";
import { buildPending } from "../execution/pending.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-two-partnership-code-e-cod"
)!;

function prepared() {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  return buildPending(result.pending);
}

async function rejectsBoth(
  pending: ReturnType<typeof prepared>,
  message: string,
) {
  assertThrows(() => buildMefXml(pending, fixture.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(pending, fixture.filer),
    Error,
    message,
  );
}

Deno.test("partnership code E export rejects a changed debt source", async () => {
  const pending = prepared();
  const source = pending.k1_partnership as {
    k1_partnerships: Array<Record<string, unknown>>;
  };
  source.k1_partnerships[0] = {
    ...source.k1_partnerships[0],
    partnership_ein: "111111111",
  };
  await rejectsBoth(pending, "do not match the issued K-1 facts");
});

Deno.test("partnership code E export rejects another recipient", async () => {
  const pending = prepared();
  const source = pending.k1_partnership as {
    k1_partnerships: Array<Record<string, unknown>>;
  };
  const row = source.k1_partnerships[0].box11_code_e_cod as Record<
    string,
    unknown
  >;
  source.k1_partnerships[0] = {
    ...source.k1_partnerships[0],
    box11_code_e_cod: { ...row, recipient_tin: "999999999" },
  };
  await rejectsBoth(pending, "recipient is not the filer");
});

Deno.test("partnership code E export rejects mixed Form 1099-C", async () => {
  const pending = prepared();
  (pending as Record<string, unknown>).f1099c = { f1099cs: [{}] };
  await rejectsBoth(pending, "debt-level duplicate reconciliation");
});

Deno.test("partnership code E export rejects changed line 8c", async () => {
  const pending = prepared();
  (pending.schedule1 as Record<string, unknown>).line8c_cod_income = 1_001;
  await rejectsBoth(pending, "does not match its partnership code E sources");
});
