import { assertEquals } from "@std/assert";
import { educator_expenses, type EducatorExpensesInput } from "./index.ts";
import { FilingStatus } from "../../types.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";

function compute(input: EducatorExpensesInput) {
  return educator_expenses.compute({ taxYear: 2025, formType: "f1040" }, input);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("educator_expenses.inputSchema: valid single educator passes", () => {
  const parsed = educator_expenses.inputSchema.safeParse({
    educator1_expenses: 400,
    filing_status: FilingStatus.Single,
  });
  assertEquals(parsed.success, true);
});

Deno.test("educator_expenses.inputSchema: valid MFJ with two educators passes", () => {
  const parsed = educator_expenses.inputSchema.safeParse({
    educator1_expenses: 350,
    educator2_expenses: 250,
    filing_status: FilingStatus.MFJ,
  });
  assertEquals(parsed.success, true);
});

Deno.test("educator_expenses.inputSchema: negative educator1_expenses fails", () => {
  const parsed = educator_expenses.inputSchema.safeParse({
    educator1_expenses: -50,
    filing_status: FilingStatus.Single,
  });
  assertEquals(parsed.success, false);
});

Deno.test("educator_expenses.inputSchema: negative educator2_expenses fails", () => {
  const parsed = educator_expenses.inputSchema.safeParse({
    educator1_expenses: 200,
    educator2_expenses: -100,
    filing_status: FilingStatus.MFJ,
  });
  assertEquals(parsed.success, false);
});

Deno.test("educator_expenses.inputSchema: invalid filing_status fails", () => {
  const parsed = educator_expenses.inputSchema.safeParse({
    educator1_expenses: 200,
    filing_status: "INVALID",
  });
  assertEquals(parsed.success, false);
});

Deno.test("educator_expenses.inputSchema: educator2_expenses optional for non-MFJ", () => {
  const parsed = educator_expenses.inputSchema.safeParse({
    educator1_expenses: 300,
    filing_status: FilingStatus.HOH,
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Single Filer — $300 Per-Educator Cap
// =============================================================================

Deno.test("educator_expenses.compute: single filer expenses below $300 — passes through", () => {
  const result = compute({ educator1_expenses: 200, filing_status: FilingStatus.Single });
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line11_educator_expenses, 200);
});

Deno.test("educator_expenses.compute: single filer expenses at exactly $300 — passes through", () => {
  const result = compute({ educator1_expenses: 300, filing_status: FilingStatus.Single });
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line11_educator_expenses, 300);
});

Deno.test("educator_expenses.compute: single filer expenses above $300 — capped at 300", () => {
  const result = compute({ educator1_expenses: 500, filing_status: FilingStatus.Single });
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line11_educator_expenses, 300);
});

Deno.test("educator_expenses.compute: HOH filer — capped at $300", () => {
  const result = compute({ educator1_expenses: 400, filing_status: FilingStatus.HOH });
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line11_educator_expenses, 300);
});

Deno.test("educator_expenses.compute: MFS filer — capped at $300", () => {
  const result = compute({ educator1_expenses: 400, filing_status: FilingStatus.MFS });
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line11_educator_expenses, 300);
});

// =============================================================================
// 3. MFJ — $600 Total Cap, $300 Per Educator
// =============================================================================

Deno.test("educator_expenses.compute: MFJ both educators below $300 — sum passes through", () => {
  const result = compute({
    educator1_expenses: 200,
    educator2_expenses: 150,
    filing_status: FilingStatus.MFJ,
  });
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line11_educator_expenses, 350);
});

Deno.test("educator_expenses.compute: MFJ each educator at $300 — total is $600", () => {
  const result = compute({
    educator1_expenses: 300,
    educator2_expenses: 300,
    filing_status: FilingStatus.MFJ,
  });
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line11_educator_expenses, 600);
});

Deno.test("educator_expenses.compute: MFJ educator1 above $300 — per-educator cap applied", () => {
  const result = compute({
    educator1_expenses: 500,
    educator2_expenses: 200,
    filing_status: FilingStatus.MFJ,
  });
  // educator1 capped at 300 + educator2 200 = 500
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line11_educator_expenses, 500);
});

Deno.test("educator_expenses.compute: MFJ both above $300 — each capped at $300, total $600", () => {
  const result = compute({
    educator1_expenses: 800,
    educator2_expenses: 700,
    filing_status: FilingStatus.MFJ,
  });
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line11_educator_expenses, 600);
});

Deno.test("educator_expenses.compute: MFJ only educator1 — educator2 omitted, capped at $300", () => {
  const result = compute({
    educator1_expenses: 400,
    filing_status: FilingStatus.MFJ,
  });
  // educator1 capped at 300, no educator2 → total 300 (not 600)
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line11_educator_expenses, 300);
});

// =============================================================================
// 4. AGI Aggregator Routing
// =============================================================================

Deno.test("educator_expenses.compute: routes to agi_aggregator with correct amount", () => {
  const result = compute({ educator1_expenses: 250, filing_status: FilingStatus.Single });
  const fields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(fields.line11_educator_expenses, 250);
});

Deno.test("educator_expenses.compute: MFJ agi_aggregator receives capped total", () => {
  const result = compute({
    educator1_expenses: 400,
    educator2_expenses: 400,
    filing_status: FilingStatus.MFJ,
  });
  const fields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(fields.line11_educator_expenses, 600);
});

// =============================================================================
// 5. Zero / No Output
// =============================================================================

Deno.test("educator_expenses.compute: zero expenses — no outputs", () => {
  const result = compute({ educator1_expenses: 0, filing_status: FilingStatus.Single });
  assertEquals(result.outputs.length, 0);
});

Deno.test("educator_expenses.compute: both zero expenses MFJ — no outputs", () => {
  const result = compute({
    educator1_expenses: 0,
    educator2_expenses: 0,
    filing_status: FilingStatus.MFJ,
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Output Count
// =============================================================================

Deno.test("educator_expenses.compute: only one schedule1 output emitted", () => {
  const result = compute({ educator1_expenses: 200, filing_status: FilingStatus.Single });
  const s1Outputs = result.outputs.filter((o: { nodeType: string }) => o.nodeType === "schedule1");
  assertEquals(s1Outputs.length, 1);
});

Deno.test("educator_expenses.compute: only one agi_aggregator output emitted", () => {
  const result = compute({ educator1_expenses: 200, filing_status: FilingStatus.Single });
  const agiOutputs = result.outputs.filter((o: { nodeType: string }) => o.nodeType === "agi_aggregator");
  assertEquals(agiOutputs.length, 1);
});

// =============================================================================
// 7. QSS Filing Status
// =============================================================================

Deno.test("educator_expenses.compute: QSS filer — capped at $300", () => {
  const result = compute({ educator1_expenses: 400, filing_status: FilingStatus.QSS });
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line11_educator_expenses, 300);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("educator_expenses.compute: smoke test — MFJ both educators at cap", () => {
  const result = compute({
    educator1_expenses: 300,
    educator2_expenses: 300,
    filing_status: FilingStatus.MFJ,
  });
  const s1Fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1Fields.line11_educator_expenses, 600);
  const agiFields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(agiFields.line11_educator_expenses, 600);
  // exactly two outputs total: schedule1 + agi_aggregator
  assertEquals(result.outputs.length, 2);
});
