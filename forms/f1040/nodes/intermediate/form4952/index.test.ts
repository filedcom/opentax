import { assertEquals } from "@std/assert";
import { form4952 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form4952.compute(input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke — zero interest returns no outputs", () => {
  const result = compute({ investment_interest_expense: 0, net_investment_income: 5_000 });
  assertEquals(result.outputs.length, 0);
});

// ─── Deduction Limited to Net Investment Income ───────────────────────────────

Deno.test("interest below NII — full deduction allowed", () => {
  const result = compute({
    investment_interest_expense: 3_000,
    net_investment_income: 5_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 3_000);
});

Deno.test("interest equal to NII — full deduction allowed", () => {
  const result = compute({
    investment_interest_expense: 5_000,
    net_investment_income: 5_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 5_000);
});

Deno.test("interest above NII — limited to NII", () => {
  const result = compute({
    investment_interest_expense: 10_000,
    net_investment_income: 4_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 4_000);
});

Deno.test("zero NII — no deduction allowed", () => {
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

// ─── Carryforward ─────────────────────────────────────────────────────────────

Deno.test("carryforward added to current year interest", () => {
  // Current $2k + carryforward $3k = $5k total; NII $4k → deduct $4k
  const result = compute({
    investment_interest_expense: 2_000,
    prior_year_carryforward: 3_000,
    net_investment_income: 4_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 4_000);
});

Deno.test("carryforward only — no current year expense", () => {
  const result = compute({
    prior_year_carryforward: 6_000,
    net_investment_income: 10_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 6_000);
});

Deno.test("carryforward + current, NII covers both", () => {
  const result = compute({
    investment_interest_expense: 3_000,
    prior_year_carryforward: 2_000,
    net_investment_income: 8_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched?.fields.line_9_investment_interest, 5_000);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule_a line_9_investment_interest", () => {
  const result = compute({
    investment_interest_expense: 1_000,
    net_investment_income: 2_000,
  });
  const sched = findOutput(result, "schedule_a");
  assertEquals(sched !== undefined, true);
  assertEquals("line_9_investment_interest" in (sched?.fields ?? {}), true);
});
