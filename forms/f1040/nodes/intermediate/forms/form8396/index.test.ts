import { assertEquals } from "@std/assert";
import { form8396 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form8396.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke — zero interest and no carryforward returns no outputs", () => {
  const result = compute({ mortgage_interest_paid: 0, mcc_rate: 0.25 });
  assertEquals(result.outputs.length, 0);
});

// ─── Basic Credit Calculation ─────────────────────────────────────────────────

Deno.test("basic credit — 20% MCC rate, no cap applies", () => {
  // $10,000 × 20% = $2,000 — rate is exactly 20%, cap does NOT apply (> 20% triggers cap)
  const result = compute({ mortgage_interest_paid: 10_000, mcc_rate: 0.20 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6f_mortgage_interest_credit, 2_000);
});

Deno.test("basic credit — 15% MCC rate, no cap", () => {
  // $12,000 × 15% = $1,800 (no cap since rate ≤ 20%)
  const result = compute({ mortgage_interest_paid: 12_000, mcc_rate: 0.15 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6f_mortgage_interest_credit, 1_800);
});

Deno.test("basic credit — 10% MCC rate", () => {
  // $8,000 × 10% = $800
  const result = compute({ mortgage_interest_paid: 8_000, mcc_rate: 0.10 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6f_mortgage_interest_credit, 800);
});

// ─── $2,000 Cap (Rate > 20%) ─────────────────────────────────────────────────

Deno.test("cap — MCC rate 25%, credit above $2,000 → capped at $2,000", () => {
  // $15,000 × 25% = $3,750 → capped at $2,000
  const result = compute({ mortgage_interest_paid: 15_000, mcc_rate: 0.25 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6f_mortgage_interest_credit, 2_000);
});

Deno.test("cap — MCC rate 50%, credit above $2,000 → capped at $2,000", () => {
  // $6,000 × 50% = $3,000 → capped at $2,000
  const result = compute({ mortgage_interest_paid: 6_000, mcc_rate: 0.50 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6f_mortgage_interest_credit, 2_000);
});

Deno.test("cap — MCC rate 25%, credit below $2,000 → no cap needed", () => {
  // $5,000 × 25% = $1,250 → below cap, no limitation
  const result = compute({ mortgage_interest_paid: 5_000, mcc_rate: 0.25 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6f_mortgage_interest_credit, 1_250);
});

// ─── Carryforward ─────────────────────────────────────────────────────────────

Deno.test("carryforward only — no current year interest", () => {
  const result = compute({ prior_year_credit_carryforward: 500 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6f_mortgage_interest_credit, 500);
});

Deno.test("carryforward + current year credit combined", () => {
  // Current: $8,000 × 15% = $1,200 + carryforward $600 = $1,800
  const result = compute({
    mortgage_interest_paid: 8_000,
    mcc_rate: 0.15,
    prior_year_credit_carryforward: 600,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6f_mortgage_interest_credit, 1_800);
});

Deno.test("carryforward + current year, capped at $2,000 then carryforward added", () => {
  // Current: $15,000 × 25% = $3,750 → capped at $2,000; + carryforward $300 = $2,300
  const result = compute({
    mortgage_interest_paid: 15_000,
    mcc_rate: 0.25,
    prior_year_credit_carryforward: 300,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6f_mortgage_interest_credit, 2_300);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule3 line6f_mortgage_interest_credit", () => {
  // $10,000 × 15% = $1,500
  const result = compute({ mortgage_interest_paid: 10_000, mcc_rate: 0.15 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.nodeType, "schedule3");
  assertEquals(s3?.fields.line6f_mortgage_interest_credit, 1_500);
});
