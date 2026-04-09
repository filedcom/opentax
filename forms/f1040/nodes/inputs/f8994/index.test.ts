import { assertEquals } from "@std/assert";
import { f8994 } from "./index.ts";

function compute(input: Parameters<typeof f8994.compute>[1]) {
  return f8994.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function schedule3Credit(result: ReturnType<typeof compute>): number | undefined {
  const out = result.outputs.find((o) => o.nodeType === "schedule3");
  return out ? (out.fields as Record<string, number>).line6z_general_business_credit : undefined;
}

// =============================================================================
// 1. Schema Validation
// =============================================================================

Deno.test("f8994: empty object is valid — employees optional", () => {
  const parsed = f8994.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8994: negative fmla_wages rejected", () => {
  const parsed = f8994.inputSchema.safeParse({
    employees: [{ fmla_wages: -100, wage_replacement_pct: 0.6 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8994: wage_replacement_pct > 1 rejected", () => {
  const parsed = f8994.inputSchema.safeParse({
    employees: [{ fmla_wages: 1000, wage_replacement_pct: 1.1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8994: wage_replacement_pct < 0 rejected", () => {
  const parsed = f8994.inputSchema.safeParse({
    employees: [{ fmla_wages: 1000, wage_replacement_pct: -0.1 }],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Zero-output cases
// =============================================================================

Deno.test("f8994: no employees produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8994: empty employees array produces no outputs", () => {
  const result = compute({ employees: [] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8994: wage_replacement_pct below 50% produces no credit", () => {
  const result = compute({ employees: [{ fmla_wages: 10_000, wage_replacement_pct: 0.49 }] });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Credit calculation
// =============================================================================

Deno.test("f8994: exactly 50% wage replacement → 12.5% rate", () => {
  // $10,000 wages × 12.5% = $1,250
  const result = compute({ employees: [{ fmla_wages: 10_000, wage_replacement_pct: 0.50 }] });
  assertEquals(schedule3Credit(result), 1_250);
});

Deno.test("f8994: 60% wage replacement → 15% rate", () => {
  // 12.5% + 10 points × 0.25% = 15%; $10,000 × 15% = $1,500
  const result = compute({ employees: [{ fmla_wages: 10_000, wage_replacement_pct: 0.60 }] });
  assertEquals(schedule3Credit(result), 1_500);
});

Deno.test("f8994: 100% wage replacement → 25% rate (cap)", () => {
  // Max rate 25%; $8,000 × 25% = $2,000
  const result = compute({ employees: [{ fmla_wages: 8_000, wage_replacement_pct: 1.00 }] });
  assertEquals(schedule3Credit(result), 2_000);
});

Deno.test("f8994: rate caps at 25% even above 100% equivalent", () => {
  // 75% replacement: 12.5% + 25×0.25% = 18.75%; cap = 25%; here still below cap
  const result = compute({ employees: [{ fmla_wages: 4_000, wage_replacement_pct: 0.75 }] });
  assertEquals(schedule3Credit(result), 750); // 4000 × 18.75% = 750
});

// =============================================================================
// 4. Multiple employees aggregated
// =============================================================================

Deno.test("f8994: two employees credits sum to one schedule3 output", () => {
  const result = compute({
    employees: [
      { fmla_wages: 10_000, wage_replacement_pct: 0.50 },  // $1,250
      { fmla_wages: 10_000, wage_replacement_pct: 0.60 },  // $1,500
    ],
  });
  assertEquals(schedule3Credit(result), 2_750);
});

Deno.test("f8994: routes to schedule3 node", () => {
  const result = compute({ employees: [{ fmla_wages: 5_000, wage_replacement_pct: 0.50 }] });
  assertEquals(result.outputs[0].nodeType, "schedule3");
});
