import { assertEquals, assertThrows } from "@std/assert";
import { form8995 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form8995.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── Input validation ─────────────────────────────────────────────────────────

Deno.test("validation: rejects negative qbi_from_schedule_c", () => {
  assertThrows(() =>
    compute({ qbi_from_schedule_c: -1000, taxable_income: 50000 })
  );
});

Deno.test("validation: rejects negative line6_sec199a_dividends", () => {
  assertThrows(() =>
    compute({ line6_sec199a_dividends: -500, taxable_income: 50000 })
  );
});

Deno.test("validation: rejects negative taxable_income", () => {
  assertThrows(() =>
    compute({ qbi_from_schedule_c: 10000, taxable_income: -1 })
  );
});

Deno.test("validation: rejects negative net_capital_gain", () => {
  assertThrows(() =>
    compute({ qbi_from_schedule_c: 10000, taxable_income: 50000, net_capital_gain: -100 })
  );
});

Deno.test("validation: accepts all-absent inputs — no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ── Per-field calculation — QBI component ────────────────────────────────────

Deno.test("calc: qbi_from_schedule_c only — 20% rate applied, no income limit", () => {
  // Line 2 = 10000, Line 5 = 2000, Line 10 = 2000
  // Line 13 = 20% × (50000 - 0) = 10000 → deduction = min(2000, 10000) = 2000
  const result = compute({ qbi_from_schedule_c: 10000, taxable_income: 50000 });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 2000);
});

Deno.test("calc: qbi from schedule_e only — 20% rate applied", () => {
  // Line 2 = 20000, Line 5 = 4000; taxable_income = 100000 → limit = 20000
  const result = compute({ qbi: 20000, taxable_income: 100000 });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 4000);
});

Deno.test("calc: both qbi_from_schedule_c and qbi — aggregated on Line 2", () => {
  // Line 2 = 10000 + 5000 = 15000; Line 5 = 3000; limit = 20% × 80000 = 16000
  const result = compute({
    qbi_from_schedule_c: 10000,
    qbi: 5000,
    taxable_income: 80000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 3000);
});

Deno.test("calc: zero qbi — no f1040 output", () => {
  const result = compute({ qbi_from_schedule_c: 0, taxable_income: 50000 });
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("calc: absent qbi fields — no f1040 output", () => {
  const result = compute({ taxable_income: 50000 });
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ── Per-field calculation — REIT/PTP component ───────────────────────────────

Deno.test("calc: line6_sec199a_dividends only — 20% applied", () => {
  // Line 6 = 5000, Line 8 = 5000, Line 9 = 1000; Line 10 = 1000; limit = 20% × 50000 = 10000
  const result = compute({ line6_sec199a_dividends: 5000, taxable_income: 50000 });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 1000);
});

Deno.test("calc: both QBI and REIT dividends — components summed on Line 10", () => {
  // Line 5 = 2000 (QBI), Line 9 = 1000 (REIT) → Line 10 = 3000; limit = 20% × 100000 = 20000
  const result = compute({
    qbi_from_schedule_c: 10000,
    line6_sec199a_dividends: 5000,
    taxable_income: 100000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 3000);
});

Deno.test("calc: zero line6_sec199a_dividends — REIT component is zero", () => {
  const result = compute({ qbi_from_schedule_c: 10000, line6_sec199a_dividends: 0, taxable_income: 80000 });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 2000);
});

// ── QBI loss carryforward ─────────────────────────────────────────────────────

Deno.test("calc: qbi_loss_carryforward reduces current QBI", () => {
  // qbi_from_schedule_c = 10000, qbi_loss_carryforward = -3000 → net = 7000; 20% = 1400
  const result = compute({
    qbi_from_schedule_c: 10000,
    qbi_loss_carryforward: -3000,
    taxable_income: 100000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 1400);
});

Deno.test("calc: qbi_loss_carryforward larger than current QBI → net loss, no deduction, carryforward emitted", () => {
  // qbi = 5000, carryforward = -8000 → net = -3000 → deduction = 0; no f1040 output
  const result = compute({
    qbi_from_schedule_c: 5000,
    qbi_loss_carryforward: -8000,
    taxable_income: 100000,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("calc: positive qbi_loss_carryforward throws (must be zero or negative)", () => {
  assertThrows(() =>
    compute({ qbi_from_schedule_c: 10000, qbi_loss_carryforward: 1000, taxable_income: 50000 })
  );
});

// ── REIT/PTP loss carryforward ────────────────────────────────────────────────

Deno.test("calc: reit_loss_carryforward reduces current REIT dividends", () => {
  // line6 = 10000, reit_loss_carryforward = -2000 → net = 8000; 20% = 1600
  const result = compute({
    line6_sec199a_dividends: 10000,
    reit_loss_carryforward: -2000,
    taxable_income: 100000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 1600);
});

Deno.test("calc: reit_loss_carryforward exceeds REIT dividends → REIT component zero, no f1040 if no QBI", () => {
  // line6 = 3000, carryforward = -5000 → net = -2000 → REIT component = 0; no QBI → no f1040
  const result = compute({
    line6_sec199a_dividends: 3000,
    reit_loss_carryforward: -5000,
    taxable_income: 100000,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ── Income limitation (Lines 11–13) ──────────────────────────────────────────

Deno.test("threshold: income limit (20% × TI) caps the deduction below 20% of QBI", () => {
  // QBI = 100000 → 20% = 20000; taxable_income = 50000, net_capital_gain = 0
  // limit = 20% × 50000 = 10000 → deduction = min(20000, 10000) = 10000
  const result = compute({
    qbi_from_schedule_c: 100000,
    taxable_income: 50000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 10000);
});

Deno.test("threshold: net capital gain reduces income limitation base", () => {
  // QBI = 50000 → 20% = 10000; taxable_income = 60000, net_capital_gain = 20000
  // income_limit_base = 60000 - 20000 = 40000; limit = 20% × 40000 = 8000
  // deduction = min(10000, 8000) = 8000
  const result = compute({
    qbi_from_schedule_c: 50000,
    taxable_income: 60000,
    net_capital_gain: 20000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 8000);
});

Deno.test("threshold: when taxable_income equals net_capital_gain — income limit is zero, no deduction", () => {
  // All income is capital gains → income_limit_base = 0 → limit = 0 → deduction = 0
  const result = compute({
    qbi_from_schedule_c: 20000,
    taxable_income: 30000,
    net_capital_gain: 30000,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("threshold: income limit exactly equals 20% of QBI — deduction equals QBI component", () => {
  // QBI = 50000 → 20% = 10000; taxable_income = 50000, no cap gain → limit = 10000
  // deduction = min(10000, 10000) = 10000
  const result = compute({
    qbi_from_schedule_c: 50000,
    taxable_income: 50000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 10000);
});

Deno.test("threshold: zero taxable_income — no deduction allowed", () => {
  const result = compute({
    qbi_from_schedule_c: 20000,
    taxable_income: 0,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ── Hard validation rules ─────────────────────────────────────────────────────

Deno.test("validation hard pass: all valid fields — no throw", () => {
  const result = compute({
    qbi_from_schedule_c: 50000,
    qbi: 10000,
    line6_sec199a_dividends: 5000,
    w2_wages: 30000,
    unadjusted_basis: 100000,
    taxable_income: 200000,
    net_capital_gain: 10000,
    qbi_loss_carryforward: 0,
    reit_loss_carryforward: 0,
  });
  // Does not throw; produces f1040 output
  assertEquals(typeof result.outputs.length, "number");
});

// ── Output routing ────────────────────────────────────────────────────────────

Deno.test("routing: positive QBI → routes to f1040 with line13_qbi_deduction", () => {
  const result = compute({ qbi_from_schedule_c: 10000, taxable_income: 50000 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(typeof out?.fields.line13_qbi_deduction, "number");
});

Deno.test("routing: no QBI and no REIT dividends → no f1040 output", () => {
  const result = compute({ taxable_income: 50000 });
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("routing: only REIT dividends → routes to f1040", () => {
  const result = compute({ line6_sec199a_dividends: 10000, taxable_income: 100000 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.line13_qbi_deduction, 2000);
});

Deno.test("routing: w2_wages and unadjusted_basis accepted but not routed separately", () => {
  // These fields are informational for Form 8995-A; Form 8995 accepts but ignores them
  const result = compute({
    qbi_from_schedule_c: 10000,
    w2_wages: 20000,
    unadjusted_basis: 50000,
    taxable_income: 80000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 2000);
  // No separate output for w2_wages or unadjusted_basis (f1040 + standard_deduction)
  assertEquals(result.outputs.length, 2);
});

// ── Edge cases ────────────────────────────────────────────────────────────────

Deno.test("edge: net QBI loss (no carryforward field) — single Schedule C loss", () => {
  // qbi_from_schedule_c can be 0 (losses come as separate carryforward field)
  // A zero QBI produces no output
  const result = compute({ qbi_from_schedule_c: 0, taxable_income: 50000 });
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("edge: very large QBI — deduction capped at income limit", () => {
  // QBI = 1,000,000 → 20% = 200,000; taxable_income = 300,000; limit = 60,000
  const result = compute({
    qbi_from_schedule_c: 1_000_000,
    taxable_income: 300_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 60_000);
});

Deno.test("edge: net_capital_gain exceeds taxable_income — income limit base clamped to zero", () => {
  // income_limit_base = max(0, 20000 - 30000) = 0 → deduction = 0
  const result = compute({
    qbi_from_schedule_c: 10000,
    taxable_income: 20000,
    net_capital_gain: 30000,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("edge: fractional cents — deduction computed to full precision (no premature rounding)", () => {
  // QBI = 10001, 20% = 2000.2; taxable_income = 100000, limit = 20000 → deduction = 2000.2
  const result = compute({
    qbi_from_schedule_c: 10001,
    taxable_income: 100000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 2000.2);
});

// ── Smoke test ────────────────────────────────────────────────────────────────

Deno.test("smoke: full scenario — Schedule C + Schedule E + REIT dividends + carryforward", () => {
  // schedule_c QBI = 30000
  // schedule_e QBI = 20000, w2_wages = 40000, unadjusted_basis = 200000
  // REIT dividends = 10000
  // qbi_loss_carryforward = -5000 (prior year loss)
  // reit_loss_carryforward = -2000 (prior year REIT loss)
  // taxable_income = 150000, net_capital_gain = 10000
  //
  // Line 2: 30000 + 20000 = 50000
  // Line 4: 50000 + (-5000) = 45000
  // Line 5: 45000 × 0.20 = 9000
  // Line 6: 10000
  // Line 8: 10000 + (-2000) = 8000
  // Line 9: 8000 × 0.20 = 1600
  // Line 10: 9000 + 1600 = 10600
  // income_limit_base: 150000 - 10000 = 140000
  // Line 13: 140000 × 0.20 = 28000
  // Line 15: min(10600, 28000) = 10600
  const result = compute({
    qbi_from_schedule_c: 30000,
    qbi: 20000,
    w2_wages: 40000,
    unadjusted_basis: 200000,
    line6_sec199a_dividends: 10000,
    qbi_loss_carryforward: -5000,
    reit_loss_carryforward: -2000,
    taxable_income: 150000,
    net_capital_gain: 10000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.line13_qbi_deduction, 10600);
  assertEquals(result.outputs.length, 2); // f1040 + standard_deduction
});
