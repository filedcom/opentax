import { assertEquals, assertThrows } from "@std/assert";
import { form7203 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form7203.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── 1. nodeType identity ─────────────────────────────────────────────────────

Deno.test("form7203 — nodeType is 'form7203'", () => {
  assertEquals(form7203.nodeType, "form7203");
});

// ─── 2. Input validation ──────────────────────────────────────────────────────

Deno.test("form7203 — rejects negative stock_basis_beginning", () => {
  assertThrows(() => compute({ stock_basis_beginning: -1 }));
});

Deno.test("form7203 — rejects negative debt_basis_beginning", () => {
  assertThrows(() => compute({ debt_basis_beginning: -1 }));
});

Deno.test("form7203 — rejects negative additional_contributions", () => {
  assertThrows(() => compute({ additional_contributions: -100 }));
});

Deno.test("form7203 — rejects negative ordinary_income", () => {
  assertThrows(() => compute({ ordinary_income: -500 }));
});

Deno.test("form7203 — rejects negative ordinary_loss", () => {
  assertThrows(() => compute({ ordinary_loss: -1_000 }));
});

Deno.test("form7203 — rejects negative prior_year_unallowed_loss", () => {
  assertThrows(() => compute({ prior_year_unallowed_loss: -200 }));
});

Deno.test("form7203 — rejects negative distributions", () => {
  assertThrows(() => compute({ distributions: -500 }));
});

Deno.test("form7203 — rejects negative nondeductible_expenses", () => {
  assertThrows(() => compute({ nondeductible_expenses: -100 }));
});

Deno.test("form7203 — rejects negative new_loans", () => {
  assertThrows(() => compute({ new_loans: -1_000 }));
});

Deno.test("form7203 — rejects negative tax_exempt_income", () => {
  assertThrows(() => compute({ tax_exempt_income: -500 }));
});

Deno.test("form7203 — accepts all zero inputs: no loss pool → no outputs", () => {
  const result = compute({
    stock_basis_beginning: 0,
    debt_basis_beginning: 0,
    ordinary_loss: 0,
    ordinary_income: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── 3. No loss — no output ──────────────────────────────────────────────────

Deno.test("form7203 — no loss, no prior unallowed: empty outputs", () => {
  const result = compute({
    stock_basis_beginning: 10_000,
    ordinary_loss: 0,
    prior_year_unallowed_loss: 0,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form7203 — omitted loss fields: empty outputs", () => {
  const result = compute({ stock_basis_beginning: 5_000 });
  assertEquals(result.outputs.length, 0);
});

// ─── 4. Loss fully within stock basis — no disallowance ──────────────────────

Deno.test("form7203 — loss equals stock basis: fully allowed, no output", () => {
  // stock_basis = 10_000, loss = 10_000 → disallowed = 0
  const result = compute({
    stock_basis_beginning: 10_000,
    ordinary_loss: 10_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form7203 — loss less than stock basis: fully allowed, no output", () => {
  // stock_basis = 20_000, loss = 5_000 → disallowed = 0
  const result = compute({
    stock_basis_beginning: 20_000,
    ordinary_loss: 5_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── 5. Loss exceeds stock basis but within debt basis ───────────────────────

Deno.test("form7203 — loss exceeds stock, covered by debt: no disallowance", () => {
  // stock_basis = 3_000, debt_basis = 5_000, loss = 7_000
  // allowed_from_stock = 3_000, remaining = 4_000, allowed_from_debt = 4_000 → disallowed = 0
  const result = compute({
    stock_basis_beginning: 3_000,
    debt_basis_beginning: 5_000,
    ordinary_loss: 7_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form7203 — loss exactly equal to combined stock + debt basis: no output", () => {
  // stock = 4_000, debt = 2_000 → total basis = 6_000, loss = 6_000 → disallowed = 0
  const result = compute({
    stock_basis_beginning: 4_000,
    debt_basis_beginning: 2_000,
    ordinary_loss: 6_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── 6. Loss exceeds total basis — partial disallowance ──────────────────────

Deno.test("form7203 — loss exceeds stock only, no debt: routes basis_disallowed_add_back to schedule1", () => {
  // stock = 2_000, debt = 0, loss = 5_000 → allowed = 2_000, disallowed = 3_000
  const result = compute({
    stock_basis_beginning: 2_000,
    ordinary_loss: 5_000,
  });
  assertEquals(findOutput(result, "schedule1")!.fields.basis_disallowed_add_back, 3_000);
});

Deno.test("form7203 — loss exceeds combined stock and debt: disallows correct amount", () => {
  // stock = 2_000, debt = 1_000, loss = 5_000
  // allowed_from_stock = 2_000, remaining = 3_000, allowed_from_debt = 1_000, disallowed = 2_000
  const result = compute({
    stock_basis_beginning: 2_000,
    debt_basis_beginning: 1_000,
    ordinary_loss: 5_000,
  });
  assertEquals(findOutput(result, "schedule1")!.fields.basis_disallowed_add_back, 2_000);
});

// ─── 7. Zero basis — full disallowance ───────────────────────────────────────

Deno.test("form7203 — zero stock and debt basis: entire loss disallowed", () => {
  // stock = 0, debt = 0, loss = 8_000 → disallowed = 8_000
  const result = compute({
    stock_basis_beginning: 0,
    debt_basis_beginning: 0,
    ordinary_loss: 8_000,
  });
  assertEquals(findOutput(result, "schedule1")!.fields.basis_disallowed_add_back, 8_000);
});

Deno.test("form7203 — omitted basis fields default to zero: entire loss disallowed", () => {
  // no basis provided → stock=0, debt=0, loss=3_000 → disallowed=3_000
  const result = compute({ ordinary_loss: 3_000 });
  assertEquals(findOutput(result, "schedule1")!.fields.basis_disallowed_add_back, 3_000);
});

// ─── 8. Prior year unallowed losses ──────────────────────────────────────────

Deno.test("form7203 — prior year unallowed added to current loss", () => {
  // stock = 3_000, current_loss = 1_000, prior = 4_000 → total = 5_000
  // allowed_from_stock = 3_000, remaining = 2_000, debt = 0 → disallowed = 2_000
  const result = compute({
    stock_basis_beginning: 3_000,
    ordinary_loss: 1_000,
    prior_year_unallowed_loss: 4_000,
  });
  assertEquals(findOutput(result, "schedule1")!.fields.basis_disallowed_add_back, 2_000);
});

Deno.test("form7203 — prior year unallowed only (no current loss), within basis: no output", () => {
  // stock = 5_000, prior_unallowed = 3_000 → total = 3_000, allowed = 3_000 → disallowed = 0
  const result = compute({
    stock_basis_beginning: 5_000,
    prior_year_unallowed_loss: 3_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form7203 — prior year unallowed only, exceeds basis: disallowed", () => {
  // stock = 2_000, prior_unallowed = 4_000 → disallowed = 2_000
  const result = compute({
    stock_basis_beginning: 2_000,
    prior_year_unallowed_loss: 4_000,
  });
  assertEquals(findOutput(result, "schedule1")!.fields.basis_disallowed_add_back, 2_000);
});

// ─── 9. Ordinary income increases stock basis ─────────────────────────────────

Deno.test("form7203 — ordinary income increases stock basis before loss check", () => {
  // stock = 2_000, ordinary_income = 3_000 → basis = 5_000, loss = 4_000 → disallowed = 0
  const result = compute({
    stock_basis_beginning: 2_000,
    ordinary_income: 3_000,
    ordinary_loss: 4_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── 10. Distributions reduce stock basis before loss limitation ──────────────

Deno.test("form7203 — distributions reduce stock basis before loss check", () => {
  // stock = 8_000, distributions = 6_000 → basis_after_distrib = 2_000
  // loss = 5_000, allowed = 2_000, disallowed = 3_000
  const result = compute({
    stock_basis_beginning: 8_000,
    distributions: 6_000,
    ordinary_loss: 5_000,
  });
  assertEquals(findOutput(result, "schedule1")!.fields.basis_disallowed_add_back, 3_000);
});

Deno.test("form7203 — distributions exceeding basis floored at zero, full loss disallowed", () => {
  // stock = 3_000, distributions = 5_000 → basis_after_distrib = 0, loss = 4_000 → disallowed = 4_000
  const result = compute({
    stock_basis_beginning: 3_000,
    distributions: 5_000,
    ordinary_loss: 4_000,
  });
  assertEquals(findOutput(result, "schedule1")!.fields.basis_disallowed_add_back, 4_000);
});

// ─── 11. Nondeductible expenses reduce stock basis ────────────────────────────

Deno.test("form7203 — nondeductible expenses reduce stock basis before loss check", () => {
  // stock = 6_000, nondeductible = 3_000 → basis_after_nonded = 3_000, loss = 5_000 → disallowed = 2_000
  const result = compute({
    stock_basis_beginning: 6_000,
    nondeductible_expenses: 3_000,
    ordinary_loss: 5_000,
  });
  assertEquals(findOutput(result, "schedule1")!.fields.basis_disallowed_add_back, 2_000);
});

// ─── 12. Additional contributions increase basis ──────────────────────────────

Deno.test("form7203 — contributions increase stock basis, saving loss from disallowance", () => {
  // stock = 1_000, contributions = 4_000 → basis = 5_000, loss = 4_000 → disallowed = 0
  const result = compute({
    stock_basis_beginning: 1_000,
    additional_contributions: 4_000,
    ordinary_loss: 4_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── 13. New loans increase debt basis ───────────────────────────────────────

Deno.test("form7203 — new loans increase debt basis available for losses", () => {
  // stock = 0, debt_beginning = 0, new_loans = 3_000, loss = 4_000
  // allowed_from_stock = 0, allowed_from_debt = 3_000, disallowed = 1_000
  const result = compute({
    stock_basis_beginning: 0,
    debt_basis_beginning: 0,
    new_loans: 3_000,
    ordinary_loss: 4_000,
  });
  assertEquals(findOutput(result, "schedule1")!.fields.basis_disallowed_add_back, 1_000);
});

// ─── 14. Output routing ──────────────────────────────────────────────────────

Deno.test("form7203 — disallowed loss routes to both schedule1 and agi_aggregator", () => {
  // stock = 1_000, loss = 4_000 → disallowed = 3_000; routes to 2 outputs
  const result = compute({
    stock_basis_beginning: 1_000,
    ordinary_loss: 4_000,
  });
  assertEquals(result.outputs.length, 2);
  assertEquals(findOutput(result, "schedule1")!.fields.basis_disallowed_add_back, 3_000);
  assertEquals(findOutput(result, "agi_aggregator")!.fields.basis_disallowed_add_back, 3_000);
});

Deno.test("form7203 — when no disallowance: no outputs at all", () => {
  const result = compute({
    stock_basis_beginning: 10_000,
    ordinary_loss: 2_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── 15. Tax-exempt income increases stock basis ──────────────────────────────

Deno.test("form7203 — tax_exempt_income increases stock basis before loss limitation", () => {
  // stock = 1_000, tax_exempt = 2_000 → basis = 3_000, loss = 3_000 → disallowed = 0
  const result = compute({
    stock_basis_beginning: 1_000,
    tax_exempt_income: 2_000,
    ordinary_loss: 3_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Spec scenario: stock=$5k, debt=$3k, loss=$9k ────────────────────────────

Deno.test("form7203 — spec: stock_basis=5000, debt_basis=3000, loss=9000 → deductible=8000, suspended=1000", () => {
  // allowed_from_stock = min(9000, 5000) = 5000, remaining = 4000
  // allowed_from_debt = min(4000, 3000) = 3000, disallowed = 1000
  const result = compute({
    stock_basis_beginning: 5_000,
    debt_basis_beginning: 3_000,
    ordinary_loss: 9_000,
  });
  assertEquals(findOutput(result, "schedule1")!.fields.basis_disallowed_add_back, 1_000);
});

// ─── 16. Smoke test ───────────────────────────────────────────────────────────

Deno.test("form7203 — smoke: complex scenario with all fields", () => {
  // stock = 5_000
  // + contributions = 2_000 → 7_000
  // + ordinary_income = 3_000 → 10_000
  // + tax_exempt = 1_000 → 11_000
  // - distributions = 4_000 → 7_000
  // - nondeductible = 2_000 → 5_000
  // tentative_stock_basis = 5_000
  // debt = 3_000 + new_loans = 1_000 → 4_000
  // total_basis = 5_000 + 4_000 = 9_000
  // current_loss = 6_000 + prior = 5_000 → total_pool = 11_000
  // allowed_from_stock = 5_000, remaining = 6_000
  // allowed_from_debt = 4_000, disallowed = 2_000
  const result = compute({
    stock_basis_beginning: 5_000,
    additional_contributions: 2_000,
    ordinary_income: 3_000,
    tax_exempt_income: 1_000,
    distributions: 4_000,
    nondeductible_expenses: 2_000,
    debt_basis_beginning: 3_000,
    new_loans: 1_000,
    ordinary_loss: 6_000,
    prior_year_unallowed_loss: 5_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(s1!.fields.basis_disallowed_add_back, 2_000);
});
