import { assertEquals } from "@std/assert";
import { schedule_b, inputSchema } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return schedule_b.compute({ taxYear: 2025 }, inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Part I: Interest aggregation ────────────────────────────────────────────

Deno.test("empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("single interest entry routes taxable_interest_net to f1040 line2b", () => {
  const result = compute({ payer_name: "Big Bank", taxable_interest_net: 500 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields, { line2b_taxable_interest: 500 });
});

Deno.test("multiple interest entries (array) aggregate to line2b", () => {
  const result = compute({
    payer_name: ["Bank A", "Bank B"],
    taxable_interest_net: [300, 700],
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040?.fields as Record<string, number>).line2b_taxable_interest, 1000);
});

Deno.test("zero taxable_interest_net produces no interest in f1040 output", () => {
  const result = compute({ payer_name: "Bank A", taxable_interest_net: 0 });
  // If no dividends either, no output at all
  assertEquals(result.outputs.length, 0);
});

// ─── Part II: Dividend aggregation ───────────────────────────────────────────

Deno.test("single dividend entry routes ordinaryDividends to f1040 line3b", () => {
  const result = compute({
    payerName: "Vanguard",
    ordinaryDividends: 800,
    isNominee: false,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields, { line3b_ordinary_dividends: 800 });
});

Deno.test("multiple dividend entries (array) aggregate to line3b", () => {
  const result = compute({
    payerName: ["Fidelity", "Schwab"],
    ordinaryDividends: [600, 400],
    isNominee: [false, false],
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040?.fields as Record<string, number>).line3b_ordinary_dividends, 1000);
});

Deno.test("zero ordinaryDividends produces no dividend output", () => {
  const result = compute({
    payerName: "Vanguard",
    ordinaryDividends: 0,
    isNominee: false,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Output routing ──────────────────────────────────────────────────────────

Deno.test("interest only: f1040 output has line2b but no line3b", () => {
  const result = compute({ payer_name: "Bank", taxable_interest_net: 200 });
  const f1040 = findOutput(result, "f1040");
  const inp = f1040?.fields as Record<string, number>;
  assertEquals(inp.line2b_taxable_interest, 200);
  assertEquals(inp.line3b_ordinary_dividends, undefined);
});

Deno.test("dividends only: f1040 output has line3b but no line2b", () => {
  const result = compute({
    payerName: "Fund",
    ordinaryDividends: 1200,
    isNominee: false,
  });
  const f1040 = findOutput(result, "f1040");
  const inp = f1040?.fields as Record<string, number>;
  assertEquals(inp.line3b_ordinary_dividends, 1200);
  assertEquals(inp.line2b_taxable_interest, undefined);
});

Deno.test("both interest and dividends produce a single f1040 output with both fields", () => {
  const result = compute({
    payer_name: "Bank",
    taxable_interest_net: 400,
    payerName: "Fund",
    ordinaryDividends: 600,
    isNominee: false,
  });
  // f1040 + agi_aggregator + form8960 (interest > 0)
  assertEquals(result.outputs.length, 3);
  const f1040 = findOutput(result, "f1040");
  const inp = f1040?.fields as Record<string, number>;
  assertEquals(inp.line2b_taxable_interest, 400);
  assertEquals(inp.line3b_ordinary_dividends, 600);
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

Deno.test("ee_bond_exclusion reduces taxable interest (line 4 = line 2 - line 3)", () => {
  const result = compute({
    payer_name: "Treasury",
    taxable_interest_net: 2000,
    ee_bond_exclusion: 500,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040?.fields as Record<string, number>).line2b_taxable_interest, 1500);
});

Deno.test("ee_bond_exclusion equal to total interest → no line2b output", () => {
  const result = compute({
    payer_name: "Treasury",
    taxable_interest_net: 800,
    ee_bond_exclusion: 800,
  });
  // No interest remaining → no f1040 output if no dividends
  assertEquals(result.outputs.length, 0);
});

Deno.test("ee_bond_exclusion exceeding total interest → line2b clamped to zero, no output", () => {
  const result = compute({
    payer_name: "Treasury",
    taxable_interest_net: 300,
    ee_bond_exclusion: 500,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("mixed scalar and array interest entries normalize correctly", () => {
  // Simulate executor accumulating: first entry as scalar, then later entries as array
  const result = compute({
    payer_name: ["First Bank", "Second Bank", "Third Bank"],
    taxable_interest_net: [100, 200, 300],
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040?.fields as Record<string, number>).line2b_taxable_interest, 600);
});

Deno.test("all zeros produce empty outputs", () => {
  const result = compute({
    payer_name: "Bank",
    taxable_interest_net: 0,
    payerName: "Fund",
    ordinaryDividends: 0,
    isNominee: false,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: multiple interest + dividend payers with EE bond exclusion", () => {
  // 3 interest payers totaling $4,500; $1,000 EE bond exclusion → line2b = $3,500
  // 2 dividend payers totaling $3,200 → line3b = $3,200
  // Both exceed $1,500 threshold → Part III required (informational only)
  const result = compute({
    payer_name: ["Bank A", "Bank B", "Treasury Direct"],
    taxable_interest_net: [1000, 2500, 1000],
    ee_bond_exclusion: 1000,
    payerName: ["Vanguard Total Market", "Fidelity Index"],
    ordinaryDividends: [2000, 1200],
    isNominee: [false, false],
  });

  // f1040 + agi_aggregator + form8960 (interest > 0)
  assertEquals(result.outputs.length, 3);
  const f1040 = findOutput(result, "f1040");
  const inp = f1040?.fields as Record<string, number>;
  assertEquals(inp.line2b_taxable_interest, 3500);
  assertEquals(inp.line3b_ordinary_dividends, 3200);
});

// ─── box3_us_obligations passthrough ─────────────────────────────────────────

Deno.test("box3_us_obligations: field is accepted by schema and does not affect line2b calculation", () => {
  // box3_us_obligations is informational — used for Form 8815 exclusion context,
  // not subtracted from taxable_interest_net (that net is already computed upstream)
  const result = compute({
    payer_name: "Treasury Direct",
    taxable_interest_net: 1_000,
    box3_us_obligations: 800,
    payerName: undefined,
    ordinaryDividends: undefined,
    isNominee: undefined,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line2b_taxable_interest, 1_000);
});

// ─── $1,500 threshold aggregation behavior ────────────────────────────────────

Deno.test("threshold: 3 interest payers totaling $1,600 > $1,500 — all included in line2b", () => {
  // $600 + $800 + $200 = $1,600; all three payer amounts aggregate to line2b
  const result = compute({
    payer_name: ["Payer A", "Payer B", "Payer C"],
    taxable_interest_net: [600, 800, 200],
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line2b_taxable_interest, 1_600);
});

Deno.test("threshold: interest total exactly $1,499 — included in line2b (below threshold)", () => {
  const result = compute({
    payer_name: ["Bank A", "Bank B"],
    taxable_interest_net: [999, 500],
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line2b_taxable_interest, 1_499);
});

Deno.test("threshold: dividend total $1,600 > $1,500 — all included in line3b", () => {
  // 3 payers each with $600, $700, $300 = $1,600
  const result = compute({
    payerName: ["Fund A", "Fund B", "Fund C"],
    ordinaryDividends: [600, 700, 300],
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line3b_ordinary_dividends, 1_600);
});

Deno.test("threshold: interest $800 + dividend $900 each below $1,500 — both route to f1040", () => {
  const result = compute({
    payer_name: "Bank",
    taxable_interest_net: 800,
    payerName: "Fund",
    ordinaryDividends: 900,
  });
  const f1040 = findOutput(result, "f1040");
  const fields = f1040!.fields as Record<string, number>;
  assertEquals(fields.line2b_taxable_interest, 800);
  assertEquals(fields.line3b_ordinary_dividends, 900);
});

// ─── AGI aggregator routing ───────────────────────────────────────────────────

Deno.test("interest routes to agi_aggregator as well as f1040", () => {
  const result = compute({ payer_name: "Bank", taxable_interest_net: 1_200 });
  const agiOut = findOutput(result, "agi_aggregator");
  assertEquals((agiOut!.fields as Record<string, number>).line2b_taxable_interest, 1_200);
});

Deno.test("dividends route to agi_aggregator as well as f1040", () => {
  const result = compute({ payerName: "Fund", ordinaryDividends: 800 });
  const agiOut = findOutput(result, "agi_aggregator");
  assertEquals((agiOut!.fields as Record<string, number>).line3b_ordinary_dividends, 800);
});
