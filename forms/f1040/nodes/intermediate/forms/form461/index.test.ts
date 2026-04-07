import { assertEquals, assertThrows } from "@std/assert";
import { form461, inputSchema } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form461.compute({ taxYear: 2025 }, inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Input Validation ────────────────────────────────────────────────────────

Deno.test("validation: rejects negative excess_business_loss", () => {
  assertThrows(() => compute({ excess_business_loss: -1 }));
});

Deno.test("validation: rejects invalid filing_status", () => {
  assertThrows(() => compute({ excess_business_loss: 1000, filing_status: "invalid" }));
});

Deno.test("validation: accepts valid filing_status values", () => {
  for (const status of ["single", "mfj", "mfs", "hoh", "qss"]) {
    const result = compute({ excess_business_loss: 50_000, filing_status: status });
    assertEquals(result.outputs.length, 1);
  }
});

// ─── Zero / Below Threshold ──────────────────────────────────────────────────

Deno.test("zero_loss: no excess → no outputs", () => {
  const result = compute({ excess_business_loss: 0 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("empty_input: no excess_business_loss field → no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ─── Routing to Schedule 1 Line 8p ──────────────────────────────────────────

Deno.test("routing: positive excess routes to schedule1 line8p", () => {
  const excess = 50_000;
  const result = compute({ excess_business_loss: excess });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8p_excess_business_loss, excess);
});

Deno.test("routing: exactly 1 output when excess > 0", () => {
  const result = compute({ excess_business_loss: 1 });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule1");
});

// ─── Accumulation Pattern ────────────────────────────────────────────────────

Deno.test("accumulation: array of excess_business_loss values are summed", () => {
  const result = compute({ excess_business_loss: [30_000, 20_000] });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8p_excess_business_loss, 50_000);
});

Deno.test("accumulation: array with zero entries sums correctly", () => {
  const result = compute({ excess_business_loss: [0, 0, 0] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("accumulation: single-element array treated same as scalar", () => {
  const scalar = compute({ excess_business_loss: 25_000 });
  const arr = compute({ excess_business_loss: [25_000] });
  assertEquals(
    findOutput(scalar, "schedule1")?.fields.line8p_excess_business_loss,
    findOutput(arr, "schedule1")?.fields.line8p_excess_business_loss,
  );
});

// ─── Filing Status (informational — threshold applied upstream) ──────────────

Deno.test("filing_status_single: excess passes through correctly", () => {
  const result = compute({ excess_business_loss: 100_000, filing_status: "single" });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8p_excess_business_loss, 100_000);
});

Deno.test("filing_status_mfj: excess passes through correctly", () => {
  const result = compute({ excess_business_loss: 200_000, filing_status: "mfj" });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8p_excess_business_loss, 200_000);
});

Deno.test("filing_status_mfs: excess passes through correctly", () => {
  const result = compute({ excess_business_loss: 50_000, filing_status: "mfs" });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8p_excess_business_loss, 50_000);
});

Deno.test("filing_status_hoh: excess passes through correctly", () => {
  const result = compute({ excess_business_loss: 75_000, filing_status: "hoh" });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8p_excess_business_loss, 75_000);
});

// ─── NOL Carryforward (informational — no current-year deduction) ────────────

Deno.test("nol_carryforward: excess business loss treated as positive income on return", () => {
  // Per IRC §461(l): excess becomes NOL; on Form 1040, it's added back as other income
  // The value must be positive (increases taxable income in current year as add-back)
  const result = compute({ excess_business_loss: 313_001 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8p_excess_business_loss, 313_001);
});

// ─── Edge Cases ──────────────────────────────────────────────────────────────

Deno.test("edge_case: large excess business loss (single near threshold)", () => {
  // Typical: single filer, loss was $500k → threshold $313k → excess = $187k
  const excess = 187_000;
  const result = compute({ excess_business_loss: excess, filing_status: "single" });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8p_excess_business_loss, excess);
});

Deno.test("edge_case: large excess business loss (MFJ)", () => {
  // MFJ filer, loss was $1M → threshold $626k → excess = $374k
  const excess = 374_000;
  const result = compute({ excess_business_loss: excess, filing_status: "mfj" });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8p_excess_business_loss, excess);
});

Deno.test("edge_case: fractional dollar amounts", () => {
  const result = compute({ excess_business_loss: 1_234.56 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8p_excess_business_loss, 1_234.56);
});

// ─── Spec scenario: single filer excess loss ─────────────────────────────────

Deno.test("spec_scenario: single filer, total_losses=400k, gains=50k, net=350k > 289k → excess=61000 to NOL", () => {
  // The threshold enforcement and net computation happens upstream.
  // form461 receives the pre-computed excess ($350k - $289k = $61k) and routes it.
  const result = compute({ excess_business_loss: 61_000, filing_status: "single" });
  assertEquals(findOutput(result, "schedule1")?.fields.line8p_excess_business_loss, 61_000);
});

// ─── Smoke Test ───────────────────────────────────────────────────────────────

Deno.test("smoke: typical single filer with $187k excess business loss", () => {
  // Schedule C had $500k loss, threshold $313k → excess $187k fed into form461
  const result = compute({
    excess_business_loss: 187_000,
    filing_status: "single",
  });
  assertEquals(result.outputs.length, 1);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.nodeType, "schedule1");
  assertEquals(s1?.fields.line8p_excess_business_loss, 187_000);
});

Deno.test("smoke: MFJ with multiple upstream sources (schedule_c + schedule_e)", () => {
  // schedule_c contributed $200k excess, schedule_e contributed $50k excess
  const result = compute({
    excess_business_loss: [200_000, 50_000],
    filing_status: "mfj",
  });
  assertEquals(result.outputs.length, 1);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8p_excess_business_loss, 250_000);
});
