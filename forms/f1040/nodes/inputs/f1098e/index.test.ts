import { assertEquals } from "@std/assert";
import { f1098e } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { box1_student_loan_interest: 0, ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f1098e.compute({ taxYear: 2025, formType: "f1040" }, { f1098es: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f1098e.inputSchema: valid minimal item passes", () => {
  const parsed = f1098e.inputSchema.safeParse({
    f1098es: [{ box1_student_loan_interest: 1200 }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f1098e.inputSchema: empty array fails (min 1)", () => {
  const parsed = f1098e.inputSchema.safeParse({ f1098es: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f1098e.inputSchema: negative box1 fails", () => {
  const parsed = f1098e.inputSchema.safeParse({
    f1098es: [{ box1_student_loan_interest: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1098e.inputSchema: optional lender_name passes", () => {
  const parsed = f1098e.inputSchema.safeParse({
    f1098es: [{ box1_student_loan_interest: 500, lender_name: "Navient" }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f1098e.inputSchema: zero interest passes", () => {
  const parsed = f1098e.inputSchema.safeParse({
    f1098es: [{ box1_student_loan_interest: 0 }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Routing — Schedule 1 and AGI Aggregator
// =============================================================================

Deno.test("f1098e.compute: interest below cap routes to schedule1 line19", () => {
  const result = compute([minimalItem({ box1_student_loan_interest: 1500 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line19_student_loan_interest, 1500);
});

Deno.test("f1098e.compute: interest below cap routes to agi_aggregator line19", () => {
  const result = compute([minimalItem({ box1_student_loan_interest: 1500 })]);
  const fields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(fields.line19_student_loan_interest, 1500);
});

Deno.test("f1098e.compute: interest above $2,500 cap — capped at 2500 on schedule1", () => {
  const result = compute([minimalItem({ box1_student_loan_interest: 3000 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line19_student_loan_interest, 2500);
});

Deno.test("f1098e.compute: interest above $2,500 cap — capped at 2500 on agi_aggregator", () => {
  const result = compute([minimalItem({ box1_student_loan_interest: 3000 })]);
  const fields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(fields.line19_student_loan_interest, 2500);
});

Deno.test("f1098e.compute: exactly at $2,500 cap passes through unchanged", () => {
  const result = compute([minimalItem({ box1_student_loan_interest: 2500 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line19_student_loan_interest, 2500);
});

// =============================================================================
// 3. Zero / No Output
// =============================================================================

Deno.test("f1098e.compute: zero interest — no outputs", () => {
  const result = compute([minimalItem({ box1_student_loan_interest: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f1098e.compute: all zero items — no outputs", () => {
  const result = compute([
    minimalItem({ box1_student_loan_interest: 0 }),
    minimalItem({ box1_student_loan_interest: 0 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Multiple 1098-E Forms
// =============================================================================

Deno.test("f1098e.compute: multiple forms — interest summed", () => {
  const result = compute([
    minimalItem({ box1_student_loan_interest: 800 }),
    minimalItem({ box1_student_loan_interest: 700 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line19_student_loan_interest, 1500);
});

Deno.test("f1098e.compute: multiple forms — sum capped at $2,500", () => {
  const result = compute([
    minimalItem({ box1_student_loan_interest: 1500 }),
    minimalItem({ box1_student_loan_interest: 1500 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line19_student_loan_interest, 2500);
});

Deno.test("f1098e.compute: multiple forms — only one schedule1 output", () => {
  const result = compute([
    minimalItem({ box1_student_loan_interest: 600 }),
    minimalItem({ box1_student_loan_interest: 800 }),
  ]);
  const s1Outputs = result.outputs.filter((o: { nodeType: string }) => o.nodeType === "schedule1");
  assertEquals(s1Outputs.length, 1);
});

Deno.test("f1098e.compute: multiple forms — only one agi_aggregator output", () => {
  const result = compute([
    minimalItem({ box1_student_loan_interest: 600 }),
    minimalItem({ box1_student_loan_interest: 800 }),
  ]);
  const agiOutputs = result.outputs.filter((o: { nodeType: string }) => o.nodeType === "agi_aggregator");
  assertEquals(agiOutputs.length, 1);
});

// =============================================================================
// 5. Smoke Test
// =============================================================================

Deno.test("f1098e.compute: smoke test — two lenders, total capped", () => {
  const result = compute([
    minimalItem({ box1_student_loan_interest: 1800, lender_name: "Navient" }),
    minimalItem({ box1_student_loan_interest: 1200, lender_name: "FedLoan" }),
  ]);
  // total 3000, capped at 2500
  const s1Fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1Fields.line19_student_loan_interest, 2500);
  const agiFields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(agiFields.line19_student_loan_interest, 2500);
});
