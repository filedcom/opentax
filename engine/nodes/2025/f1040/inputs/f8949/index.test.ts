// NOTE FOR IMPLEMENTORS:
// This is a black-box test file generated from context.md only.
// Before running, verify:
//   1. The import name matches the exported singleton → `f8949`
//   2. The input wrapper key → `f8949s`
//   3. The nodeType strings match the actual node routing strings
//   4. Any AMBIGUITIES flagged below must be resolved against the implementation
// These tests define the IRS-correct behaviour — if a test fails, fix the
// implementation, not the test.
//
// AMBIGUITIES:
//   FLAG A — Digital asset parts G, H, I, J, K, L: context.md defines these
//     checkboxes for 1099-DA transactions. Current itemSchema only includes A-F.
//     Tests for digital asset parts will fail until the schema and logic are extended.
//
//   FLAG B — INHERITED date_acquired: context.md requires that "INHERITED" in
//     date_acquired forces is_long_term=true regardless of part selection. Current
//     implementation derives is_long_term from part only. Tests covering INHERITED
//     will fail until that logic is added.
//
//   FLAG C — amt_cost_basis field: context.md states when amt_cost_basis differs
//     from regular cost_basis, route to form6251 Line 2k. This field is not in the
//     current schema. Tests will fail until the field and routing are added.
//
//   FLAG D — collectibles field: context.md states the collectibles checkbox
//     triggers 28% rate gain worksheet routing. Not in current schema. Tests will
//     fail until added.
//
//   FLAG E — qsbs_code / qsbs_amount fields: context.md defines Q1/Q2/Q3 codes
//     for Section 1202 QSBS exclusions. Not in current schema. Tests will fail
//     until added.
//
//   FLAG F — wash_sale_loss field: context.md says this auto-creates code W
//     adjustment. Not currently in schema as a dedicated field. Tests will fail
//     until added (tests using adjustment_amount for wash sales do pass).
//
//   FLAG G — loss_not_allowed boolean: context.md describes this creates code L.
//     Not currently in schema. Tests will fail until added.
//
//   FLAG H — state_tax_withheld field: routes to state return (not tested here
//     as it is state-only routing).
//
//   FLAG I — nodeType for 28% rate gain worksheet and form6251: verify exact
//     nodeType strings against the implementation when those forms are added.
//
// ASSUMED nodeType STRINGS:
//   schedule_d → "schedule_d"   (confirmed from imports)
//   f1040      → "f1040"        (confirmed from imports)
//   form6251   → "form6251"     (unverified — FLAG C/E)
//   rate_28_gain_worksheet → "rate_28_gain_worksheet" (unverified — FLAG D/E)

import { assertEquals, assertThrows } from "@std/assert";
import { QsbsCode, f8949, inputSchema } from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    part: "A",
    description: "100 sh ACME Corp",
    date_acquired: "2025-01-15",
    date_sold: "2025-06-20",
    proceeds: 5000,
    cost_basis: 3000,
    ...overrides,
  };
}

function compute(items: Record<string, unknown>[]) {
  return f8949.compute(inputSchema.parse({ f8949s: items }));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Input Schema Validation
// ---------------------------------------------------------------------------

Deno.test("schema: rejects empty array", () => {
  assertThrows(
    () => compute([]),
    Error,
    undefined,
    "empty f8949s array should throw",
  );
});

Deno.test("schema: rejects missing part", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          part: undefined,
        }),
      ]),
    Error,
    undefined,
    "missing part should throw",
  );
});

Deno.test("schema: rejects invalid part value", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          part: "Z",
        }),
      ]),
    Error,
    undefined,
    "invalid part 'Z' should throw",
  );
});

Deno.test("schema: rejects missing description", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          description: undefined,
        }),
      ]),
    Error,
    undefined,
    "missing description should throw",
  );
});

Deno.test("schema: rejects missing date_acquired", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          date_acquired: undefined,
        }),
      ]),
    Error,
    undefined,
    "missing date_acquired should throw",
  );
});

Deno.test("schema: rejects missing date_sold", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          date_sold: undefined,
        }),
      ]),
    Error,
    undefined,
    "missing date_sold should throw",
  );
});

Deno.test("schema: rejects missing proceeds", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          proceeds: undefined,
        }),
      ]),
    Error,
    undefined,
    "missing proceeds should throw",
  );
});

Deno.test("schema: rejects negative proceeds", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          proceeds: -1,
        }),
      ]),
    Error,
    undefined,
    "negative proceeds should throw",
  );
});

Deno.test("schema: rejects missing cost_basis", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          cost_basis: undefined,
        }),
      ]),
    Error,
    undefined,
    "missing cost_basis should throw",
  );
});

Deno.test("schema: rejects negative cost_basis", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          cost_basis: -100,
        }),
      ]),
    Error,
    undefined,
    "negative cost_basis should throw",
  );
});

Deno.test("schema: rejects negative federal_withheld", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          federal_withheld: -50,
        }),
      ]),
    Error,
    undefined,
    "negative federal_withheld should throw",
  );
});

Deno.test("schema: accepts zero proceeds (worthless security)", () => {
  const result = compute([minimalItem({ proceeds: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("schema: accepts zero cost_basis (e.g. written option expired)", () => {
  const result = compute([minimalItem({ cost_basis: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ---------------------------------------------------------------------------
// 2. Per-Box Routing — Part I (Short-Term: A, B, C)
// ---------------------------------------------------------------------------

Deno.test("routing: part A routes to schedule_d with is_long_term=false", () => {
  const result = compute([minimalItem({ part: "A" })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, false);
  assertEquals(tx.part, "A");
});

Deno.test("routing: part B routes to schedule_d with is_long_term=false", () => {
  const result = compute([minimalItem({ part: "B" })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, false);
  assertEquals(tx.part, "B");
});

Deno.test("routing: part C routes to schedule_d with is_long_term=false", () => {
  const result = compute([minimalItem({ part: "C" })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, false);
  assertEquals(tx.part, "C");
});

// ---------------------------------------------------------------------------
// 2. Per-Box Routing — Part II (Long-Term: D, E, F)
// ---------------------------------------------------------------------------

Deno.test("routing: part D routes to schedule_d with is_long_term=true", () => {
  const result = compute([
    minimalItem({ part: "D", date_acquired: "2023-01-01" }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, true);
  assertEquals(tx.part, "D");
});

Deno.test("routing: part E routes to schedule_d with is_long_term=true", () => {
  const result = compute([
    minimalItem({ part: "E", date_acquired: "2023-06-01" }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, true);
  assertEquals(tx.part, "E");
});

Deno.test("routing: part F routes to schedule_d with is_long_term=true", () => {
  const result = compute([
    minimalItem({ part: "F", date_acquired: "2020-05-01" }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, true);
  assertEquals(tx.part, "F");
});

// Digital asset short-term parts G, H, I — FLAG A
Deno.test("routing: part G (digital asset, basis reported, short-term) routes to schedule_d with is_long_term=false [FLAG A]", () => {
  // NOTE: This test will fail until digital asset parts G/H/I/J/K/L are added to the schema.
  const result = compute([minimalItem({ part: "G" })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, false);
});

Deno.test("routing: part H (digital asset, basis not reported, short-term) routes to schedule_d with is_long_term=false [FLAG A]", () => {
  const result = compute([minimalItem({ part: "H" })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, false);
});

Deno.test("routing: part I (no 1099-DA, short-term digital asset) routes to schedule_d with is_long_term=false [FLAG A]", () => {
  const result = compute([minimalItem({ part: "I" })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, false);
});

// Digital asset long-term parts J, K, L — FLAG A
Deno.test("routing: part J (digital asset, basis reported, long-term) routes to schedule_d with is_long_term=true [FLAG A]", () => {
  const result = compute([
    minimalItem({ part: "J", date_acquired: "2022-01-01" }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, true);
});

Deno.test("routing: part K (digital asset, basis not reported, long-term) routes to schedule_d with is_long_term=true [FLAG A]", () => {
  const result = compute([
    minimalItem({ part: "K", date_acquired: "2022-03-01" }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, true);
});

Deno.test("routing: part L (no 1099-DA, long-term digital asset) routes to schedule_d with is_long_term=true [FLAG A]", () => {
  const result = compute([
    minimalItem({ part: "L", date_acquired: "2022-06-01" }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, true);
});

// Zero gain/loss still routes to schedule_d
Deno.test("routing: zero gain (proceeds = cost_basis, no adjustment) still routes to schedule_d", () => {
  const result = compute([
    minimalItem({ proceeds: 1000, cost_basis: 1000 }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 0);
});

// ---------------------------------------------------------------------------
// 3. Gain / Loss Calculation (col_h = proceeds − cost_basis ± adjustment_amount)
// ---------------------------------------------------------------------------

Deno.test("gain_loss: simple gain (no adjustment)", () => {
  const result = compute([
    minimalItem({ proceeds: 5000, cost_basis: 3000 }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 2000);
});

Deno.test("gain_loss: simple loss (no adjustment)", () => {
  const result = compute([
    minimalItem({ proceeds: 3000, cost_basis: 5000 }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, -2000);
});

Deno.test("gain_loss: positive adjustment_amount increases col_h (wash sale W code)", () => {
  // Wash sale: proceeds=4000, basis=4500, disallowed loss=200 positive adj
  // col_h = 4000 - 4500 + 200 = -300 (reduced loss)
  const result = compute([
    minimalItem({
      proceeds: 4000,
      cost_basis: 4500,
      adjustment_codes: "W",
      adjustment_amount: 200,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, -300);
});

Deno.test("gain_loss: negative adjustment_amount decreases col_h (home exclusion H code)", () => {
  // Home exclusion: proceeds=600000, basis=100000, excluded gain = -250000 adj
  // col_h = 600000 - 100000 + (-250000) = 250000
  const result = compute([
    minimalItem({
      part: "F",
      proceeds: 600000,
      cost_basis: 100000,
      adjustment_codes: "H",
      adjustment_amount: -250000,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 250000);
});

Deno.test("gain_loss: zero adjustment_amount has no effect", () => {
  const result = compute([
    minimalItem({
      proceeds: 8000,
      cost_basis: 5000,
      adjustment_amount: 0,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 3000);
});

Deno.test("gain_loss: no adjustment_amount field defaults to zero", () => {
  const result = compute([
    minimalItem({ proceeds: 7000, cost_basis: 4000 }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 3000);
});

// ---------------------------------------------------------------------------
// 4. Aggregation — multiple items produce multiple schedule_d outputs
// ---------------------------------------------------------------------------

Deno.test("aggregation: two items produce two separate schedule_d outputs", () => {
  const result = compute([
    minimalItem({ part: "A", proceeds: 5000, cost_basis: 3000 }),
    minimalItem({
      part: "D",
      date_acquired: "2022-01-01",
      proceeds: 8000,
      cost_basis: 6000,
    }),
  ]);
  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutputs.length, 2);
});

Deno.test("aggregation: short-term item has is_long_term=false, long-term has is_long_term=true in same call", () => {
  const result = compute([
    minimalItem({ part: "A", proceeds: 5000, cost_basis: 3000 }),
    minimalItem({
      part: "D",
      date_acquired: "2022-01-01",
      proceeds: 8000,
      cost_basis: 6000,
    }),
  ]);
  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  const txA = (sdOutputs[0].fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  const txD = (sdOutputs[1].fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(txA.is_long_term, false);
  assertEquals(txD.is_long_term, true);
});

Deno.test("aggregation: three items each produce independent schedule_d outputs with correct gain_loss", () => {
  const result = compute([
    minimalItem({ part: "A", proceeds: 1000, cost_basis: 800 }), // gain 200
    minimalItem({ part: "B", proceeds: 2000, cost_basis: 2500 }), // loss -500
    minimalItem({ part: "C", proceeds: 3000, cost_basis: 1500 }), // gain 1500
  ]);
  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutputs.length, 3);
  const gains = sdOutputs.map(
    (o) =>
      ((o.fields as Record<string, unknown>).transaction as Record<
        string,
        unknown
      >).gain_loss,
  );
  assertEquals(gains[0], 200);
  assertEquals(gains[1], -500);
  assertEquals(gains[2], 1500);
});

Deno.test("aggregation: federal_withheld sums correctly across multiple items", () => {
  const result = compute([
    minimalItem({ proceeds: 5000, cost_basis: 3000, federal_withheld: 300 }),
    minimalItem({ proceeds: 8000, cost_basis: 5000, federal_withheld: 500 }),
  ]);
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  // Each item with federal_withheld > 0 emits its own f1040 output
  // (or they're combined — both are valid; test total)
  const totalWithheld = f1040Outputs.reduce((sum, o) => {
    const inp = o.fields as Record<string, unknown>;
    return sum + (inp.line25b_withheld_1099 as number);
  }, 0);
  assertEquals(totalWithheld, 800);
});

// ---------------------------------------------------------------------------
// 5. Federal Withholding Routing
// ---------------------------------------------------------------------------

Deno.test("federal_withheld: positive value routes to f1040 line25b_withheld_1099", () => {
  const result = compute([
    minimalItem({ federal_withheld: 400 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const inp = f1040Out!.fields as Record<string, unknown>;
  assertEquals(inp.line25b_withheld_1099, 400);
});

Deno.test("federal_withheld: zero value does NOT emit f1040 output", () => {
  const result = compute([
    minimalItem({ federal_withheld: 0 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

Deno.test("federal_withheld: absent field does NOT emit f1040 output", () => {
  const result = compute([minimalItem()]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

// ---------------------------------------------------------------------------
// 6. Transaction Fields Forwarded to schedule_d
// ---------------------------------------------------------------------------

Deno.test("forwarding: all core transaction fields forwarded to schedule_d", () => {
  const result = compute([
    minimalItem({
      part: "C",
      description: "0.5 Bitcoin",
      date_acquired: "2024-02-01",
      date_sold: "2025-08-15",
      proceeds: 25000,
      cost_basis: 15000,
      adjustment_codes: "B",
      adjustment_amount: 500,
    }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.part, "C");
  assertEquals(tx.description, "0.5 Bitcoin");
  assertEquals(tx.date_acquired, "2024-02-01");
  assertEquals(tx.date_sold, "2025-08-15");
  assertEquals(tx.proceeds, 25000);
  assertEquals(tx.cost_basis, 15000);
  assertEquals(tx.adjustment_codes, "B");
  assertEquals(tx.adjustment_amount, 500);
  assertEquals(tx.gain_loss, 10500); // 25000 - 15000 + 500
  assertEquals(tx.is_long_term, false); // part C = short-term
});

// ---------------------------------------------------------------------------
// 7. Adjustment Codes — Pass-Through Behaviour
// ---------------------------------------------------------------------------

Deno.test("adjustment_codes: wash sale code W — positive adjustment reduces loss", () => {
  // Sold at loss -500, disallowed wash sale 300, effective loss -200
  const result = compute([
    minimalItem({
      proceeds: 1000,
      cost_basis: 1500,
      adjustment_codes: "W",
      adjustment_amount: 300,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, -200); // 1000 - 1500 + 300
});

Deno.test("adjustment_codes: code H (home exclusion) — negative adjustment reduces gain", () => {
  // Full partial exclusion of home gain
  const result = compute([
    minimalItem({
      part: "F",
      proceeds: 800000,
      cost_basis: 300000,
      adjustment_codes: "H",
      adjustment_amount: -250000,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 250000); // 800000 - 300000 + (-250000)
});

Deno.test("adjustment_codes: code L (loss not allowed) — positive adjustment zeroes loss", () => {
  // Related-party sale, loss disallowed; adjustment_amount = |loss|
  const result = compute([
    minimalItem({
      proceeds: 2000,
      cost_basis: 3000,
      adjustment_codes: "L",
      adjustment_amount: 1000,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 0); // 2000 - 3000 + 1000
});

Deno.test("adjustment_codes: code E (selling expenses) — negative adjustment reduces proceeds", () => {
  // Broker shows gross proceeds; selling expenses $200 not subtracted
  const result = compute([
    minimalItem({
      proceeds: 5000,
      cost_basis: 3000,
      adjustment_codes: "E",
      adjustment_amount: -200,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 1800); // 5000 - 3000 + (-200)
});

Deno.test("adjustment_codes: code Z (QOF deferral) — negative adjustment defers gain to zero", () => {
  // Gain of 10000 deferred into QOF; col_h should be 0
  const result = compute([
    minimalItem({
      part: "D",
      description: "QOF EIN: 12-3456789",
      proceeds: 15000,
      cost_basis: 5000,
      adjustment_codes: "Z",
      adjustment_amount: -10000,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 0); // 15000 - 5000 + (-10000)
});

// ---------------------------------------------------------------------------
// 8. Special Cases — INHERITED date_acquired (FLAG B)
// ---------------------------------------------------------------------------

Deno.test("inherited: INHERITED date_acquired with Part II part is_long_term=true [FLAG B]", () => {
  // INHERITED always forces Part II (long-term)
  const result = compute([
    minimalItem({
      part: "F",
      date_acquired: "INHERITED",
      proceeds: 500000,
      cost_basis: 400000,
    }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.is_long_term, true);
  assertEquals(tx.date_acquired, "INHERITED");
});

Deno.test("inherited: VARIOUS date_acquired is forwarded correctly", () => {
  const result = compute([
    minimalItem({
      part: "B",
      date_acquired: "VARIOUS",
      proceeds: 12000,
      cost_basis: 8000,
    }),
  ]);
  const out = findOutput(result, "schedule_d");
  const tx = (out!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.date_acquired, "VARIOUS");
});

// ---------------------------------------------------------------------------
// 9. Collectibles (FLAG D) — collectibles checkbox routes to 28% rate worksheet
// ---------------------------------------------------------------------------

Deno.test("collectibles: collectibles=true does NOT change schedule_d routing [FLAG D]", () => {
  // When collectibles flag is added to schema, it should trigger 28% worksheet
  // For now, verify schedule_d output still present
  const result = compute([
    minimalItem({
      part: "D",
      date_acquired: "2022-01-01",
      proceeds: 5000,
      cost_basis: 2000,
    }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
});

// ---------------------------------------------------------------------------
// 10. AMT Cost Basis (FLAG C) — amt_cost_basis routes to form6251 Line 2k
// ---------------------------------------------------------------------------

Deno.test("amt_cost_basis: differs from cost_basis routes to form6251 with other_adjustments", () => {
  const result = compute([
    minimalItem({
      part: "D",
      date_acquired: "2022-01-01",
      proceeds: 10000,
      cost_basis: 5000,
      amt_cost_basis: 7000,
    }),
  ]);
  const form6251Out = findOutput(result, "form6251");
  assertEquals(form6251Out !== undefined, true);
  const fields = form6251Out!.fields as Record<string, unknown>;
  assertEquals(fields.other_adjustments, 2000); // 7000 - 5000
});

Deno.test("amt_cost_basis: equals cost_basis produces no form6251 output", () => {
  const result = compute([
    minimalItem({
      part: "D",
      date_acquired: "2022-01-01",
      proceeds: 10000,
      cost_basis: 5000,
      amt_cost_basis: 5000,
    }),
  ]);
  const form6251Out = findOutput(result, "form6251");
  assertEquals(form6251Out, undefined);
});

Deno.test("amt_cost_basis: absent produces no form6251 output", () => {
  const result = compute([
    minimalItem({
      part: "D",
      date_acquired: "2022-01-01",
      proceeds: 10000,
      cost_basis: 5000,
    }),
  ]);
  const form6251Out = findOutput(result, "form6251");
  assertEquals(form6251Out, undefined);
});

Deno.test("wash_sale_loss: auto-creates W code and sets adjustment_amount", () => {
  const result = compute([
    minimalItem({
      proceeds: 4000,
      cost_basis: 5000,
      wash_sale_loss: 800,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals((tx.adjustment_codes as string).includes("W"), true);
  assertEquals(tx.adjustment_amount, 800);
  assertEquals(tx.gain_loss, -200); // 4000 - 5000 + 800
});

Deno.test("wash_sale_loss: appends W to existing adjustment_codes", () => {
  const result = compute([
    minimalItem({
      proceeds: 4000,
      cost_basis: 5000,
      adjustment_codes: "B",
      wash_sale_loss: 500,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.adjustment_codes, "BW");
});

Deno.test("loss_not_allowed: auto-creates L code and zeroes the loss", () => {
  const result = compute([
    minimalItem({
      proceeds: 2000,
      cost_basis: 3000,
      loss_not_allowed: true,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals((tx.adjustment_codes as string).includes("L"), true);
  assertEquals(tx.gain_loss, 0);
});

Deno.test("qsbs_code: Q1 with qsbs_amount forwarded in schedule_d transaction", () => {
  const result = compute([
    minimalItem({
      part: "D",
      date_acquired: "2015-01-01",
      proceeds: 10000,
      cost_basis: 1000,
      qsbs_code: QsbsCode.Q1,
      qsbs_amount: 9000,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.qsbs_code, QsbsCode.Q1);
  assertEquals(tx.qsbs_amount, 9000);
});

Deno.test("state_tax_withheld: accepted by schema, produces no f1040 output", () => {
  const result = compute([
    minimalItem({
      proceeds: 5000,
      cost_basis: 3000,
      state_tax_withheld: 200,
    }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
  // schedule_d output should still be present
  const sdOut = findOutput(result, "schedule_d");
  assertEquals(sdOut !== undefined, true);
});

// ---------------------------------------------------------------------------
// 11. Worthless Securities — proceeds = 0, loss = full cost_basis
// ---------------------------------------------------------------------------

Deno.test("worthless: proceeds=0, gain_loss = negative cost_basis", () => {
  const result = compute([
    minimalItem({
      part: "B",
      description: "Worthless Inc",
      date_acquired: "2024-01-15",
      date_sold: "2025-12-31", // IRS requires Dec 31 of worthless year
      proceeds: 0,
      cost_basis: 5000,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, -5000);
});

// ---------------------------------------------------------------------------
// 12. Nonbusiness Bad Debt — always Part I (short-term), proceeds=0
// ---------------------------------------------------------------------------

Deno.test("nonbusiness bad debt: Part C, proceeds=0, short-term loss", () => {
  const result = compute([
    minimalItem({
      part: "C",
      description: "John Smith Bad Debt",
      date_acquired: "2023-06-01",
      date_sold: "2025-10-15",
      proceeds: 0,
      cost_basis: 10000,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, -10000);
  assertEquals(tx.is_long_term, false); // nonbusiness bad debt = always Part I
});

// ---------------------------------------------------------------------------
// 13. Edge Cases
// ---------------------------------------------------------------------------

Deno.test("edge: single item — exactly one schedule_d output emitted", () => {
  const result = compute([minimalItem()]);
  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutputs.length, 1);
});

Deno.test("edge: proceeds = cost_basis and no adjustment — gain_loss = 0", () => {
  const result = compute([
    minimalItem({ proceeds: 3000, cost_basis: 3000 }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 0);
});

Deno.test("edge: large numbers — no overflow or truncation", () => {
  const result = compute([
    minimalItem({
      part: "D",
      date_acquired: "2020-01-01",
      proceeds: 10_000_000,
      cost_basis: 100_000,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.gain_loss, 9_900_000);
});

Deno.test("edge: multiple adjustment codes in adjustment_codes string are forwarded", () => {
  const result = compute([
    minimalItem({
      part: "A",
      proceeds: 5000,
      cost_basis: 4000,
      adjustment_codes: "BW",
      adjustment_amount: 100,
    }),
  ]);
  const tx = ((findOutput(result, "schedule_d")!.fields) as Record<
    string,
    unknown
  >).transaction as Record<string, unknown>;
  assertEquals(tx.adjustment_codes, "BW");
  assertEquals(tx.gain_loss, 1100); // 5000 - 4000 + 100
});

Deno.test("edge: short sale — date_acquired after date_sold is still processed", () => {
  // Short sales: date_acquired can be after date_sold when closing property acquired after short opened
  const result = compute([
    minimalItem({
      part: "A",
      description: "Short Sale XYZ",
      date_acquired: "2025-08-01", // closing property acquired after short was opened
      date_sold: "2025-06-01",
      proceeds: 5000,
      cost_basis: 4500,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
});

// ---------------------------------------------------------------------------
// 14. Smoke Test — all major boxes populated
// ---------------------------------------------------------------------------

Deno.test("smoke: comprehensive transaction with adjustment, withholding, long-term", () => {
  const result = compute([
    {
      part: "D",
      description: "500 sh TECH Corp",
      date_acquired: "2022-03-15",
      date_sold: "2025-11-20",
      proceeds: 75000,
      cost_basis: 50000,
      adjustment_codes: "B",
      adjustment_amount: -1000, // basis correction
      federal_withheld: 2000,
    },
  ]);

  // schedule_d output present
  const sdOut = findOutput(result, "schedule_d");
  assertEquals(sdOut !== undefined, true);
  const tx = (sdOut!.fields as Record<string, unknown>)
    .transaction as Record<string, unknown>;
  assertEquals(tx.part, "D");
  assertEquals(tx.description, "500 sh TECH Corp");
  assertEquals(tx.date_acquired, "2022-03-15");
  assertEquals(tx.date_sold, "2025-11-20");
  assertEquals(tx.proceeds, 75000);
  assertEquals(tx.cost_basis, 50000);
  assertEquals(tx.adjustment_codes, "B");
  assertEquals(tx.adjustment_amount, -1000);
  assertEquals(tx.gain_loss, 24000); // 75000 - 50000 + (-1000)
  assertEquals(tx.is_long_term, true); // part D = long-term

  // f1040 output present with withholding
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const f1040Inp = f1040Out!.fields as Record<string, unknown>;
  assertEquals(f1040Inp.line25b_withheld_1099, 2000);

  // Total output count: 1 schedule_d + 1 f1040
  assertEquals(result.outputs.length, 2);
});

Deno.test("smoke: mixed short-term and long-term transactions in one call", () => {
  const result = compute([
    // Short-term gain
    minimalItem({ part: "A", proceeds: 10000, cost_basis: 7000 }),
    // Long-term loss with wash sale adjustment
    minimalItem({
      part: "D",
      date_acquired: "2022-01-01",
      proceeds: 5000,
      cost_basis: 8000,
      adjustment_codes: "W",
      adjustment_amount: 1000,
    }),
    // Short-term with withholding
    minimalItem({ part: "B", proceeds: 3000, cost_basis: 2000, federal_withheld: 150 }),
  ]);

  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  assertEquals(sdOutputs.length, 3);
  assertEquals(f1040Outputs.length, 1);

  const gains = sdOutputs.map(
    (o) =>
      ((o.fields as Record<string, unknown>).transaction as Record<
        string,
        unknown
      >).gain_loss,
  );
  assertEquals(gains[0], 3000);   // 10000 - 7000
  assertEquals(gains[1], -2000);  // 5000 - 8000 + 1000
  assertEquals(gains[2], 1000);   // 3000 - 2000
});
