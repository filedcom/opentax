import { assertEquals } from "@std/assert";
import { form4952 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form4952.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Zero / no-op cases ───────────────────────────────────────────────────────

Deno.test("no interest expense — no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero interest expense — no outputs", () => {
  const result = compute({ investment_interest_expense: 0, net_investment_income: 5_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero NII — no deduction allowed even with expense", () => {
  const result = compute({
    investment_interest_expense: 8_000,
    net_investment_income: 0,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("no NII provided — no deduction allowed", () => {
  const result = compute({ investment_interest_expense: 5_000 });
  assertEquals(result.outputs.length, 0);
});

// ─── Deductible interest: min(total, NII) ─────────────────────────────────────

Deno.test("interest below NII — full expense deducted", () => {
  // $3k expense, $5k NII → deductible = $3k
  const result = compute({
    investment_interest_expense: 3_000,
    net_investment_income: 5_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 3_000);
});

Deno.test("interest equal to NII — full expense deducted", () => {
  const result = compute({
    investment_interest_expense: 5_000,
    net_investment_income: 5_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 5_000);
});

Deno.test("interest above NII — limited to NII (carryover implied)", () => {
  // $10k expense, $6k NII → deductible = $6k; excess $4k carries forward
  const result = compute({
    investment_interest_expense: 10_000,
    net_investment_income: 6_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 6_000);
});

// ─── Carryforward from prior year ─────────────────────────────────────────────

Deno.test("carryforward only, no current expense — deducted up to NII", () => {
  const result = compute({
    prior_year_carryforward: 6_000,
    net_investment_income: 10_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 6_000);
});

Deno.test("carryforward adds to current expense — total limited by NII", () => {
  // Current $2k + carryforward $3k = $5k total; NII $4k → deduct $4k
  const result = compute({
    investment_interest_expense: 2_000,
    prior_year_carryforward: 3_000,
    net_investment_income: 4_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 4_000);
});

Deno.test("carryforward + current expense, NII covers both", () => {
  // $3k + $2k carryforward = $5k total; NII $8k → all $5k deductible
  const result = compute({
    investment_interest_expense: 3_000,
    prior_year_carryforward: 2_000,
    net_investment_income: 8_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 5_000);
});

Deno.test("carryforward + current, NII less than both — limited to NII", () => {
  // $5k + $4k = $9k total; NII $6k → deductible $6k
  const result = compute({
    investment_interest_expense: 5_000,
    prior_year_carryforward: 4_000,
    net_investment_income: 6_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 6_000);
});

// ─── Output routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule_a line_9_investment_interest with exact value", () => {
  const result = compute({
    investment_interest_expense: 1_000,
    net_investment_income: 2_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.nodeType, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 1_000);
});
