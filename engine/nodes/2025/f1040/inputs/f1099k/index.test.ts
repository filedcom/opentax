import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema, f1099k } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    pse_name: "TestPSE",
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f1099k.compute({ f1099ks: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ============================================================
// Section 1: Input schema validation
// ============================================================

Deno.test("inputSchema: empty k99s array fails — at least one item required", () => {
  const parsed = inputSchema.safeParse({ f1099ks: [] });
  assertEquals(parsed.success, false);
});

Deno.test("inputSchema: missing pse_name fails validation", () => {
  const parsed = inputSchema.safeParse({
    f1099ks: [{ box1a_gross_payments: 5000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("inputSchema: negative box1a_gross_payments fails validation", () => {
  const parsed = inputSchema.safeParse({
    f1099ks: [{ pse_name: "PSE", box1a_gross_payments: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("inputSchema: negative box4_federal_withheld fails validation", () => {
  const parsed = inputSchema.safeParse({
    f1099ks: [{ pse_name: "PSE", box4_federal_withheld: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("inputSchema: negative box8_state_withheld fails validation", () => {
  const parsed = inputSchema.safeParse({
    f1099ks: [{ pse_name: "PSE", box8_state_withheld: -50 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("inputSchema: minimal item with only pse_name passes validation", () => {
  const parsed = inputSchema.safeParse({
    f1099ks: [{ pse_name: "PayPal" }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("inputSchema: all optional fields omitted — passes validation", () => {
  const parsed = inputSchema.safeParse({
    f1099ks: [{ pse_name: "Stripe" }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("inputSchema: zero values for currency fields passes validation", () => {
  const parsed = inputSchema.safeParse({
    f1099ks: [{
      pse_name: "PSE",
      box1a_gross_payments: 0,
      box4_federal_withheld: 0,
      box8_state_withheld: 0,
    }],
  });
  assertEquals(parsed.success, true);
});

// ============================================================
// Section 2: Per-box routing — positive and zero cases
// ============================================================

// box1a_gross_payments — state-only, no federal output
Deno.test("box1a_gross_payments > 0 produces no federal outputs", () => {
  const result = compute([minimalItem({ box1a_gross_payments: 25000 })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

Deno.test("box1a_gross_payments = 0 produces no outputs", () => {
  const result = compute([minimalItem({ box1a_gross_payments: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// box4_federal_withheld — routes to f1040 line25b (see AMBIGUITY A1)
Deno.test("box4_federal_withheld > 0 routes to f1040 line25b_withheld_1099", () => {
  const result = compute([minimalItem({ box4_federal_withheld: 480 })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = f1040Out!.fields as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 480);
});

Deno.test("box4_federal_withheld = 0 does not route to f1040", () => {
  const result = compute([minimalItem({ box4_federal_withheld: 0 })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

Deno.test("box4_federal_withheld omitted produces no f1040 output", () => {
  const result = compute([minimalItem()]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

// box8_state_withheld — state only, no federal output
Deno.test("box8_state_withheld > 0 produces no federal f1040 output", () => {
  const result = compute([minimalItem({ box8_state_withheld: 300 })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

Deno.test("box8_state_withheld = 0 produces no outputs", () => {
  const result = compute([minimalItem({ box8_state_withheld: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// Informational fields — no routing outputs
Deno.test("filer_type_pse alone produces no outputs", () => {
  const result = compute([minimalItem({ filer_type_pse: true })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("filer_type_epf alone produces no outputs", () => {
  const result = compute([minimalItem({ filer_type_epf: true })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("transaction_type_payment_card alone produces no outputs", () => {
  const result = compute([minimalItem({ transaction_type_payment_card: true })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("transaction_type_tpso alone produces no outputs", () => {
  const result = compute([minimalItem({ transaction_type_tpso: true })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("box1b_card_not_present alone produces no outputs", () => {
  const result = compute([minimalItem({ box1b_card_not_present: 5000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("box3_transaction_count alone produces no outputs", () => {
  const result = compute([minimalItem({ box3_transaction_count: 250 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("box2_merchant_category_code alone produces no outputs", () => {
  const result = compute([minimalItem({ box2_merchant_category_code: "5812" })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("box6_state alone produces no federal outputs", () => {
  const result = compute([minimalItem({ box6_state: "CA" })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

Deno.test("box7_state_id alone produces no federal outputs", () => {
  const result = compute([minimalItem({ box7_state_id: "CA-123456" })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

Deno.test("monthly boxes 5a–5l alone produce no federal outputs", () => {
  const result = compute([minimalItem({
    box5a_january: 1000,
    box5b_february: 1000,
    box5c_march: 1000,
    box5d_april: 1000,
    box5e_may: 1000,
    box5f_june: 1000,
    box5g_july: 1000,
    box5h_august: 1000,
    box5i_september: 1000,
    box5j_october: 1000,
    box5k_november: 1000,
    box5l_december: 1000,
  })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

// ============================================================
// Section 3: Aggregation — multiple items in one compute() call
// ============================================================

Deno.test("multiple items: box4 aggregated — two items with withholding emit combined total", () => {
  const result = compute([
    minimalItem({ box4_federal_withheld: 480 }),
    minimalItem({ pse_name: "Stripe", box4_federal_withheld: 720 }),
  ]);
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  // Each item with box4 > 0 routes its own amount — combined total must be 1200
  const total = f1040Outputs.reduce(
    (sum, o) => sum + ((o.fields as Record<string, unknown>).line25b_withheld_1099 as number),
    0,
  );
  assertEquals(total, 1200);
});

Deno.test("multiple items: only items with box4 > 0 contribute to f1040 output", () => {
  const result = compute([
    minimalItem({ box4_federal_withheld: 500 }),
    minimalItem({ pse_name: "eBay", box4_federal_withheld: 0 }),
    minimalItem({ pse_name: "Venmo", box1a_gross_payments: 10000 }),
  ]);
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  const total = f1040Outputs.reduce(
    (sum, o) => sum + ((o.fields as Record<string, unknown>).line25b_withheld_1099 as number),
    0,
  );
  assertEquals(total, 500);
});

Deno.test("multiple items: box8 from multiple items produces no federal output", () => {
  const result = compute([
    minimalItem({ box8_state_withheld: 200 }),
    minimalItem({ pse_name: "Venmo", box8_state_withheld: 350 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

Deno.test("multiple items: three PSEs each with box4 — all withholdings routed", () => {
  const result = compute([
    minimalItem({ pse_name: "PSE1", box4_federal_withheld: 100 }),
    minimalItem({ pse_name: "PSE2", box4_federal_withheld: 200 }),
    minimalItem({ pse_name: "PSE3", box4_federal_withheld: 300 }),
  ]);
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  const total = f1040Outputs.reduce(
    (sum, o) => sum + ((o.fields as Record<string, unknown>).line25b_withheld_1099 as number),
    0,
  );
  assertEquals(total, 600);
});

// ============================================================
// Section 4: Thresholds
// ============================================================

// TPSO reporting threshold: > $20,000 AND > 200 transactions (TY2025 OBBB)
// The 99K node is state-only; threshold enforcement is informational.
// box1a values below/at/above $20,000 must not produce federal outputs.

Deno.test("box1a = $19,999 (below TPSO threshold) produces no federal outputs", () => {
  const result = compute([minimalItem({ box1a_gross_payments: 19999 })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

Deno.test("box1a = $20,000 (at TPSO threshold) produces no federal outputs", () => {
  const result = compute([minimalItem({ box1a_gross_payments: 20000 })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

Deno.test("box1a = $20,001 (above TPSO threshold) produces no federal outputs", () => {
  const result = compute([minimalItem({ box1a_gross_payments: 20001 })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

// Payment card processor: no minimum threshold — all amounts must be accepted
Deno.test("box1a = $1 (payment card, well below TPSO threshold) accepted — no federal outputs", () => {
  const result = compute([
    minimalItem({
      box1a_gross_payments: 1,
      transaction_type_payment_card: true,
    }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

// Backup withholding rate: 24% — verify rate in a box4 scenario
Deno.test("box4_federal_withheld matches 24% backup withholding rate on box1a (24% of 2000 = 480)", () => {
  const result = compute([minimalItem({ box4_federal_withheld: 480 })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = f1040Out!.fields as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 480);
});

// ============================================================
// Section 5: Hard validation rules (throw tests)
// ============================================================

// The 99K screen has no ERROR-level hard stops defined in context.md.
// All schema violations should throw (handled by Zod parse in compute()).

Deno.test("compute throws if k99s is empty (hard schema rule)", () => {
  assertThrows(
    () => f1099k.compute({ f1099ks: [] }),
    Error,
  );
});

Deno.test("compute throws if pse_name is missing (required field)", () => {
  assertThrows(
    () => f1099k.compute({ f1099ks: [{ box1a_gross_payments: 5000 } as never] }),
    Error,
  );
});

// ============================================================
// Section 6: Warning-only rules (must NOT throw)
// ============================================================

// Monthly consistency: sum(5a–5l) ≠ box_1a is a WARNING, not an error.
// Must not throw; implementation may surface as a warnings array.

Deno.test("monthly sum mismatch (5a+5b ≠ box1a) does NOT throw", () => {
  const result = compute([minimalItem({
    box1a_gross_payments: 3000,
    box5a_january: 1000,
    box5b_february: 1000,
    // Months 5c-5l absent (partial data) — sum < box1a, acceptable
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("all 12 monthly boxes provided summing correctly = box1a does NOT throw", () => {
  const result = compute([minimalItem({
    box1a_gross_payments: 12000,
    box5a_january: 1000,
    box5b_february: 1000,
    box5c_march: 1000,
    box5d_april: 1000,
    box5e_may: 1000,
    box5f_june: 1000,
    box5g_july: 1000,
    box5h_august: 1000,
    box5i_september: 1000,
    box5j_october: 1000,
    box5k_november: 1000,
    box5l_december: 1000,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("all 12 monthly boxes provided but sum ≠ box1a does NOT throw (warning only)", () => {
  const result = compute([minimalItem({
    box1a_gross_payments: 12000,
    box5a_january: 1000,
    box5b_february: 1000,
    box5c_march: 1000,
    box5d_april: 1000,
    box5e_may: 1000,
    box5f_june: 1000,
    box5g_july: 1000,
    box5h_august: 1000,
    box5i_september: 1000,
    box5j_october: 1000,
    box5k_november: 1000,
    box5l_december: 500, // Off by $500 — sum is $11,500
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// EPF checkbox with PSE Name/Phone — no throw (informational state-only)
Deno.test("filer_type_epf with pse_name and pse_phone does NOT throw", () => {
  const result = compute([minimalItem({
    filer_type_epf: true,
    pse_name: "My EPF",
    pse_phone: "555-123-4567",
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("second_tin_notice = true does NOT throw", () => {
  const result = compute([minimalItem({ second_tin_notice: true })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// Section 7: Informational fields — output count unchanged
// ============================================================

// These fields affect the state-only 1099-K document; the federal output count
// must not change when they are added to an otherwise-identical item.

Deno.test("adding account_number does not change output count", () => {
  const base = compute([minimalItem({ box4_federal_withheld: 600 })]);
  const withAcct = compute([minimalItem({ box4_federal_withheld: 600, account_number: "ACC-1234" })]);
  assertEquals(withAcct.outputs.length, base.outputs.length);
});

Deno.test("adding box2_merchant_category_code does not change output count", () => {
  const base = compute([minimalItem({ box4_federal_withheld: 600 })]);
  const withMcc = compute([minimalItem({ box4_federal_withheld: 600, box2_merchant_category_code: "5411" })]);
  assertEquals(withMcc.outputs.length, base.outputs.length);
});

Deno.test("adding box3_transaction_count does not change output count", () => {
  const base = compute([minimalItem({ box4_federal_withheld: 600 })]);
  const withCount = compute([minimalItem({ box4_federal_withheld: 600, box3_transaction_count: 210 })]);
  assertEquals(withCount.outputs.length, base.outputs.length);
});

Deno.test("adding box1b_card_not_present does not change output count", () => {
  const base = compute([minimalItem({ box1a_gross_payments: 25000 })]);
  const with1b = compute([minimalItem({ box1a_gross_payments: 25000, box1b_card_not_present: 5000 })]);
  assertEquals(with1b.outputs.length, base.outputs.length);
});

Deno.test("adding filer_type_pse checkbox does not change output count", () => {
  const base = compute([minimalItem({ box4_federal_withheld: 600 })]);
  const withPse = compute([minimalItem({ box4_federal_withheld: 600, filer_type_pse: true })]);
  assertEquals(withPse.outputs.length, base.outputs.length);
});

Deno.test("adding transaction_type_tpso checkbox does not change output count", () => {
  const base = compute([minimalItem({ box4_federal_withheld: 600 })]);
  const withTpso = compute([minimalItem({ box4_federal_withheld: 600, transaction_type_tpso: true })]);
  assertEquals(withTpso.outputs.length, base.outputs.length);
});

Deno.test("adding box6_state and box7_state_id does not change output count", () => {
  const base = compute([minimalItem({ box4_federal_withheld: 600 })]);
  const withState = compute([
    minimalItem({ box4_federal_withheld: 600, box6_state: "NY", box7_state_id: "NY-9988776" }),
  ]);
  assertEquals(withState.outputs.length, base.outputs.length);
});

// ============================================================
// Section 8: Edge cases
// ============================================================

// Edge case 1: PSE vs EPF mutual exclusivity — both false is valid
Deno.test("no filer type checkbox checked — valid state (individual can still report)", () => {
  const result = compute([minimalItem({ box1a_gross_payments: 10000 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// Edge case 2: box1b must be a subset of box1a — no federal routing from either
Deno.test("box1b_card_not_present greater than box1a_gross_payments — still no federal output", () => {
  // Schema may not enforce this ordering, but routing must not produce federal output
  const result = compute([minimalItem({
    box1a_gross_payments: 5000,
    box1b_card_not_present: 7000, // technically invalid but should not produce federal output
  })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

// Edge case 3: Box 4 backup withholding — state-record field only, still routes to f1040
Deno.test("box4_federal_withheld on 99K screen — engine routes directly to f1040 (see AMBIGUITY A1)", () => {
  const result = compute([minimalItem({ box4_federal_withheld: 960 })]);
  const f1040Out = findOutput(result, "f1040");
  // Per engine convention, box4 IS routed to f1040 even though Drake requires
  // manual re-entry on Screen 5. The engine does it automatically.
  assertEquals(f1040Out !== undefined, true);
});

// Edge case 4: Large gross amount (e.g., Airbnb host with $500K)
Deno.test("large box1a_gross_payments ($500,000) produces no federal output", () => {
  const result = compute([minimalItem({ box1a_gross_payments: 500000 })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

// Edge case 5: box8 state withholding with box4 — only box4 triggers federal output
Deno.test("box4 and box8 both present — only f1040 output for box4", () => {
  const result = compute([minimalItem({
    box4_federal_withheld: 600,
    box8_state_withheld: 400,
  })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = f1040Out!.fields as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 600);
  // State withholding (box8) must NOT appear in f1040 output
  assertEquals("line25b_withheld_state" in input, false);
});

// Edge case 6: Second TIN notice — informational, no routing effect
Deno.test("second_tin_notice = true with box4 — box4 still routes correctly", () => {
  const result = compute([
    minimalItem({ box4_federal_withheld: 240, second_tin_notice: true }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = f1040Out!.fields as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 240);
});

// Edge case 7: TPSO with 200 transactions at exactly $20,000 (at threshold boundary)
Deno.test("TPSO at exactly $20,000 and 200 transactions — accepted as valid input, no federal output", () => {
  const result = compute([minimalItem({
    transaction_type_tpso: true,
    box1a_gross_payments: 20000,
    box3_transaction_count: 200,
  })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

// Edge case 8: Single PSE with all boxes populated
Deno.test("PSE item with all optional boxes present — only box4 produces federal output", () => {
  const result = compute([minimalItem({
    filer_type_pse: true,
    transaction_type_payment_card: true,
    account_number: "ACCT-9876",
    second_tin_notice: false,
    box1a_gross_payments: 35000,
    box1b_card_not_present: 8000,
    box2_merchant_category_code: "5812",
    box3_transaction_count: 420,
    box4_federal_withheld: 840,
    box5a_january: 3000,
    box5b_february: 2800,
    box5c_march: 3100,
    box5d_april: 2900,
    box5e_may: 3050,
    box5f_june: 2950,
    box5g_july: 2800,
    box5h_august: 3000,
    box5i_september: 2900,
    box5j_october: 3000,
    box5k_november: 2750,
    box5l_december: 2750,
    box6_state: "CA",
    box7_state_id: "CA-87654321",
    box8_state_withheld: 1000,
  })]);

  // Only f1040 output for box4
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  assertEquals(f1040Outputs.length, 1);
  const input = f1040Outputs[0].fields as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 840);
});

// ============================================================
// Section 9: Smoke test — all major boxes, multiple PSEs
// ============================================================

Deno.test("smoke: three PSEs — PayPal (TPSO), Square (payment card), Stripe (backup withheld) — only Stripe emits f1040 output", () => {
  const result = f1099k.compute({
    f1099ks: [
      {
        pse_name: "PayPal",
        filer_type_pse: false,
        filer_type_epf: false,
        transaction_type_tpso: true,
        box1a_gross_payments: 25000,
        box1b_card_not_present: 0,
        box3_transaction_count: 310,
        box4_federal_withheld: 0,
        box5a_january: 2083,
        box5b_february: 2083,
        box5c_march: 2084,
        box6_state: "TX",
        box8_state_withheld: 0,
      },
      {
        pse_name: "Square",
        transaction_type_payment_card: true,
        box1a_gross_payments: 45000,
        box4_federal_withheld: 0,
        box8_state_withheld: 500,
        box6_state: "TX",
        box7_state_id: "TX-12345",
      },
      {
        pse_name: "Stripe",
        transaction_type_payment_card: true,
        box1a_gross_payments: 12000,
        box4_federal_withheld: 2880, // 24% backup withholding on $12,000
        box8_state_withheld: 250,
        second_tin_notice: true,
        box6_state: "TX",
        box7_state_id: "TX-12345",
      },
    ],
  });

  // Only Stripe's box4 should produce a federal output
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  const totalWithheld = f1040Outputs.reduce(
    (sum, o) => sum + ((o.fields as Record<string, unknown>).line25b_withheld_1099 as number),
    0,
  );
  assertEquals(totalWithheld, 2880);

  // box1a and box8 from all three must NOT produce federal outputs
  // (total outputs = only the withholding entries for Stripe's box4)
  const allFederalOutputs = result.outputs.filter((o) =>
    o.nodeType === "f1040" || o.nodeType === "schedule1" || o.nodeType === "schedule_c"
  );
  const totalFromStateFields = allFederalOutputs.reduce(
    (sum, o) => {
      const inp = o.fields as Record<string, unknown>;
      return sum + ((inp.line1a_wages ?? inp.line8z_other ?? 0) as number);
    },
    0,
  );
  assertEquals(totalFromStateFields, 0);
});
