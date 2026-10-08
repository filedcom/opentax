import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { buildMefXml } from "../builder.ts";
import { buildPending } from "../execution/pending.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-two-partnership-code-s-capital"
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

Deno.test("partnership code S export rejects changed K-1 identity", async () => {
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

Deno.test("partnership code S export rejects changed capital character", async () => {
  const pending = prepared();
  const source = pending.k1_partnership as {
    k1_partnerships: Array<Record<string, unknown>>;
  };
  const row = source.k1_partnerships[0]
    .box11_code_s_nonportfolio_capital as Record<
      string,
      unknown
    >;
  source.k1_partnerships[0] = {
    ...source.k1_partnerships[0],
    box11_code_s_nonportfolio_capital: {
      ...row,
      short_term_gain_loss: 0,
      long_term_gain_loss: 400,
    },
  };
  await rejectsBoth(pending, "do not match the issued K-1 facts");
});

Deno.test("partnership code S export rejects another recipient", async () => {
  const pending = prepared();
  const source = pending.k1_partnership as {
    k1_partnerships: Array<Record<string, unknown>>;
  };
  const row = source.k1_partnerships[0]
    .box11_code_s_nonportfolio_capital as Record<
      string,
      unknown
    >;
  source.k1_partnerships[0] = {
    ...source.k1_partnerships[0],
    box11_code_s_nonportfolio_capital: { ...row, recipient_tin: "999999999" },
  };
  await rejectsBoth(pending, "recipient is not the filer");
});

Deno.test("partnership code S export rejects changed partnership subtotal", async () => {
  const pending = prepared();
  (pending.schedule_d as Record<string, unknown>)
    .k1_partnership_line5_source_total = 401;
  await rejectsBoth(pending, "do not match its K-1 sources");
});

Deno.test("partnership code S export rejects changed filed line 5", async () => {
  const pending = prepared();
  (pending.schedule_d as Record<string, unknown>).line_5_k1_st = 401;
  await rejectsBoth(pending, "do not match the sole partnership K-1 source");
});
