import { assertEquals, assertThrows } from "@std/assert";
import { form8949 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form8949.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function findAllOutputs(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.filter((o) => o.nodeType === nodeType);
}

function minimalTransaction(overrides: Record<string, unknown> = {}) {
  return {
    part: "A",
    description: "100 sh XYZ",
    date_acquired: "01012024",
    date_sold: "06012024",
    proceeds: 1000,
    cost_basis: 800,
    gain_loss: 200,
    is_long_term: false,
    ...overrides,
  };
}

// ─── 1. Input schema validation ──────────────────────────────────────────────

Deno.test("schema: empty transaction array is rejected", () => {
  assertThrows(() => compute({ transaction: [] }), Error);
});

Deno.test("schema: missing required fields on transaction is rejected", () => {
  assertThrows(
    () => compute({ transaction: { part: "A", description: "XYZ" } }),
    Error,
  );
});

Deno.test("schema: invalid part value is rejected", () => {
  assertThrows(
    () => compute({ transaction: minimalTransaction({ part: "Z" }) }),
    Error,
  );
});

// ─── 2. Zero transactions — no output ────────────────────────────────────────

Deno.test("zero transactions: no transaction field returns empty outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ─── 3. Short-term gain routing ──────────────────────────────────────────────

Deno.test("short-term gain: part A routes to schedule_d with is_long_term=false", () => {
  const result = compute({ transaction: minimalTransaction({ part: "A", proceeds: 1000, cost_basis: 800, gain_loss: 200, is_long_term: false }) });
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.transaction, {
    part: "A",
    description: "100 sh XYZ",
    date_acquired: "01012024",
    date_sold: "06012024",
    proceeds: 1000,
    cost_basis: 800,
    gain_loss: 200,
    is_long_term: false,
  });
});

Deno.test("short-term gain: part B routes to schedule_d as short-term", () => {
  const result = compute({ transaction: minimalTransaction({ part: "B", is_long_term: false }) });
  const out = findOutput(result, "schedule_d");
  assertEquals((out?.fields.transaction as Record<string, unknown>)?.is_long_term, false);
});

Deno.test("short-term gain: part C routes to schedule_d as short-term", () => {
  const result = compute({ transaction: minimalTransaction({ part: "C", is_long_term: false }) });
  const out = findOutput(result, "schedule_d");
  assertEquals((out?.fields.transaction as Record<string, unknown>)?.is_long_term, false);
});

// ─── 4. Short-term loss routing ──────────────────────────────────────────────

Deno.test("short-term loss: negative gain_loss routes to schedule_d", () => {
  const result = compute({
    transaction: minimalTransaction({ proceeds: 500, cost_basis: 800, gain_loss: -300, is_long_term: false }),
  });
  const out = findOutput(result, "schedule_d");
  assertEquals((out?.fields.transaction as Record<string, unknown>)?.gain_loss, -300);
});

// ─── 5. Long-term gain routing ───────────────────────────────────────────────

Deno.test("long-term gain: part D routes to schedule_d with is_long_term=true", () => {
  const result = compute({
    transaction: minimalTransaction({ part: "D", proceeds: 5000, cost_basis: 3000, gain_loss: 2000, is_long_term: true }),
  });
  const out = findOutput(result, "schedule_d");
  assertEquals((out?.fields.transaction as Record<string, unknown>)?.is_long_term, true);
  assertEquals((out?.fields.transaction as Record<string, unknown>)?.gain_loss, 2000);
});

Deno.test("long-term gain: part E routes to schedule_d as long-term", () => {
  const result = compute({ transaction: minimalTransaction({ part: "E", is_long_term: true }) });
  const out = findOutput(result, "schedule_d");
  assertEquals((out?.fields.transaction as Record<string, unknown>)?.is_long_term, true);
});

Deno.test("long-term gain: part F routes to schedule_d as long-term", () => {
  const result = compute({ transaction: minimalTransaction({ part: "F", is_long_term: true }) });
  const out = findOutput(result, "schedule_d");
  assertEquals((out?.fields.transaction as Record<string, unknown>)?.is_long_term, true);
});

// ─── 6. Long-term loss routing ───────────────────────────────────────────────

Deno.test("long-term loss: negative gain_loss routes to schedule_d as long-term loss", () => {
  const result = compute({
    transaction: minimalTransaction({ part: "D", proceeds: 2000, cost_basis: 5000, gain_loss: -3000, is_long_term: true }),
  });
  const out = findOutput(result, "schedule_d");
  assertEquals((out?.fields.transaction as Record<string, unknown>)?.gain_loss, -3000);
  assertEquals((out?.fields.transaction as Record<string, unknown>)?.is_long_term, true);
});

// ─── 7. Wash sale adjustment code W ──────────────────────────────────────────

Deno.test("wash sale: adjustment_codes W passes through to schedule_d", () => {
  const result = compute({
    transaction: minimalTransaction({
      proceeds: 500,
      cost_basis: 800,
      adjustment_codes: "W",
      adjustment_amount: 300,
      gain_loss: 0,
      is_long_term: false,
    }),
  });
  const out = findOutput(result, "schedule_d");
  const tx = out?.fields.transaction as Record<string, unknown>;
  assertEquals(tx?.adjustment_codes, "W");
  assertEquals(tx?.adjustment_amount, 300);
  assertEquals(tx?.gain_loss, 0);
});

// ─── 8. Basis adjustment ─────────────────────────────────────────────────────

Deno.test("basis adjustment: adjustment_codes B passes through with corrected gain_loss", () => {
  const result = compute({
    transaction: minimalTransaction({
      proceeds: 1000,
      cost_basis: 600,
      adjustment_codes: "B",
      adjustment_amount: -100,
      gain_loss: 300,
      is_long_term: false,
    }),
  });
  const out = findOutput(result, "schedule_d");
  const tx = out?.fields.transaction as Record<string, unknown>;
  assertEquals(tx?.adjustment_codes, "B");
  assertEquals(tx?.gain_loss, 300);
});

// ─── 9. Mixed short/long-term (array accumulation) ───────────────────────────

Deno.test("mixed: array of transactions routes each to schedule_d", () => {
  const result = compute({
    transaction: [
      minimalTransaction({ part: "A", gain_loss: 200, is_long_term: false }),
      minimalTransaction({ part: "D", gain_loss: 1500, is_long_term: true }),
    ],
  });
  const outs = findAllOutputs(result, "schedule_d");
  assertEquals(outs.length, 2);
  const stTx = (outs[0].fields.transaction as Record<string, unknown>);
  const ltTx = (outs[1].fields.transaction as Record<string, unknown>);
  assertEquals(stTx.is_long_term, false);
  assertEquals(ltTx.is_long_term, true);
});

Deno.test("mixed: short-term loss and long-term gain both route correctly", () => {
  const result = compute({
    transaction: [
      minimalTransaction({ part: "B", proceeds: 300, cost_basis: 500, gain_loss: -200, is_long_term: false }),
      minimalTransaction({ part: "E", proceeds: 8000, cost_basis: 4000, gain_loss: 4000, is_long_term: true }),
    ],
  });
  const outs = findAllOutputs(result, "schedule_d");
  assertEquals(outs.length, 2);
  const txs = outs.map((o) => o.fields.transaction as Record<string, unknown>);
  const stTx = txs.find((t) => t.is_long_term === false)!;
  const ltTx = txs.find((t) => t.is_long_term === true)!;
  assertEquals(stTx.gain_loss, -200);
  assertEquals(ltTx.gain_loss, 4000);
});

// ─── 10. Smoke test: multiple transactions ───────────────────────────────────

Deno.test("smoke test: three transactions route to three schedule_d outputs", () => {
  const result = compute({
    transaction: [
      minimalTransaction({ part: "A", proceeds: 1000, cost_basis: 750, gain_loss: 250, is_long_term: false }),
      minimalTransaction({ part: "C", proceeds: 500, cost_basis: 600, gain_loss: -100, is_long_term: false }),
      minimalTransaction({ part: "F", proceeds: 10000, cost_basis: 6000, gain_loss: 4000, is_long_term: true }),
    ],
  });
  const outs = findAllOutputs(result, "schedule_d");
  assertEquals(outs.length, 3);
});

Deno.test("smoke test: single transaction preserves all fields in schedule_d output", () => {
  const tx = {
    part: "D",
    description: "200 sh ABC Corp",
    date_acquired: "03152022",
    date_sold: "04202025",
    proceeds: 12000,
    cost_basis: 8000,
    adjustment_codes: "W",
    adjustment_amount: 500,
    gain_loss: 4500,
    is_long_term: true,
  };
  const result = compute({ transaction: tx });
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.transaction, tx);
});
