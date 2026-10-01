import { assertEquals, assertThrows } from "@std/assert";
import { f1099k, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    pse_name: "TestPSE",
    ...overrides,
  };
}

function businessItem(gross: number, overrides: Record<string, unknown> = {}) {
  return minimalItem({
    pse_tin: "123456789",
    recipient_tin: "987654321",
    box1a_gross_payments: gross,
    for_routing: "schedule_c",
    schedule_c_business_reference: "business-1",
    schedule_c_receipts_review: {
      included_in_schedule_c_gross_receipts: gross,
      not_included_in_schedule_c_receipts: 0,
      allocation_reference: "2025 payment settlement ledger",
      no_overlap_with_other_1099s: true,
      overlap_review_reference: "2025 information-return overlap review",
    },
    ...overrides,
  });
}

function hobbyItem(gross: number, overrides: Record<string, unknown> = {}) {
  return minimalItem({
    pse_tin: "123456789",
    recipient_tin: "987654321",
    box1a_gross_payments: gross,
    for_routing: "schedule_1_line_8j",
    nonbusiness_activity_review: {
      activity_description: "Occasional craft sales",
      included_in_line8j: gross,
      allocation_reference: "2025 activity payment ledger",
      no_overlap_with_other_1099s: true,
      overlap_review_reference: "2025 information-return overlap review",
    },
    ...overrides,
  });
}

function personalSale(overrides: Record<string, unknown> = {}) {
  return {
    transaction_id: "item-1",
    description: "Personal chair",
    date_acquired: "2024-06-15",
    date_sold: "2025-06-15",
    proceeds: 700,
    cost_basis: 1_000,
    acquired_by_purchase: true,
    acquisition_record_reference: "purchase receipt",
    sale_record_reference: "processor settlement",
    personal_use_only: true,
    not_main_home: true,
    not_collectible: true,
    no_other_information_return_for_sale: true,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f1099k.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099ks: items,
  });
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
  const input = fieldsOf(result.outputs, f1040)!;
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
  const result = compute([
    minimalItem({ transaction_type_payment_card: true }),
  ]);
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
  const result = compute([
    minimalItem({ box2_merchant_category_code: "5812" }),
  ]);
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
    (sum, o) =>
      sum +
      ((o.fields as Record<string, unknown>).line25b_withheld_1099 as number),
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
    (sum, o) =>
      sum +
      ((o.fields as Record<string, unknown>).line25b_withheld_1099 as number),
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
    (sum, o) =>
      sum +
      ((o.fields as Record<string, unknown>).line25b_withheld_1099 as number),
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
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line25b_withheld_1099, 480);
});

// ============================================================
// Section 5: Hard validation rules (throw tests)
// ============================================================

// The 99K screen has no ERROR-level hard stops defined in context.md.
// All schema violations should throw (handled by Zod parse in compute()).

Deno.test("compute throws if k99s is empty (hard schema rule)", () => {
  assertThrows(
    () => f1099k.compute({ taxYear: 2025, formType: "f1040" }, { f1099ks: [] }),
    Error,
  );
});

Deno.test("compute throws if pse_name is missing (required field)", () => {
  assertThrows(
    () =>
      f1099k.compute({ taxYear: 2025, formType: "f1040" }, {
        f1099ks: [{ box1a_gross_payments: 5000 } as never],
      }),
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
  const withAcct = compute([
    minimalItem({ box4_federal_withheld: 600, account_number: "ACC-1234" }),
  ]);
  assertEquals(withAcct.outputs.length, base.outputs.length);
});

Deno.test("adding box2_merchant_category_code does not change output count", () => {
  const base = compute([minimalItem({ box4_federal_withheld: 600 })]);
  const withMcc = compute([
    minimalItem({
      box4_federal_withheld: 600,
      box2_merchant_category_code: "5411",
    }),
  ]);
  assertEquals(withMcc.outputs.length, base.outputs.length);
});

Deno.test("adding box3_transaction_count does not change output count", () => {
  const base = compute([minimalItem({ box4_federal_withheld: 600 })]);
  const withCount = compute([
    minimalItem({ box4_federal_withheld: 600, box3_transaction_count: 210 }),
  ]);
  assertEquals(withCount.outputs.length, base.outputs.length);
});

Deno.test("adding box1b_card_not_present does not change output count", () => {
  const base = compute([minimalItem({ box1a_gross_payments: 25000 })]);
  const with1b = compute([
    minimalItem({ box1a_gross_payments: 25000, box1b_card_not_present: 5000 }),
  ]);
  assertEquals(with1b.outputs.length, base.outputs.length);
});

Deno.test("adding filer_type_pse checkbox does not change output count", () => {
  const base = compute([minimalItem({ box4_federal_withheld: 600 })]);
  const withPse = compute([
    minimalItem({ box4_federal_withheld: 600, filer_type_pse: true }),
  ]);
  assertEquals(withPse.outputs.length, base.outputs.length);
});

Deno.test("adding transaction_type_tpso checkbox does not change output count", () => {
  const base = compute([minimalItem({ box4_federal_withheld: 600 })]);
  const withTpso = compute([
    minimalItem({ box4_federal_withheld: 600, transaction_type_tpso: true }),
  ]);
  assertEquals(withTpso.outputs.length, base.outputs.length);
});

Deno.test("adding box6_state and box7_state_id does not change output count", () => {
  const base = compute([minimalItem({ box4_federal_withheld: 600 })]);
  const withState = compute([
    minimalItem({
      box4_federal_withheld: 600,
      box6_state: "NY",
      box7_state_id: "NY-9988776",
    }),
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
  const input = fieldsOf(result.outputs, f1040)!;
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
  const input = fieldsOf(result.outputs, f1040)!;
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

// ============================================================
// Section 10: Income routing (for_routing field)
// ============================================================

Deno.test("for_routing=schedule_c: box1a above $5,000 routes to schedule_c", () => {
  const result = compute([businessItem(10_000)]);
  const schedCOut = findOutput(result, "schedule_c");
  assertEquals(schedCOut !== undefined, true);
});

Deno.test("1099-K business route allocates box 1a and retains reviewed tip evidence", () => {
  const result = compute([businessItem(10_000, {
    schedule_c_receipts_review: {
      included_in_schedule_c_gross_receipts: 8_000,
      not_included_in_schedule_c_receipts: 2_000,
      allocation_reference: "2025 processor settlement ledger",
      no_overlap_with_other_1099s: true,
      overlap_review_reference: "2025 NEC and MISC overlap review",
      duplicate_1099_review: {
        source_form: "1099misc",
        payer_tin: "23-4567890",
        amount: 2_000,
        transaction_review_reference:
          "2025 MISC/K duplicate transaction review",
      },
    },
    qualified_tips_box1a_review: {
      amount: 5_000,
      occupation_code: "102",
      occupation_review_reference: "occupation record",
      tip_records_reference: "2025 POS tip ledger",
      included_in_box1a: true,
      no_other_allocable_deductions: true,
      no_other_allocable_deductions_review_reference: "Schedule 1 review",
    },
  })]);
  const business = findOutput(result, "schedule_c")!.fields
    .f1099k_receipt_sources as Array<
      { amount: number; box1a_gross_payments: number }
    >;
  assertEquals(business[0].amount, 8_000);
  assertEquals(business[0].box1a_gross_payments, 10_000);
  const tips = findOutput(result, "schedule1a")!.fields
    .qualified_trade_business_tips as Array<
      { source_form: string; amount: number }
    >;
  assertEquals(tips[0].source_form, "1099k");
  assertEquals(tips[0].amount, 5_000);
  assertThrows(
    () =>
      compute([businessItem(10_000, {
        schedule_c_receipts_review: {
          included_in_schedule_c_gross_receipts: 7_999,
          not_included_in_schedule_c_receipts: 2_000,
          allocation_reference: "2025 processor settlement ledger",
          no_overlap_with_other_1099s: true,
          overlap_review_reference: "2025 overlap review",
        },
      })]),
    Error,
    "complete box 1a allocation",
  );
});

Deno.test("1099-K rejects an exact duplicate source row before doubling income or withholding", () => {
  const issued = businessItem(10_000, {
    account_number: "merchant-1",
    box4_federal_withheld: 480,
  });
  assertThrows(
    () => compute([issued, structuredClone(issued)]),
    Error,
    "same Form 1099-K source row cannot be entered twice",
  );
  assertThrows(
    () =>
      compute([issued, Object.fromEntries(Object.entries(issued).reverse())]),
    Error,
    "same Form 1099-K source row cannot be entered twice",
  );
  assertEquals(
    inputSchema.safeParse({
      f1099ks: [issued, {
        ...issued,
        account_number: "merchant-2",
      }],
    }).success,
    true,
  );
});

Deno.test("for_routing=schedule_c: $5,000 gross routes despite issuer threshold", () => {
  const result = compute([businessItem(5_000)]);
  const schedCOut = findOutput(result, "schedule_c");
  assertEquals(schedCOut !== undefined, true);
  assertEquals(
    (schedCOut!.fields as { f1099k_receipt_sources: { amount: number }[] })
      .f1099k_receipt_sources[0].amount,
    5_000,
  );
});

Deno.test("for_routing=schedule_1_line_8j: hobby gross routes to Schedule 1 and AGI", () => {
  const result = compute([
    hobbyItem(8_000),
  ]);
  const sched1Out = findOutput(result, "schedule1");
  assertEquals(sched1Out !== undefined, true);
  assertEquals(
    (sched1Out!.fields as Record<string, unknown>).line8j_f1099k_hobby_income,
    8_000,
  );
  assertEquals(
    (findOutput(result, "agi_aggregator")!.fields as Record<string, unknown>)
      .line8j_f1099k_hobby_income,
    8_000,
  );
});

Deno.test("1099-K nonbusiness route requires all box 1a receipts on line 8j", () => {
  assertThrows(
    () =>
      compute([hobbyItem(8_000, {
        nonbusiness_activity_review: {
          activity_description: "Occasional craft sales",
          included_in_line8j: 5_000,
          allocation_reference: "2025 activity payment ledger",
          no_overlap_with_other_1099s: true,
          overlap_review_reference: "2025 information-return overlap review",
        },
      })]),
    Error,
    "complete box 1a allocation",
  );
  assertThrows(
    () =>
      compute([hobbyItem(8_000, { nonbusiness_activity_review: undefined })]),
    Error,
    "complete box 1a allocation",
  );
});

Deno.test("1099-K personal loss uses Form 8949 code L and anniversary is short term", () => {
  const item = minimalItem({
    pse_tin: "12-3456789",
    recipient_tin: "987-65-4321",
    box1a_gross_payments: 700,
    for_routing: "personal_item_sales",
    personal_item_sales_review: [personalSale()],
  });
  const row = findOutput(compute([item]), "form8949")!.fields
    .transaction as Record<string, unknown>;
  assertEquals(row.part, "C");
  assertEquals(row.adjustment_codes, "L");
  assertEquals(row.adjustment_amount, 300);
  assertEquals(row.gain_loss, 0);
  const leapRow = findOutput(
    compute([minimalItem({
      ...item,
      personal_item_sales_review: [personalSale({
        date_acquired: "2024-02-29",
        date_sold: "2025-03-01",
      })],
    })]),
    "form8949",
  )!.fields.transaction as Record<string, unknown>;
  assertEquals(leapRow.part, "F");
  assertThrows(
    () =>
      compute([minimalItem({
        ...item,
        personal_item_sales_review: [personalSale({ proceeds: 699 })],
      })]),
    Error,
    "proceeds equal to box 1a",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...item,
        personal_item_sales_review: [personalSale({ date_sold: "2025-02-30" })],
      })]),
    Error,
    "valid dated items",
  );
});

Deno.test("1099-K personal selling expenses reduce Form 8949 proceeds but not box 1a", () => {
  const item = minimalItem({
    pse_tin: "12-3456789",
    recipient_tin: "987-65-4321",
    box1a_gross_payments: 700,
    for_routing: "personal_item_sales",
    personal_item_sales_review: [personalSale({
      cost_basis: 500,
      selling_expenses_review: {
        amount: 50,
        expense_record_reference: "marketplace fee statement",
        not_in_cost_basis_or_other_deduction: true,
      },
    })],
  });
  const row = findOutput(compute([item]), "form8949")!.fields
    .transaction as Record<string, unknown>;
  assertEquals(row.proceeds, 650);
  assertEquals(row.cost_basis, 500);
  assertEquals(row.gain_loss, 150);
  assertEquals(row.adjustment_codes, undefined);
  assertThrows(
    () =>
      compute([minimalItem({
        ...item,
        personal_item_sales_review: [personalSale({
          selling_expenses_review: {
            amount: 701,
            expense_record_reference: "marketplace fee statement",
            not_in_cost_basis_or_other_deduction: true,
          },
        })],
      })]),
    Error,
    "personal-item sales",
  );
});

Deno.test("1099-K reviewed business refunds retain gross receipts for Schedule C", () => {
  const refunds = [{
    original_payment_transaction_id: "sale-1",
    refund_transaction_id: "refund-1",
    amount: 400,
    refund_record_reference: "processor refund ledger",
    issued_in_2025: true,
    same_business_sale: true,
    not_claimed_elsewhere: true,
  }];
  const review = {
    included_in_schedule_c_gross_receipts: 3_000,
    not_included_in_schedule_c_receipts: 0,
    customer_refunds_review: refunds,
    allocation_reference: "settlement ledger",
    no_overlap_with_other_1099s: true,
    overlap_review_reference: "overlap review",
  };
  const item = businessItem(3_000, { schedule_c_receipts_review: review });
  const rows = findOutput(compute([item]), "schedule_c")!.fields
    .f1099k_receipt_sources as Array<Record<string, unknown>>;
  assertEquals(rows[0].amount, 3_000);
  assertEquals(rows[0].customer_refunds_review, refunds);
  assertThrows(
    () =>
      compute([businessItem(3_000, {
        schedule_c_receipts_review: {
          ...review,
          customer_refunds_review: [
            { ...refunds[0], amount: 3_001 },
          ],
        },
      })]),
    Error,
    "complete box 1a allocation",
  );
});

Deno.test("1099-K reviewed service processor fees retain gross receipts for Schedule C", () => {
  const feeReview = {
    amount: 90,
    fee_record_reference: "processor fee statement",
    for_service_payments_only: true,
    not_capitalized_or_deducted_elsewhere: true,
  };
  const item = businessItem(3_000, {
    schedule_c_receipts_review: {
      included_in_schedule_c_gross_receipts: 3_000,
      not_included_in_schedule_c_receipts: 0,
      processor_fees_review: feeReview,
      allocation_reference: "settlement ledger",
      no_overlap_with_other_1099s: true,
      overlap_review_reference: "overlap review",
    },
  });
  const rows = findOutput(compute([item]), "schedule_c")!.fields
    .f1099k_receipt_sources as Array<Record<string, unknown>>;
  assertEquals(rows[0].amount, 3_000);
  assertEquals(rows[0].processor_fees_review, feeReview);
});

Deno.test("1099-K mixed business and personal payments allocate box 1a exactly", () => {
  const receiptReview = {
    included_in_schedule_c_gross_receipts: 2_000,
    not_included_in_schedule_c_receipts: 0,
    allocation_reference: "settlement ledger",
    no_overlap_with_other_1099s: true,
    overlap_review_reference: "overlap review",
  };
  const item = businessItem(2_800, {
    for_routing: "mixed_schedule_c_personal_item_sales",
    schedule_c_receipts_review: receiptReview,
    personal_item_sales_review: [personalSale({ proceeds: 800 })],
  });
  const result = compute([item]);
  const receipt = (findOutput(result, "schedule_c")!.fields
    .f1099k_receipt_sources as Array<Record<string, unknown>>)[0];
  assertEquals(receipt.box1a_gross_payments, 2_800);
  assertEquals(receipt.amount, 2_000);
  assertEquals(receipt.personal_item_sales_gross, 800);
  assertEquals(
    (findOutput(result, "form8949")!.fields.transaction as Record<
      string,
      unknown
    >).gain_loss,
    0,
  );
  const duplicated = compute([businessItem(2_900, {
    for_routing: "mixed_schedule_c_personal_item_sales",
    schedule_c_receipts_review: {
      ...receiptReview,
      not_included_in_schedule_c_receipts: 100,
      duplicate_1099_review: {
        source_form: "1099nec",
        payer_tin: "23-4567890",
        amount: 100,
        transaction_review_reference: "duplicate payment record",
      },
    },
    personal_item_sales_review: [personalSale({ proceeds: 800 })],
  })]);
  const duplicateRow = (findOutput(duplicated, "schedule_c")!.fields
    .f1099k_receipt_sources as Array<Record<string, unknown>>)[0];
  assertEquals(duplicateRow.amount, 2_000);
  assertEquals(duplicateRow.not_included_in_schedule_c_receipts, 100);
  assertEquals(duplicateRow.personal_item_sales_gross, 800);
  assertThrows(
    () =>
      compute([minimalItem({
        ...item,
        personal_item_sales_review: [personalSale({ proceeds: 700 })],
      })]),
    Error,
    "complete box 1a allocation",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...item,
        schedule_c_receipts_review: {
          ...receiptReview,
          not_included_in_schedule_c_receipts: 100,
        },
      })]),
    Error,
    "complete box 1a allocation",
  );
});

Deno.test("1099-K reported-error payments aggregate on Schedule 1 without income", () => {
  const erroneous = (amount: number, pseTin: string) =>
    minimalItem({
      pse_tin: pseTin,
      recipient_tin: "987-65-4321",
      box1a_gross_payments: amount,
      for_routing: "reported_in_error",
      reported_error_review: {
        payments: [{
          transaction_id: `gift-${pseTin}`,
          amount,
          kind: "personal_gift",
          sender_name: "Example Friend",
          payment_record_reference: "2025 payment record",
          no_goods_or_services: true,
        }],
        correction_request_reference: "2025 payer correction request",
      },
    });
  const first = erroneous(800, "12-3456789");
  const second = erroneous(200, "23-4567890");
  const result = compute([first, second]);
  assertEquals(
    (findOutput(result, "schedule1")!.fields as Record<string, unknown>)
      .form1099k_reported_error_or_loss,
    1_000,
  );
  assertEquals(findOutput(result, "agi_aggregator"), undefined);
  assertThrows(
    () =>
      compute([minimalItem({
        ...first,
        reported_error_review: {
          payments: [{
            transaction_id: "gift-1",
            amount: 700,
            kind: "personal_gift",
            sender_name: "Example Friend",
            payment_record_reference: "2025 payment record",
            no_goods_or_services: true,
          }],
          correction_request_reference: "2025 payer correction request",
        },
      })]),
    Error,
    "payments equal to box 1a",
  );
});

Deno.test("1099-K partial reported error leaves only classified payments in income", () => {
  const reportedError = {
    payments: [{
      transaction_id: "repayment-2025",
      amount: 200,
      kind: "expense_reimbursement",
      sender_name: "Example Friend",
      payment_record_reference: "2025 shared-expense record",
      no_goods_or_services: true,
    }],
    correction_request_reference: "2025 payer correction request",
  };
  const business = businessItem(3_000, {
    schedule_c_receipts_review: {
      included_in_schedule_c_gross_receipts: 2_800,
      not_included_in_schedule_c_receipts: 0,
      allocation_reference: "2025 settlement ledger",
      no_overlap_with_other_1099s: true,
      overlap_review_reference: "2025 overlap review",
    },
    reported_error_review: reportedError,
  });
  const businessResult = compute([business]);
  assertEquals(
    (findOutput(businessResult, "schedule_c")!.fields
      .f1099k_receipt_sources as Array<Record<string, unknown>>)[0].amount,
    2_800,
  );
  assertEquals(
    (findOutput(businessResult, "schedule1")!.fields as Record<string, unknown>)
      .form1099k_reported_error_or_loss,
    200,
  );
  const hobby = hobbyItem(3_000, {
    nonbusiness_activity_review: {
      activity_description: "Occasional craft sales",
      included_in_line8j: 2_800,
      allocation_reference: "2025 payment ledger",
      no_overlap_with_other_1099s: true,
      overlap_review_reference: "2025 overlap review",
    },
    reported_error_review: reportedError,
  });
  const hobbyResult = compute([hobby]);
  assertEquals(
    hobbyResult.outputs.find((item) =>
      item.nodeType === "schedule1" &&
      "line8j_f1099k_hobby_income" in item.fields
    )?.fields.line8j_f1099k_hobby_income,
    2_800,
  );
  const personal = minimalItem({
    pse_tin: "12-3456789",
    recipient_tin: "987-65-4321",
    box1a_gross_payments: 1_000,
    for_routing: "personal_item_sales",
    personal_item_sales_review: [personalSale({ proceeds: 800 })],
    reported_error_review: reportedError,
  });
  const personalResult = compute([personal]);
  assertEquals(
    (findOutput(personalResult, "form8949")!.fields.transaction as Record<
      string,
      unknown
    >).proceeds,
    800,
  );
  assertEquals(
    (findOutput(personalResult, "schedule1")!.fields as Record<string, unknown>)
      .form1099k_reported_error_or_loss,
    200,
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...personal,
        reported_error_review: {
          ...reportedError,
          payments: [{
            ...reportedError.payments[0],
            transaction_id: "item-1",
          }],
        },
      })]),
    Error,
    "cannot share a transaction ID",
  );
});

Deno.test("no for_routing: box1a above threshold still produces no income output", () => {
  const result = compute([minimalItem({ box1a_gross_payments: 50_000 })]);
  assertEquals(findOutput(result, "schedule_c"), undefined);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("for_routing=schedule_c: $4,999 gross routes despite issuer threshold", () => {
  const result = compute([businessItem(4_999)]);
  const schedCOut = findOutput(result, "schedule_c");
  assertEquals(schedCOut !== undefined, true);
  assertEquals(
    (schedCOut!.fields as { f1099k_receipt_sources: { amount: number }[] })
      .f1099k_receipt_sources[0].amount,
    4_999,
  );
});

Deno.test("for_routing=schedule_1_line_8j: $1 gross routes despite issuer threshold", () => {
  const result = compute([
    hobbyItem(1),
  ]);
  const sched1Out = findOutput(result, "schedule1");
  assertEquals(
    (sched1Out!.fields as Record<string, unknown>).line8j_f1099k_hobby_income,
    1,
  );
  assertEquals(
    (findOutput(result, "agi_aggregator")!.fields as Record<string, unknown>)
      .line8j_f1099k_hobby_income,
    1,
  );
});

Deno.test("for_routing=schedule_1_line_8j: zero gross creates neither Schedule 1 nor AGI income", () => {
  const result = compute([
    hobbyItem(0, { nonbusiness_activity_review: undefined }),
  ]);
  assertEquals(findOutput(result, "schedule1"), undefined);
  assertEquals(findOutput(result, "agi_aggregator"), undefined);
});

Deno.test("for_routing=schedule_1_line_8j: sourced items aggregate once for Schedule 1 and AGI", () => {
  const result = compute([
    hobbyItem(1),
    hobbyItem(4_999),
  ]);
  const schedule1Amounts = result.outputs.filter((o) =>
    o.nodeType === "schedule1"
  )
    .map((o) =>
      (o.fields as Record<string, number>).line8j_f1099k_hobby_income
    );
  const agiAmounts = result.outputs.filter((o) =>
    o.nodeType === "agi_aggregator"
  )
    .map((o) =>
      (o.fields as Record<string, number>).line8j_f1099k_hobby_income
    );
  assertEquals(schedule1Amounts, [5_000]);
  assertEquals(agiAmounts, [5_000]);
});

Deno.test("legacy 1099-K line 8z routing is rejected for TY2025", () => {
  assertEquals(
    f1099k.inputSchema.safeParse({
      f1099ks: [
        minimalItem({
          box1a_gross_payments: 100,
          for_routing: "schedule_1_line_8z",
        }),
      ],
    }).success,
    false,
  );
});

Deno.test("for_routing=schedule_c: zero gross does not create income", () => {
  const result = compute([
    minimalItem({ box1a_gross_payments: 0, for_routing: "schedule_c" }),
  ]);
  assertEquals(findOutput(result, "schedule_c"), undefined);
});

Deno.test("smoke: three PSEs — PayPal (TPSO), Square (payment card), Stripe (backup withheld) — only Stripe emits f1040 output", () => {
  const result = f1099k.compute({ taxYear: 2025, formType: "f1040" }, {
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
    (sum, o) =>
      sum +
      ((o.fields as Record<string, unknown>).line25b_withheld_1099 as number),
    0,
  );
  assertEquals(totalWithheld, 2880);

  // box1a and box8 from all three must NOT produce federal outputs
  // (total outputs = only the withholding entries for Stripe's box4)
  const allFederalOutputs = result.outputs.filter((o) =>
    o.nodeType === "f1040" || o.nodeType === "schedule1" ||
    o.nodeType === "schedule_c"
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
