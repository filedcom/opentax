// NOTE FOR IMPLEMENTORS:
// This is a black-box test file generated from context.md only.
// Before running, verify:
//   1. The import name matches the exported singleton (`ext`)
//   2. The input wrapper key matches compute()'s parameter (single object, not array)
//   3. The nodeType strings match the actual node routing strings
//   4. Any AMBIGUITIES flagged below must be resolved against the implementation
// These tests define the IRS-correct behaviour — if a test fails, fix the
// implementation, not the test.
//
// AMBIGUITIES:
//   A. The exact nodeType string for downstream routing is unspecified in context.md.
//      Context shows line_7_amount_paying flows to "Schedule 3 Line 10". Assumed
//      nodeType is "schedule3" and field is "line10_amount_paid_extension".
//      Verify against actual outputNodes declaration.
//   B. Whether produce_4868 is required at the schema level or merely a "master switch"
//      in compute() logic. Context says "yes (when filing 4868)" — treated as optional
//      boolean with default false/absent = no outputs.
//   C. Whether line_6_balance_due is exposed in outputs (context says "display-only
//      computed field"). Tests assume it is NOT in tax outputs; it may be in a metadata
//      or display section.
//   D. Whether the 90% safe-harbor check emits a warning output or is purely advisory.
//      Context marks it WARNING-only. Tests verify it does NOT throw.

import { assertEquals, assertThrows } from "@std/assert";
import { ext } from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compute(input: Record<string, unknown>) {
  // deno-lint-ignore no-explicit-any
  return ext.compute(input as any);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function outputCount(result: ReturnType<typeof compute>): number {
  return result.outputs.length;
}

// ---------------------------------------------------------------------------
// Section 1: Input Schema Validation
// ---------------------------------------------------------------------------

Deno.test("test_line_4_negative_throws — negative total tax estimate throws", () => {
  assertThrows(
    () =>
      compute({
        produce_4868: "X",
        line_4_total_tax: -1,
        line_5_total_payments: 0,
      }),
    Error,
  );
});

Deno.test("test_line_5_negative_throws — negative total payments throws", () => {
  assertThrows(
    () =>
      compute({
        produce_4868: "X",
        line_4_total_tax: 10000,
        line_5_total_payments: -1,
      }),
    Error,
  );
});

Deno.test("test_line_7_negative_throws — negative amount paying throws", () => {
  assertThrows(
    () =>
      compute({
        produce_4868: "X",
        line_4_total_tax: 10000,
        line_5_total_payments: 8000,
        line_7_amount_paying: -100,
      }),
    Error,
  );
});

Deno.test("test_valid_minimal_input_does_not_throw — all required fields at zero", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 0,
    line_5_total_payments: 0,
  });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("test_line_4_zero_is_valid — zero total tax does not throw", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 0,
    line_5_total_payments: 0,
    line_7_amount_paying: 0,
  });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("test_line_7_zero_is_valid — zero amount paying does not throw", () => {
  // No minimum payment required; taxpayer can pay $0 and still get extension
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 5000,
    line_5_total_payments: 3000,
    line_7_amount_paying: 0,
  });
  assertEquals(Array.isArray(result.outputs), true);
});

// ---------------------------------------------------------------------------
// Section 2: Per-field routing
// ---------------------------------------------------------------------------

Deno.test("test_line_7_positive_routes_to_schedule3 — amount_paying > 0 routes to schedule3 line10", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
    line_7_amount_paying: 1500,
  });

  // AMBIGUITY A: nodeType assumed "schedule3", field assumed "line10_amount_paid_extension"
  const sch3 = findOutput(result, "schedule3");
  assertEquals(sch3 !== undefined, true);
  const input = sch3!.input as Record<string, unknown>;
  assertEquals(input.line10_amount_paid_extension, 1500);
});

Deno.test("test_line_7_zero_no_schedule3 — amount_paying = 0 does not emit schedule3", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
    line_7_amount_paying: 0,
  });

  const sch3 = findOutput(result, "schedule3");
  assertEquals(sch3, undefined);
});

Deno.test("test_line_7_absent_no_schedule3 — no amount_paying emits no schedule3", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
  });

  const sch3 = findOutput(result, "schedule3");
  assertEquals(sch3, undefined);
});

Deno.test("test_produce_4868_absent_no_outputs — without produce_4868, no outputs emitted", () => {
  // AMBIGUITY B: produce_4868 is master switch; absent = no outputs regardless of other fields
  const result = compute({
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
    line_7_amount_paying: 1500,
  });
  assertEquals(outputCount(result), 0);
});

Deno.test("test_produce_4868_blank_no_outputs — produce_4868 not 'X' emits no outputs", () => {
  const result = compute({
    produce_4868: "",
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
    line_7_amount_paying: 1500,
  });
  assertEquals(outputCount(result), 0);
});

// ---------------------------------------------------------------------------
// Section 3: Calculation Logic — Line 6 Balance Due
// ---------------------------------------------------------------------------

Deno.test("test_line_6_positive_when_line4_exceeds_line5 — balance due computed correctly", () => {
  // line_6 = MAX(0, 10000 - 7000) = 3000; test via line_7 routing (implementation detail)
  // The key IRS rule: balance exists → extension payment meaningful
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
    line_7_amount_paying: 3000,
  });
  // Extension payment of exactly the balance routes correctly
  const sch3 = findOutput(result, "schedule3");
  assertEquals(sch3 !== undefined, true);
  const input = sch3!.input as Record<string, unknown>;
  assertEquals(input.line10_amount_paid_extension, 3000);
});

Deno.test("test_line_6_zero_floor_when_payments_exceed_tax — no negative balance", () => {
  // line_5 > line_4 → line_6 = 0; refund expected; extension still valid
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 5000,
    line_5_total_payments: 8000,
  });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("test_line_7_can_exceed_line_6 — overpayment is valid and no cap enforced", () => {
  // IRS: taxpayer may pay any amount; paying more than balance is valid (creates refund)
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 5000,
    line_5_total_payments: 2000,
    line_7_amount_paying: 8000, // pays more than $3000 balance
  });
  const sch3 = findOutput(result, "schedule3");
  assertEquals(sch3 !== undefined, true);
  const input = sch3!.input as Record<string, unknown>;
  assertEquals(input.line10_amount_paid_extension, 8000);
});

// ---------------------------------------------------------------------------
// Section 4: Thresholds — 90% Safe Harbor (WARNING-only, must NOT throw)
// ---------------------------------------------------------------------------

Deno.test("test_safe_harbor_below_90pct_does_not_throw — payment < 90% of tax, no throw", () => {
  // 89% of $10,000 = $8,900; safe harbor NOT met → late-payment penalty risk
  // WARNING rule: does not throw; engine emits advisory only
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 8000,
    line_7_amount_paying: 900, // total paid = 8900 = 89% — below threshold
  });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("test_safe_harbor_at_exactly_90pct_does_not_throw — exactly 90% paid, no throw", () => {
  // 90% of $10,000 = $9,000; line5 + line7 = $9,000 exactly
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 8000,
    line_7_amount_paying: 1000, // total paid = 9000 = exactly 90%
  });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("test_safe_harbor_above_90pct_does_not_throw — payment > 90% of tax, no throw", () => {
  // 95% of $10,000 = $9,500; clearly above threshold
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 8000,
    line_7_amount_paying: 1500, // total paid = 9500 = 95%
  });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("test_safe_harbor_zero_tax_does_not_throw — zero total tax, zero payments", () => {
  // 90% of $0 = $0; zero payments meet the safe harbor trivially
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 0,
    line_5_total_payments: 0,
  });
  assertEquals(Array.isArray(result.outputs), true);
});

// ---------------------------------------------------------------------------
// Section 5: Informational Fields — must NOT produce tax outputs
// ---------------------------------------------------------------------------

Deno.test("test_extension_previously_filed_does_not_add_outputs — drake-only flag", () => {
  const baseline = outputCount(
    compute({
      produce_4868: "X",
      line_4_total_tax: 10000,
      line_5_total_payments: 7000,
      line_7_amount_paying: 500,
    }),
  );

  const withFlag = outputCount(
    compute({
      produce_4868: "X",
      line_4_total_tax: 10000,
      line_5_total_payments: 7000,
      line_7_amount_paying: 500,
      extension_previously_filed: true,
    }),
  );

  assertEquals(withFlag, baseline);
});

Deno.test("test_produce_1040v_does_not_add_outputs — drake print flag only", () => {
  const baseline = outputCount(
    compute({
      produce_4868: "X",
      line_4_total_tax: 10000,
      line_5_total_payments: 7000,
      line_7_amount_paying: 500,
    }),
  );

  const withFlag = outputCount(
    compute({
      produce_4868: "X",
      line_4_total_tax: 10000,
      line_5_total_payments: 7000,
      line_7_amount_paying: 500,
      produce_1040v: true,
    }),
  );

  assertEquals(withFlag, baseline);
});

Deno.test("test_amount_on_1040v_does_not_affect_schedule3 — override field is informational", () => {
  // amount_on_1040v only overrides the 1040-V voucher display; does NOT affect Form 4868 or schedule3
  const withOverride = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
    line_7_amount_paying: 500,
    amount_on_1040v: 999,
  });

  const sch3 = findOutput(withOverride, "schedule3");
  assertEquals(sch3 !== undefined, true);
  const input = sch3!.input as Record<string, unknown>;
  // schedule3 must use line_7_amount_paying (500), not amount_on_1040v (999)
  assertEquals(input.line10_amount_paid_extension, 500);
});

Deno.test("test_line_8_out_of_country_does_not_add_tax_outputs — boolean flag only", () => {
  const baseline = outputCount(
    compute({
      produce_4868: "X",
      line_4_total_tax: 10000,
      line_5_total_payments: 7000,
      line_7_amount_paying: 500,
    }),
  );

  const withFlag = outputCount(
    compute({
      produce_4868: "X",
      line_4_total_tax: 10000,
      line_5_total_payments: 7000,
      line_7_amount_paying: 500,
      line_8_out_of_country: true,
    }),
  );

  assertEquals(withFlag, baseline);
});

Deno.test("test_line_9_1040nr_no_wages_does_not_add_tax_outputs — informational flag", () => {
  const baseline = outputCount(
    compute({
      produce_4868: "X",
      line_4_total_tax: 10000,
      line_5_total_payments: 7000,
      line_7_amount_paying: 500,
    }),
  );

  const withFlag = outputCount(
    compute({
      produce_4868: "X",
      line_4_total_tax: 10000,
      line_5_total_payments: 7000,
      line_7_amount_paying: 500,
      line_9_1040nr_no_wages: true,
    }),
  );

  assertEquals(withFlag, baseline);
});

// ---------------------------------------------------------------------------
// Section 6: Edge Cases
// ---------------------------------------------------------------------------

Deno.test("test_large_extension_payment_routes_correctly — no upper cap on line_7", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 500000,
    line_5_total_payments: 400000,
    line_7_amount_paying: 100000,
  });

  const sch3 = findOutput(result, "schedule3");
  assertEquals(sch3 !== undefined, true);
  const input = sch3!.input as Record<string, unknown>;
  assertEquals(input.line10_amount_paid_extension, 100000);
});

Deno.test("test_all_zeros_no_outputs — zero tax with zero payments emits no routing outputs", () => {
  // Zero tax owed, zero payments, zero amount paying → no schedule3 output
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 0,
    line_5_total_payments: 0,
    line_7_amount_paying: 0,
  });

  const sch3 = findOutput(result, "schedule3");
  assertEquals(sch3, undefined);
});

Deno.test("test_only_one_schedule3_output — emits at most one schedule3 output", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 10000,
    line_5_total_payments: 7000,
    line_7_amount_paying: 1500,
  });

  const sch3Outputs = result.outputs.filter((o) => o.nodeType === "schedule3");
  assertEquals(sch3Outputs.length, 1);
});

Deno.test("test_extension_payment_no_minimum_zero_still_extends — $0 payment valid", () => {
  // IRS: taxpayer gets extension even if paying $0; no minimum required
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 5000,
    line_5_total_payments: 0,
    line_7_amount_paying: 0,
  });
  assertEquals(Array.isArray(result.outputs), true);
});

// ---------------------------------------------------------------------------
// Section 7: Smoke Test — All Major Fields
// ---------------------------------------------------------------------------

Deno.test("test_smoke_all_major_fields — comprehensive test with all boxes populated", () => {
  const result = compute({
    produce_4868: "X",
    line_4_total_tax: 25000,
    line_5_total_payments: 18000,
    line_7_amount_paying: 5000,
    line_8_out_of_country: true,
    line_9_1040nr_no_wages: false,
    extension_previously_filed: false,
    produce_1040v: true,
    amount_on_1040v: 5000,
  });

  // Must emit exactly one schedule3 output
  const sch3Outputs = result.outputs.filter((o) => o.nodeType === "schedule3");
  assertEquals(sch3Outputs.length, 1);

  // schedule3 line10 must equal line_7_amount_paying
  const input = sch3Outputs[0].input as Record<string, unknown>;
  assertEquals(input.line10_amount_paid_extension, 5000);

  // No spurious extra outputs from informational fields
  assertEquals(result.outputs.length, 1);
});
