import { assertEquals, assertThrows } from "@std/assert";
import { form461, inputSchema } from "./index.ts";

const review = {
  only_schedule_c_and_f_business_items: true,
  other_part_i_lines_zero: true,
  part_ii_adjustments_zero: true,
  post_at_risk_and_passive_limits_confirmed: true,
  source_document_refs: ["reviewed Schedule 1 and Form 1040 workpapers"],
} as const;

function compute(input: Record<string, unknown>) {
  return form461.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

function fields(result: ReturnType<typeof compute>) {
  return result.outputs.find((item) => item.nodeType === "form461")?.fields;
}

Deno.test("Form 461 combines signed C and F losses before one single threshold", () => {
  const result = compute({
    filing_status: "single",
    line2_schedule_c: -200_000,
    line6_schedule_f: -200_000,
    scope_review: review,
  });
  assertEquals(fields(result)?.line9_total_income_loss, -400_000);
  assertEquals(fields(result)?.line15_threshold, 313_000);
  assertEquals(fields(result)?.line16_excess_business_loss, -87_000);
  assertEquals(
    result.outputs.find((item) => item.nodeType === "schedule1")?.fields
      .line8p_excess_business_loss,
    87_000,
  );
  assertEquals(result.carryforwards?.excess_business_loss_nol_origin, 87_000);
});

Deno.test("Form 461 offsets a C loss with F profit before the threshold", () => {
  const result = compute({
    filing_status: "single",
    line2_schedule_c: -400_000,
    line6_schedule_f: 300_000,
    scope_review: review,
  });
  // A line 2 loss above $156,500 still requires a filed Form 461.
  assertEquals(fields(result)?.line9_total_income_loss, -100_000);
  assertEquals(fields(result)?.line16_excess_business_loss, 213_000);
  assertEquals(
    result.outputs.some((item) => item.nodeType === "schedule1"),
    false,
  );
});

Deno.test("Form 461 MFJ uses one $626,000 threshold, not one per source", () => {
  const result = compute({
    filing_status: "mfj",
    line2_schedule_c: -400_000,
    line6_schedule_f: -300_000,
    scope_review: review,
  });
  assertEquals(fields(result)?.line15_threshold, 626_000);
  assertEquals(fields(result)?.line16_excess_business_loss, -74_000);
});

Deno.test("Form 461 per-line $156,500 trigger applies to MFJ without an addback", () => {
  const result = compute({
    filing_status: "mfj",
    line2_schedule_c: -156_501,
    line6_schedule_f: 156_501,
    scope_review: review,
  });
  assertEquals(fields(result)?.line9_total_income_loss, 0);
  assertEquals(fields(result)?.line16_excess_business_loss, 626_000);
});

Deno.test("Form 461 omits the form at the exact per-line and net thresholds", () => {
  assertEquals(
    fields(compute({
      filing_status: "single",
      line2_schedule_c: -156_500,
      line6_schedule_f: 0,
      scope_review: review,
    })),
    undefined,
  );
});

Deno.test("Form 461 rejects C/F source data without a sourced scope review", () => {
  assertThrows(() =>
    compute({
      filing_status: "single",
      line2_schedule_c: -400_000,
    })
  );
  assertThrows(() =>
    compute({
      filing_status: "single",
      line2_schedule_c: -400_000,
      scope_review: { ...review, source_document_refs: [] },
    })
  );
});

Deno.test("Form 461 rejects old precomputed excess input and missing status", () => {
  assertThrows(() => compute({ excess_business_loss: 87_000 }));
  assertThrows(() =>
    compute({ line2_schedule_c: -400_000, scope_review: review })
  );
});

Deno.test("Form 461 rejects unresolved passive losses before filing", () => {
  assertThrows(() =>
    compute({
      filing_status: "single",
      line2_schedule_c: -400_000,
      passive_loss_unresolved: true,
      scope_review: review,
    })
  );
});
