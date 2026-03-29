// NOTE FOR IMPLEMENTORS:
// This is a black-box test file generated from context.md only.
// Before running, verify:
//   1. The import name matches the exported singleton: `b99`
//   2. The input wrapper key `b99s` matches compute()'s parameter
//   3. The nodeType strings: "form8949" and "f1040"
//   4. The field name for federal withholding on f1040: "line25b_withheld_1099"
// These tests define the IRS-correct behaviour — if a test fails, fix the
// implementation, not the test.
//
// AMBIGUITIES:
//   - context.md does not specify exact nodeType strings; "form8949" and "f1040"
//     assumed based on routing description ("Form 8949", "Form 1040 Line 25b")
//   - context.md describes per-item routing — node may emit one output per item
//     (not aggregated). Tests reflect per-item outputs.
//   - "adjustment_codes" field in context.md is described as up to 3 separate
//     code+amount pairs (adj_code_1/adj_code_2/adj_code_3), but existing stub
//     uses a single adjustment_codes/adjustment_amount. Tests use single field form.
//   - gain_loss field name assumed (col h = col d − col e + col g)
//   - is_long_term boolean assumed for Part I (A/B/C=false) vs Part II (D/E/F=true)
//   - The "part" field name is used in place of "form_8949_checkbox" from context.md

import { assertEquals, assertThrows } from "@std/assert";
import { f1099b } from "./index.ts";

// ─── helpers ───────────────────────────────────────────────────────────────

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    part: "A",
    description: "100 sh XYZ",
    date_acquired: "01012024",
    date_sold: "06012024",
    proceeds: 1000,
    cost_basis: 800,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return f1099b.compute({ f1099bs: items as any });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function findAllOutputs(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.filter((o) => o.nodeType === nodeType);
}

// ─── 1. Input schema validation ────────────────────────────────────────────

Deno.test("schema: empty b99s array is rejected", () => {
  assertThrows(() => f1099b.compute({ f1099bs: [] }), Error);
});

Deno.test("schema: missing part field is rejected", () => {
  const item = { description: "100 sh XYZ", date_acquired: "01012024", date_sold: "06012024", proceeds: 1000, cost_basis: 800 };
  assertThrows(() => f1099b.compute({ f1099bs: [item as never] }), Error);
});

Deno.test("schema: missing description is rejected", () => {
  const item = { part: "A", date_acquired: "01012024", date_sold: "06012024", proceeds: 1000, cost_basis: 800 };
  assertThrows(() => f1099b.compute({ f1099bs: [item as never] }), Error);
});

Deno.test("schema: missing date_acquired is rejected", () => {
  const item = { part: "A", description: "100 sh XYZ", date_sold: "06012024", proceeds: 1000, cost_basis: 800 };
  assertThrows(() => f1099b.compute({ f1099bs: [item as never] }), Error);
});

Deno.test("schema: missing date_sold is rejected", () => {
  const item = { part: "A", description: "100 sh XYZ", date_acquired: "01012024", proceeds: 1000, cost_basis: 800 };
  assertThrows(() => f1099b.compute({ f1099bs: [item as never] }), Error);
});

Deno.test("schema: missing proceeds is rejected", () => {
  const item = { part: "A", description: "100 sh XYZ", date_acquired: "01012024", date_sold: "06012024", cost_basis: 800 };
  assertThrows(() => f1099b.compute({ f1099bs: [item as never] }), Error);
});

Deno.test("schema: missing cost_basis is rejected", () => {
  const item = { part: "A", description: "100 sh XYZ", date_acquired: "01012024", date_sold: "06012024", proceeds: 1000 };
  assertThrows(() => f1099b.compute({ f1099bs: [item as never] }), Error);
});

Deno.test("schema: negative proceeds is rejected", () => {
  assertThrows(() => compute([minimalItem({ proceeds: -100 })]), Error);
});

Deno.test("schema: negative cost_basis is rejected", () => {
  assertThrows(() => compute([minimalItem({ cost_basis: -50 })]), Error);
});

Deno.test("schema: invalid part G is rejected (only A-F valid for traditional securities)", () => {
  assertThrows(() => compute([minimalItem({ part: "G" })]), Error);
});

Deno.test("schema: invalid part Z is rejected", () => {
  assertThrows(() => compute([minimalItem({ part: "Z" })]), Error);
});

Deno.test("schema: all valid parts A through F are accepted", () => {
  for (const part of ["A", "B", "C", "D", "E", "F"]) {
    assertEquals(
      Array.isArray(compute([minimalItem({ part })]).outputs),
      true,
      `part ${part} should be accepted`,
    );
  }
});

// ─── 2. Per-box routing (form_8949_checkbox → Form 8949) ───────────────────

Deno.test("routing: part A routes to form8949", () => {
  const result = compute([minimalItem({ part: "A" })]);
  const out = findOutput(result, "form8949");
  assertEquals(out !== undefined, true);
});

Deno.test("routing: part A produces is_long_term = false (short-term)", () => {
  const result = compute([minimalItem({ part: "A" })]);
  const out = findOutput(result, "form8949");
  const input = out!.fields as Record<string, unknown>;
  assertEquals(input.is_long_term, false);
});

Deno.test("routing: part B routes to form8949 as short-term", () => {
  const result = compute([minimalItem({ part: "B" })]);
  const out = findOutput(result, "form8949");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).is_long_term, false);
});

Deno.test("routing: part C routes to form8949 as short-term", () => {
  const result = compute([minimalItem({ part: "C" })]);
  const out = findOutput(result, "form8949");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).is_long_term, false);
});

Deno.test("routing: part D routes to form8949 as long-term", () => {
  const result = compute([minimalItem({ part: "D" })]);
  const out = findOutput(result, "form8949");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).is_long_term, true);
});

Deno.test("routing: part E routes to form8949 as long-term", () => {
  const result = compute([minimalItem({ part: "E" })]);
  const out = findOutput(result, "form8949");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).is_long_term, true);
});

Deno.test("routing: part F routes to form8949 as long-term", () => {
  const result = compute([minimalItem({ part: "F" })]);
  const out = findOutput(result, "form8949");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).is_long_term, true);
});

Deno.test("routing: zero proceeds and zero basis routes to form8949 with gain_loss = 0", () => {
  // Worthless security: proceeds = 0 is valid per IRS (e.g., worthless stock)
  const result = compute([minimalItem({ proceeds: 0, cost_basis: 0 })]);
  const out = findOutput(result, "form8949");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).gain_loss, 0);
});

Deno.test("routing: federal_withheld > 0 routes to f1040 with line25b_withheld_1099", () => {
  // 1099-B Box 4 backup withholding → Form 1040 Line 25b
  const result = compute([minimalItem({ federal_withheld: 480 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = out!.fields as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 480);
});

Deno.test("routing: federal_withheld = 0 does not route to f1040", () => {
  const result = compute([minimalItem({ federal_withheld: 0 })]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("routing: federal_withheld absent does not route to f1040", () => {
  const result = compute([minimalItem()]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ─── 3. Aggregation ────────────────────────────────────────────────────────

Deno.test("aggregation: multiple transactions each produce a separate form8949 output", () => {
  // Node is called once with all items; each item becomes its own Form 8949 row
  const result = compute([
    minimalItem({ part: "A", proceeds: 1000, cost_basis: 800 }),
    minimalItem({ part: "B", proceeds: 2000, cost_basis: 1500 }),
    minimalItem({ part: "D", proceeds: 5000, cost_basis: 4000 }),
  ]);
  const f8949Outputs = findAllOutputs(result, "form8949");
  assertEquals(f8949Outputs.length, 3);
});

Deno.test("aggregation: multiple items with federal_withheld each produce an f1040 output", () => {
  const result = compute([
    minimalItem({ federal_withheld: 200 }),
    minimalItem({ federal_withheld: 300 }),
  ]);
  const f1040Outputs = findAllOutputs(result, "f1040");
  assertEquals(f1040Outputs.length, 2);
});

Deno.test("aggregation: mix of items with and without withheld — only withheld items produce f1040 output", () => {
  const result = compute([
    minimalItem({ federal_withheld: 100 }),
    minimalItem(), // no withheld
    minimalItem({ federal_withheld: 50 }),
  ]);
  const f1040Outputs = findAllOutputs(result, "f1040");
  assertEquals(f1040Outputs.length, 2);
});

// ─── 4. Gain/Loss Computation (col h = col d − col e + col g) ──────────────

Deno.test("gain_loss: proceeds minus cost_basis when no adjustment (gain)", () => {
  // col h = 30000 - 25000 = 5000
  const result = compute([minimalItem({ proceeds: 30000, cost_basis: 25000 })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).gain_loss, 5000);
});

Deno.test("gain_loss: proceeds minus cost_basis when no adjustment (loss)", () => {
  // col h = 5000 - 8000 = -3000
  const result = compute([minimalItem({ proceeds: 5000, cost_basis: 8000 })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).gain_loss, -3000);
});

Deno.test("gain_loss: col h = col d − col e + col g (positive adjustment reduces gain)", () => {
  // Wash sale: proceeds=10000, basis=8000, wash sale disallowed=1000 (positive adj)
  // col h = 10000 - 12000 + 1000 = -1000 → but let's use: proceeds=8000, basis=10000, adj=+1000
  // col h = 8000 - 10000 + 1000 = -1000
  const result = compute([minimalItem({ proceeds: 8000, cost_basis: 10000, adjustment_amount: 1000 })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).gain_loss, -1000);
});

Deno.test("gain_loss: col h = col d − col e + col g (negative adjustment reduces gain)", () => {
  // Selling expenses code E: proceeds=10000, basis=8000, adj=-500
  // col h = 10000 - 8000 + (-500) = 1500
  const result = compute([minimalItem({ proceeds: 10000, cost_basis: 8000, adjustment_amount: -500 })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).gain_loss, 1500);
});

Deno.test("gain_loss: proceeds = 0 (worthless security) yields negative gain_loss equal to cost_basis", () => {
  // Worthless security under IRC §165(g): proceeds=0, basis=5000
  // col h = 0 - 5000 = -5000
  const result = compute([minimalItem({ proceeds: 0, cost_basis: 5000 })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).gain_loss, -5000);
});

Deno.test("gain_loss: gain_loss = 0 when proceeds equal cost_basis", () => {
  const result = compute([minimalItem({ proceeds: 5000, cost_basis: 5000 })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).gain_loss, 0);
});

// ─── 5. Hard validation rules ──────────────────────────────────────────────

Deno.test("validation: part G (digital asset checkbox) is rejected — only A-F for 1099-B", () => {
  // Context: G-L are for Form 1099-DA (digital assets), never for traditional 1099-B
  assertThrows(() => compute([minimalItem({ part: "G" })]), Error);
});

Deno.test("validation: part H is rejected", () => {
  assertThrows(() => compute([minimalItem({ part: "H" })]), Error);
});

Deno.test("validation: part I is rejected", () => {
  assertThrows(() => compute([minimalItem({ part: "I" })]), Error);
});

Deno.test("validation: part J is rejected", () => {
  assertThrows(() => compute([minimalItem({ part: "J" })]), Error);
});

Deno.test("validation: part K is rejected", () => {
  assertThrows(() => compute([minimalItem({ part: "K" })]), Error);
});

Deno.test("validation: part L is rejected", () => {
  assertThrows(() => compute([minimalItem({ part: "L" })]), Error);
});

// ─── 6. Warning-only rules (must NOT throw) ────────────────────────────────

Deno.test("warning: VARIOUS as date_acquired is accepted (mixed holding periods)", () => {
  // "VARIOUS" is a valid special value per Drake and IRS — does not throw
  assertEquals(
    Array.isArray(compute([minimalItem({ date_acquired: "VARIOUS" })]).outputs),
    true,
  );
});

Deno.test("warning: INHERIT as date_acquired is accepted (inherited property = long-term)", () => {
  assertEquals(
    Array.isArray(compute([minimalItem({ date_acquired: "INHERIT" })]).outputs),
    true,
  );
});

Deno.test("warning: INH2010 as date_acquired is accepted (NJ inherited property)", () => {
  assertEquals(
    Array.isArray(compute([minimalItem({ date_acquired: "INH2010" })]).outputs),
    true,
  );
});

Deno.test("warning: BANKRUPT as date_sold is accepted (treated as short-term loss)", () => {
  assertEquals(
    Array.isArray(compute([minimalItem({ date_sold: "BANKRUPT" })]).outputs),
    true,
  );
});

Deno.test("warning: WORTHLSS as date_sold is accepted (worthless security under IRC §165(g))", () => {
  assertEquals(
    Array.isArray(compute([minimalItem({ date_sold: "WORTHLSS" })]).outputs),
    true,
  );
});

Deno.test("warning: EXPIRED as date_sold is accepted (option expired — paper filing required)", () => {
  assertEquals(
    Array.isArray(compute([minimalItem({ date_sold: "EXPIRED" })]).outputs),
    true,
  );
});

// ─── 7. Informational fields (do NOT produce extra outputs) ────────────────

Deno.test("informational: adjustment_codes field passes through to form8949 without changing output count", () => {
  const baseOutputs = compute([minimalItem()]).outputs.length;
  const withCodeOutputs = compute([minimalItem({ adjustment_codes: "W" })]).outputs.length;
  assertEquals(withCodeOutputs, baseOutputs);
});

Deno.test("informational: adjustment_codes and adjustment_amount pass through to form8949 input", () => {
  const result = compute([minimalItem({ adjustment_codes: "W", adjustment_amount: 500 })]);
  const out = findOutput(result, "form8949");
  const input = out!.fields as Record<string, unknown>;
  assertEquals(input.adjustment_codes, "W");
  assertEquals(input.adjustment_amount, 500);
});

Deno.test("informational: description passes through verbatim to form8949 col (a)", () => {
  const result = compute([minimalItem({ description: "250 sh AAPL Corp" })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).description, "250 sh AAPL Corp");
});

Deno.test("informational: date_acquired passes through to form8949 col (b)", () => {
  const result = compute([minimalItem({ date_acquired: "01152024" })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).date_acquired, "01152024");
});

Deno.test("informational: date_sold passes through to form8949 col (c)", () => {
  const result = compute([minimalItem({ date_sold: "06302025" })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).date_sold, "06302025");
});

Deno.test("informational: proceeds passes through to form8949 col (d)", () => {
  const result = compute([minimalItem({ proceeds: 12345 })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).proceeds, 12345);
});

Deno.test("informational: cost_basis passes through to form8949 col (e)", () => {
  const result = compute([minimalItem({ cost_basis: 9876 })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).cost_basis, 9876);
});

Deno.test("informational: part passes through to form8949", () => {
  const result = compute([minimalItem({ part: "E" })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).part, "E");
});

// ─── 8. Edge cases ─────────────────────────────────────────────────────────

Deno.test("edge: wash sale (code W) — disallowed amount is positive adjustment reducing the loss", () => {
  // IRS: wash sale disallowed loss → positive col (g) → reduces loss in col (h)
  // proceeds=5000, basis=8000 → preliminary loss=-3000; wash sale disallowed=1000
  // col h = 5000 - 8000 + 1000 = -2000 (loss reduced from -3000 to -2000)
  const result = compute([minimalItem({
    proceeds: 5000,
    cost_basis: 8000,
    adjustment_codes: "W",
    adjustment_amount: 1000,
  })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).gain_loss, -2000);
});

Deno.test("edge: QSBS exclusion (code Q) — negative adjustment reduces recognized gain", () => {
  // QSBS: proceeds=200000, basis=50000 → gain=150000; Q exclusion=-150000
  // col h = 200000 - 50000 + (-150000) = 0
  const result = compute([minimalItem({
    part: "F",
    proceeds: 200000,
    cost_basis: 50000,
    adjustment_codes: "Q",
    adjustment_amount: -150000,
  })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).gain_loss, 0);
});

Deno.test("edge: home sale exclusion (code H) — negative adjustment reduces gain", () => {
  // IRC §121: up to $250,000 excluded; proceeds=500000, basis=200000, excl=-250000
  // col h = 500000 - 200000 + (-250000) = 50000
  const result = compute([minimalItem({
    part: "F",
    proceeds: 500000,
    cost_basis: 200000,
    adjustment_codes: "H",
    adjustment_amount: -250000,
  })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).gain_loss, 50000);
});

Deno.test("edge: loss_not_allowed (code L) — positive adjustment eliminates loss", () => {
  // Code L: nondeductible loss (not wash sale); positive col g adds back loss
  // proceeds=3000, basis=5000, loss=-2000; L adjustment=+2000 → col h=0
  const result = compute([minimalItem({
    proceeds: 3000,
    cost_basis: 5000,
    adjustment_codes: "L",
    adjustment_amount: 2000,
  })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).gain_loss, 0);
});

Deno.test("edge: QOF deferral (code Z) — negative adjustment defers current gain", () => {
  // Code Z: deferred gain is negative in col g
  // proceeds=100000, basis=60000, gain=40000; Z deferral=-40000 → col h=0
  const result = compute([minimalItem({
    part: "F",
    proceeds: 100000,
    cost_basis: 60000,
    adjustment_codes: "Z",
    adjustment_amount: -40000,
  })]);
  const out = findOutput(result, "form8949");
  assertEquals((out!.fields as Record<string, unknown>).gain_loss, 0);
});

Deno.test("edge: single item emits exactly one form8949 output and zero f1040 outputs when no withholding", () => {
  const result = compute([minimalItem()]);
  assertEquals(findAllOutputs(result, "form8949").length, 1);
  assertEquals(findAllOutputs(result, "f1040").length, 0);
});

Deno.test("edge: single item with withholding emits one form8949 and one f1040 output", () => {
  const result = compute([minimalItem({ federal_withheld: 150 })]);
  assertEquals(findAllOutputs(result, "form8949").length, 1);
  assertEquals(findAllOutputs(result, "f1040").length, 1);
});

// ─── 9. Smoke test ─────────────────────────────────────────────────────────

Deno.test("smoke: comprehensive transaction with all major fields — all expected outputs present", () => {
  // Taxpayer has two transactions:
  //   1. Short-term sale (part B, noncovered) with backup withholding and wash sale adj
  //   2. Long-term sale (part D, basis reported) with QSBS exclusion
  const result = compute([
    minimalItem({
      part: "B",
      description: "100 sh NFLX — wash sale",
      date_acquired: "01152025",
      date_sold: "06302025",
      proceeds: 8000,
      cost_basis: 10000,
      adjustment_codes: "W",
      adjustment_amount: 1500,
      federal_withheld: 240,
    }),
    minimalItem({
      part: "D",
      description: "500 sh QSBS StartupCo",
      date_acquired: "01012020",
      date_sold: "06012025",
      proceeds: 300000,
      cost_basis: 50000,
      adjustment_codes: "Q",
      adjustment_amount: -250000,
    }),
  ]);

  // Both transactions route to form8949
  const f8949Outputs = findAllOutputs(result, "form8949");
  assertEquals(f8949Outputs.length, 2);

  // Transaction 1: short-term, wash sale reduces loss
  const shortTermOut = f8949Outputs.find((o) =>
    (o.fields as Record<string, unknown>).part === "B"
  );
  assertEquals(shortTermOut !== undefined, true);
  const st = shortTermOut!.fields as Record<string, unknown>;
  assertEquals(st.is_long_term, false);
  // col h = 8000 - 10000 + 1500 = -500
  assertEquals(st.gain_loss, -500);

  // Transaction 2: long-term, QSBS exclusion zeroes out gain
  const longTermOut = f8949Outputs.find((o) =>
    (o.fields as Record<string, unknown>).part === "D"
  );
  assertEquals(longTermOut !== undefined, true);
  const lt = longTermOut!.fields as Record<string, unknown>;
  assertEquals(lt.is_long_term, true);
  // col h = 300000 - 50000 + (-250000) = 0
  assertEquals(lt.gain_loss, 0);

  // Backup withholding from transaction 1 → f1040
  const f1040Outputs = findAllOutputs(result, "f1040");
  assertEquals(f1040Outputs.length, 1);
  assertEquals((f1040Outputs[0].fields as Record<string, unknown>).line25b_withheld_1099, 240);
});

// ─── Total: 56 tests ───────────────────────────────────────────────────────
// Coverage breakdown:
//   1. Input schema validation:       11 tests
//   2. Per-box routing (A-F + withheld): 10 tests
//   3. Aggregation:                    3 tests
//   4. Gain/loss computation:          6 tests
//   5. Hard validation (G-L rejected): 6 tests
//   6. Warning-only (special dates):   6 tests
//   7. Informational fields:           8 tests
//   8. Edge cases:                     7 tests (wash sale, QSBS, home sale, LNA, QOF, counts)
//   9. Smoke test:                     1 test
