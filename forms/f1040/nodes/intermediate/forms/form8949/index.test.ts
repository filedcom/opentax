import { assertEquals, assertThrows } from "@std/assert";
import { form8949, Form8949Part } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form8949.compute({ taxYear: 2025, formType: "f1040" }, input);
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

// ─── 3. Short-term gain: exact arithmetic ────────────────────────────────────

Deno.test("short-term gain: proceeds=$10k basis=$7k adj=$0 → gain=$3k", () => {
  const result = compute({
    transaction: minimalTransaction({
      part: Form8949Part.A,
      proceeds: 10_000,
      cost_basis: 7_000,
      gain_loss: 3_000,
      is_long_term: false,
    }),
  });
  const out = findOutput(result, "schedule_d");
  const tx = out?.fields.transaction as Record<string, unknown>;
  assertEquals(tx?.proceeds, 10_000);
  assertEquals(tx?.cost_basis, 7_000);
  assertEquals(tx?.gain_loss, 3_000);
  assertEquals(tx?.is_long_term, false);
});

Deno.test("short-term gain: part A routes to schedule_d with is_long_term=false", () => {
  const result = compute({
    transaction: minimalTransaction({ part: "A", proceeds: 1000, cost_basis: 800, gain_loss: 200, is_long_term: false }),
  });
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

// ─── 4. Short-term loss: exact arithmetic ────────────────────────────────────

Deno.test("short-term loss: proceeds=$500 basis=$800 → loss=$-300", () => {
  const result = compute({
    transaction: minimalTransaction({ proceeds: 500, cost_basis: 800, gain_loss: -300, is_long_term: false }),
  });
  const out = findOutput(result, "schedule_d");
  const tx = out?.fields.transaction as Record<string, unknown>;
  assertEquals(tx?.gain_loss, -300);
  assertEquals(tx?.is_long_term, false);
});

// ─── 5. Long-term gain: exact arithmetic ─────────────────────────────────────

Deno.test("long-term gain: proceeds=$5k basis=$3k → gain=$2k routed as long-term", () => {
  const result = compute({
    transaction: minimalTransaction({
      part: Form8949Part.D,
      proceeds: 5_000,
      cost_basis: 3_000,
      gain_loss: 2_000,
      is_long_term: true,
    }),
  });
  const out = findOutput(result, "schedule_d");
  const tx = out?.fields.transaction as Record<string, unknown>;
  assertEquals(tx?.gain_loss, 2_000);
  assertEquals(tx?.is_long_term, true);
});

Deno.test("long-term loss: proceeds=$2k basis=$5k → loss=$-3k", () => {
  const result = compute({
    transaction: minimalTransaction({ part: "D", proceeds: 2000, cost_basis: 5000, gain_loss: -3000, is_long_term: true }),
  });
  const out = findOutput(result, "schedule_d");
  const tx = out?.fields.transaction as Record<string, unknown>;
  assertEquals(tx?.gain_loss, -3000);
  assertEquals(tx?.is_long_term, true);
});

// ─── 6. Wash sale adjustment ──────────────────────────────────────────────────
// Wash sale: proceeds=$500, basis=$800, loss=$-300 disallowed by code W
// adjustment_amount=$300 added back → adjusted gain_loss=$0

Deno.test("wash sale: code W with disallowed loss adjustment passes through to schedule_d", () => {
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
  // gain_loss=0: proceeds $500 - basis $800 + wash-sale-add-back $300 = $0
  assertEquals(tx?.gain_loss, 0);
  assertEquals(tx?.proceeds, 500);
  assertEquals(tx?.cost_basis, 800);
});

Deno.test("wash sale: partial disallowance — only portion added back", () => {
  // proceeds $600, basis $1000, loss $-400; only $200 disallowed → adjusted gain_loss=$-200
  const result = compute({
    transaction: minimalTransaction({
      proceeds: 600,
      cost_basis: 1_000,
      adjustment_codes: "W",
      adjustment_amount: 200,
      gain_loss: -200,
      is_long_term: false,
    }),
  });
  const out = findOutput(result, "schedule_d");
  const tx = out?.fields.transaction as Record<string, unknown>;
  assertEquals(tx?.adjustment_amount, 200);
  assertEquals(tx?.gain_loss, -200);
});

// ─── 7. Basis adjustment code B ──────────────────────────────────────────────

Deno.test("basis adjustment: code B with negative adjustment reduces gain", () => {
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

// ─── 8. Multiple transactions ─────────────────────────────────────────────────

Deno.test("multiple transactions: each routes separately to schedule_d", () => {
  const result = compute({
    transaction: [
      minimalTransaction({ part: "A", proceeds: 1000, cost_basis: 750, gain_loss: 250, is_long_term: false }),
      minimalTransaction({ part: "D", proceeds: 8000, cost_basis: 5000, gain_loss: 3000, is_long_term: true }),
    ],
  });
  const outs = findAllOutputs(result, "schedule_d");
  assertEquals(outs.length, 2);
  const stTx = outs[0].fields.transaction as Record<string, unknown>;
  const ltTx = outs[1].fields.transaction as Record<string, unknown>;
  assertEquals(stTx.gain_loss, 250);
  assertEquals(stTx.is_long_term, false);
  assertEquals(ltTx.gain_loss, 3000);
  assertEquals(ltTx.is_long_term, true);
});

Deno.test("multiple transactions: short-term loss and long-term gain computed separately", () => {
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

Deno.test("three transactions: each output carries exact proceeds/basis/gain", () => {
  const result = compute({
    transaction: [
      minimalTransaction({ part: "A", proceeds: 1000, cost_basis: 750, gain_loss: 250, is_long_term: false }),
      minimalTransaction({ part: "C", proceeds: 500, cost_basis: 600, gain_loss: -100, is_long_term: false }),
      minimalTransaction({ part: "F", proceeds: 10000, cost_basis: 6000, gain_loss: 4000, is_long_term: true }),
    ],
  });
  const outs = findAllOutputs(result, "schedule_d");
  assertEquals(outs.length, 3);
  const txs = outs.map((o) => o.fields.transaction as Record<string, unknown>);
  assertEquals(txs.find((t) => t.part === "A")?.gain_loss, 250);
  assertEquals(txs.find((t) => t.part === "C")?.gain_loss, -100);
  assertEquals(txs.find((t) => t.part === "F")?.gain_loss, 4000);
});

// ─── 9. Flat-field input ──────────────────────────────────────────────────────

Deno.test("flat fields: all transaction fields on input root route to schedule_d", () => {
  const result = compute({
    part: "D",
    description: "200 sh ABC Corp",
    date_acquired: "03152022",
    date_sold: "04202025",
    proceeds: 12000,
    cost_basis: 8000,
    gain_loss: 4000,
    is_long_term: true,
  });
  const out = findOutput(result, "schedule_d");
  const tx = out?.fields.transaction as Record<string, unknown>;
  assertEquals(tx?.proceeds, 12000);
  assertEquals(tx?.cost_basis, 8000);
  assertEquals(tx?.gain_loss, 4000);
  assertEquals(tx?.is_long_term, true);
});
