import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { buildMefXml } from "../builder.ts";
import { buildPending } from "../execution/pending.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-partnership-code-l-r-ordinary"
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

Deno.test("partnership L/R export rejects changed K-1 source", async () => {
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

Deno.test("partnership L/R export rejects changed ordinary amount", async () => {
  const pending = prepared();
  const source = pending.k1_partnership as {
    k1_partnerships: Array<Record<string, unknown>>;
  };
  const row = (source.k1_partnerships[0].box11_line10_ordinary as Array<
    Record<string, unknown>
  >)[0];
  source.k1_partnerships[0] = {
    ...source.k1_partnerships[0],
    box11_line10_ordinary: [{ ...row, gain_loss: 401 }],
  };
  await rejectsBoth(pending, "do not match the issued K-1 facts");
});

Deno.test("partnership L/R export rejects another recipient", async () => {
  const pending = prepared();
  const source = pending.k1_partnership as {
    k1_partnerships: Array<Record<string, unknown>>;
  };
  const row = (source.k1_partnerships[0].box11_line10_ordinary as Array<
    Record<string, unknown>
  >)[0];
  source.k1_partnerships[0] = {
    ...source.k1_partnerships[0],
    box11_line10_ordinary: [{ ...row, recipient_tin: "999999999" }],
  };
  await rejectsBoth(pending, "recipient is not the filer");
});

Deno.test("partnership L/R export rejects a changed Form 4797 row", async () => {
  const pending = prepared();
  const source = pending.form4797 as unknown as {
    k1_box11_line10_rows: Array<Record<string, unknown>>;
  };
  source.k1_box11_line10_rows[0] = {
    ...source.k1_box11_line10_rows[0],
    gain_loss: 401,
  };
  await rejectsBoth(pending, "do not match the issued K-1 facts");
});

Deno.test("partnership L/R export rejects a changed Schedule 1 line 4", async () => {
  const pending = prepared();
  (pending.schedule1 as Record<string, unknown>).line4_other_gains = 1_001;
  await rejectsBoth(
    pending,
    "does not match the sole Form 4797 partnership source",
  );
});
