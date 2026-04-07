import { assertEquals, assertThrows } from "@std/assert";
import { form6198 } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";

function compute(input: Record<string, unknown>) {
  return form6198.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("form6198 — nodeType is 'form6198'", () => {
  assertEquals(form6198.nodeType, "form6198");
});

// ─── No loss / gain activity ──────────────────────────────────────────────────

Deno.test("form6198 — gain activity: no outputs", () => {
  // When there is no loss (profit or breakeven), no limitation applies
  const result = compute({
    amount_at_risk: 10_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form6198 — zero loss: no outputs", () => {
  const result = compute({
    schedule_c_loss: 0,
    amount_at_risk: 5_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Loss within at-risk amount (fully allowed) ───────────────────────────────

Deno.test("form6198 — loss within at-risk: no add-back, no outputs", () => {
  // Loss of $3,000, at-risk $5,000 → entire loss deductible, no disallowance
  const result = compute({
    schedule_c_loss: -3_000,
    amount_at_risk: 5_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form6198 — loss equal to at-risk: fully allowed, no outputs", () => {
  const result = compute({
    schedule_c_loss: -5_000,
    amount_at_risk: 5_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Loss exceeds at-risk amount (partially disallowed) ──────────────────────

Deno.test("form6198 — loss exceeds at-risk: disallowed add-back routed to schedule1", () => {
  // Loss $6,000, at-risk $4,000 → $4,000 allowed, $2,000 disallowed
  const result = compute({
    schedule_c_loss: -6_000,
    amount_at_risk: 4_000,
  });
  // Disallowed add-back is positive (reverses part of the upstream-posted loss)
  assertEquals(fieldsOf(result.outputs, schedule1)!.at_risk_disallowed_add_back, 2_000);
});

// ─── Zero at-risk: full disallowance ─────────────────────────────────────────

Deno.test("form6198 — zero at-risk amount: entire loss disallowed", () => {
  const result = compute({
    schedule_c_loss: -4_000,
    amount_at_risk: 0,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.at_risk_disallowed_add_back, 4_000);
});

// ─── Prior unallowed suspended losses ────────────────────────────────────────

Deno.test("form6198 — prior unallowed losses added to current year loss", () => {
  // Current loss $2,000 + prior unallowed $1,500 = total $3,500; at-risk $2,000
  // Allowed = $2,000; disallowed = $1,500
  const result = compute({
    schedule_c_loss: -2_000,
    prior_unallowed: 1_500,
    amount_at_risk: 2_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.at_risk_disallowed_add_back, 1_500);
});

Deno.test("form6198 — prior unallowed only (no current year loss), within at-risk", () => {
  // Prior unallowed $500, at-risk $1,000 → fully allowed, no add-back
  const result = compute({
    prior_unallowed: 500,
    amount_at_risk: 1_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form6198 — prior unallowed only (no current year loss), exceeds at-risk", () => {
  // Prior unallowed $800, at-risk $300 → disallowed $500
  const result = compute({
    prior_unallowed: 800,
    amount_at_risk: 300,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.at_risk_disallowed_add_back, 500);
});

// ─── Current year income reduces total loss ───────────────────────────────────

Deno.test("form6198 — income offsets loss before applying at-risk limit", () => {
  // Income $1,000, loss $4,000 → net loss $3,000; at-risk $2,000 → disallowed $1,000
  const result = compute({
    schedule_c_loss: -4_000,
    current_year_income: 1_000,
    amount_at_risk: 2_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.at_risk_disallowed_add_back, 1_000);
});

Deno.test("form6198 — income fully offsets loss: no limitation applies", () => {
  // Income $5,000, loss $3,000 → net income $2,000; no limitation
  const result = compute({
    schedule_c_loss: -3_000,
    current_year_income: 5_000,
    amount_at_risk: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Spec scenario: at_risk=$20k, loss=$30k ──────────────────────────────────

Deno.test("form6198 — at_risk=20000, loss=30000 → deductible=20000, suspended=10000", () => {
  // Total loss $30,000; at-risk $20,000 → allowed $20,000, disallowed $10,000
  const result = compute({
    schedule_c_loss: -30_000,
    amount_at_risk: 20_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.at_risk_disallowed_add_back, 10_000);
});

// ─── Output routing ───────────────────────────────────────────────────────────

Deno.test("form6198 — disallowed loss routes to both schedule1 and agi_aggregator", () => {
  // 2 outputs: schedule1 + agi_aggregator
  const result = compute({
    schedule_c_loss: -10_000,
    amount_at_risk: 3_000,
  });
  assertEquals(result.outputs.length, 2);
  assertEquals(result.outputs[0].nodeType, "schedule1");
  assertEquals(result.outputs[1].nodeType, "agi_aggregator");
  assertEquals(fieldsOf(result.outputs, schedule1)!.at_risk_disallowed_add_back, 7_000);
});

// ─── Input validation ─────────────────────────────────────────────────────────

Deno.test("form6198 — rejects negative amount_at_risk", () => {
  assertThrows(() => compute({ amount_at_risk: -1 }));
});

Deno.test("form6198 — rejects negative prior_unallowed", () => {
  assertThrows(() => compute({ prior_unallowed: -100 }));
});

Deno.test("form6198 — rejects positive schedule_c_loss (must be <= 0)", () => {
  assertThrows(() => compute({ schedule_c_loss: 500, amount_at_risk: 1_000 }));
});
