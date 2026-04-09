import { assertEquals } from "@std/assert";
import { f1099m, type itemSchema } from "./index.ts";
import type { z } from "zod";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import { scheduleC } from "../schedule_c/index.ts";
import { schedule_f } from "../../intermediate/forms/schedule_f/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    payer_name: "Test Payer",
    payer_tin: "123456789",
    recipient_tin: "987654321",
    ...overrides,
  };
}

function compute(items: z.infer<typeof itemSchema>[]) {
  return f1099m.compute({ taxYear: 2025, formType: "f1040" }, { f1099ms: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Input schema validation
// ---------------------------------------------------------------------------

Deno.test("f1099m.inputSchema: missing payer_name fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ payer_tin: "123456789", recipient_tin: "987654321" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: missing payer_tin fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ payer_name: "Test Payer", recipient_tin: "987654321" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: missing recipient_tin fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ payer_name: "Test Payer", payer_tin: "123456789" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: negative box1_rents fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box1_rents: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: negative box2_royalties fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box2_royalties: -500 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: negative box3_other_income fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box3_other_income: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: negative box4_federal_withheld fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box4_federal_withheld: -50 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: negative box5_fishing_boat fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box5_fishing_boat: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: negative box6_medical_payments fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box6_medical_payments: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: negative box8_substitute_payments fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box8_substitute_payments: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: negative box9_crop_insurance fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box9_crop_insurance: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: negative box10_attorney_proceeds fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box10_attorney_proceeds: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: negative box11_fish_purchased fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box11_fish_purchased: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: negative box15_nqdc fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box15_nqdc: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: invalid box1_rents_routing enum fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box1_rents: 1000, box1_rents_routing: "schedule_k" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: invalid box2_royalties_routing enum fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box2_royalties: 500, box2_royalties_routing: "schedule_d" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099m.inputSchema: minimal required fields (all optional boxes absent) passes validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [minimalItem()],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f1099m.inputSchema: empty m99s array passes validation", () => {
  const parsed = f1099m.inputSchema.safeParse({ f1099ms: [] });
  assertEquals(parsed.success, true);
});

// ---------------------------------------------------------------------------
// 2. Per-box routing (positive and zero cases)
// ---------------------------------------------------------------------------

// Box 1 — Rents → Schedule E (typical rental, default)
Deno.test("f1099m.compute: box1_rents routes to schedule_e rental_income (typical rental)", () => {
  const result = compute([minimalItem({ box1_rents: 12000 })]);
  assertEquals((findOutput(result, "schedule_e")!.fields as Record<string, unknown>).rental_income, 12000);
});

// Box 1 — Rents → Schedule C (substantial services)
Deno.test("f1099m.compute: box1_rents with schedule_c routing routes to schedule_c line1", () => {
  const result = compute([minimalItem({ box1_rents: 30000, box1_rents_routing: "schedule_c" })]);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.line1_gross_receipts, 30000);
});

// Box 1 — zero value produces no Schedule E output
Deno.test("f1099m.compute: box1_rents = 0 produces no schedule_e output", () => {
  const result = compute([minimalItem({ box1_rents: 0 })]);
  assertEquals(findOutput(result, "schedule_e"), undefined);
});

// Box 2 — Royalties → Schedule E (default, investment)
Deno.test("f1099m.compute: box2_royalties defaults to schedule_e royalty_income", () => {
  const result = compute([minimalItem({ box2_royalties: 5000 })]);
  assertEquals((findOutput(result, "schedule_e")!.fields as Record<string, unknown>).royalty_income, 5000);
});

// Box 2 — Royalties → Schedule C (trade/business)
Deno.test("f1099m.compute: box2_royalties with schedule_c routing routes to schedule_c line1", () => {
  const result = compute([minimalItem({ box2_royalties: 8000, box2_royalties_routing: "schedule_c" })]);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.line1_gross_receipts, 8000);
});

// Box 2 — zero value produces no Schedule E output
Deno.test("f1099m.compute: box2_royalties = 0 produces no royalty routing output", () => {
  const result = compute([minimalItem({ box2_royalties: 0 })]);
  assertEquals(findOutput(result, "schedule_e"), undefined);
});

// Box 3 — Other Income → Schedule 1 Line 8i (prizes/awards, default)
Deno.test("f1099m.compute: box3_other_income routes to schedule1 line8i_prizes_awards by default", () => {
  const result = compute([minimalItem({ box3_other_income: 500 })]);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8i_prizes_awards, 500);
});

// Box 3 — Other Income → Schedule 1 Line 8z (non-prize other income)
Deno.test("f1099m.compute: box3_other_income with other_income routing routes to schedule1 line8z with exact value", () => {
  const result = compute([minimalItem({ box3_other_income: 2000, box3_other_income_routing: "other_income" })]);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8z_other, 2000);
});

// Box 3 — zero value produces no schedule1 output
Deno.test("f1099m.compute: box3_other_income = 0 produces no schedule1 output for prizes", () => {
  const result = compute([minimalItem({ box3_other_income: 0 })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// Box 4 — Federal withholding → f1040 line25b
Deno.test("f1099m.compute: box4_federal_withheld routes to f1040 line25b_withheld_1099", () => {
  const result = compute([minimalItem({ box4_federal_withheld: 1000 })]);
  assertEquals(fieldsOf(result.outputs, f1040)!.line25b_withheld_1099, 1000);
});

// Box 4 — zero value produces no f1040 output
Deno.test("f1099m.compute: box4_federal_withheld = 0 produces no f1040 output", () => {
  const result = compute([minimalItem({ box4_federal_withheld: 0 })]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// Box 5 — Fishing boat proceeds → Schedule C
Deno.test("f1099m.compute: box5_fishing_boat routes to schedule_c line1_gross_receipts", () => {
  const result = compute([minimalItem({ box5_fishing_boat: 8000 })]);
  const out = findOutput(result, "schedule_c");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.line1_gross_receipts, 8000);
});

// Box 5 — zero value produces no Schedule C output
Deno.test("f1099m.compute: box5_fishing_boat = 0 produces no schedule_c output", () => {
  const result = compute([minimalItem({ box5_fishing_boat: 0 })]);
  assertEquals(findOutput(result, "schedule_c"), undefined);
});

// Box 6 — Medical payments → Schedule C
Deno.test("f1099m.compute: box6_medical_payments routes to schedule_c line1_gross_receipts", () => {
  const result = compute([minimalItem({ box6_medical_payments: 25000 })]);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.line1_gross_receipts, 25000);
});

// Box 6 — zero value produces no Schedule C output
Deno.test("f1099m.compute: box6_medical_payments = 0 produces no schedule_c output", () => {
  const result = compute([minimalItem({ box6_medical_payments: 0 })]);
  assertEquals(findOutput(result, "schedule_c"), undefined);
});

// Box 8 — Substitute payments → Schedule 1 Line 8z
Deno.test("f1099m.compute: box8_substitute_payments routes to schedule1 line8z_substitute_payments", () => {
  const result = compute([minimalItem({ box8_substitute_payments: 300 })]);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8z_substitute_payments, 300);
});

// Box 8 — zero value produces no schedule1 substitute_payments output
Deno.test("f1099m.compute: box8_substitute_payments = 0 produces no schedule1 output", () => {
  const result = compute([minimalItem({ box8_substitute_payments: 0 })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// Box 9 — Crop insurance → Schedule F
Deno.test("f1099m.compute: box9_crop_insurance routes to schedule_f crop_insurance", () => {
  const result = compute([minimalItem({ box9_crop_insurance: 7500 })]);
  assertEquals(fieldsOf(result.outputs, schedule_f)!.crop_insurance, 7500);
});

// Box 9 — zero value produces no Schedule F output
Deno.test("f1099m.compute: box9_crop_insurance = 0 produces no schedule_f output", () => {
  const result = compute([minimalItem({ box9_crop_insurance: 0 })]);
  assertEquals(findOutput(result, "schedule_f"), undefined);
});

// Box 10 — Attorney proceeds → Schedule 1 Line 8z (taxable, default)
Deno.test("f1099m.compute: box10_attorney_proceeds routes to schedule1 line8z_attorney_proceeds", () => {
  const result = compute([minimalItem({ box10_attorney_proceeds: 15000 })]);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8z_attorney_proceeds, 15000);
});

// Box 10 — zero value produces no schedule1 output
Deno.test("f1099m.compute: box10_attorney_proceeds = 0 produces no schedule1 output", () => {
  const result = compute([minimalItem({ box10_attorney_proceeds: 0 })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// Box 11 — Fish purchased → Schedule C
Deno.test("f1099m.compute: box11_fish_purchased routes to schedule_c line1_gross_receipts", () => {
  const result = compute([minimalItem({ box11_fish_purchased: 4000 })]);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.line1_gross_receipts, 4000);
});

// Box 11 — zero value produces no Schedule C output
Deno.test("f1099m.compute: box11_fish_purchased = 0 produces no schedule_c output", () => {
  const result = compute([minimalItem({ box11_fish_purchased: 0 })]);
  assertEquals(findOutput(result, "schedule_c"), undefined);
});

// Box 15 — NQDC § 409A failure → Schedule 1 Line 8z + Schedule 2 Line 17h (exact values)
Deno.test("f1099m.compute: box15_nqdc routes to schedule1 line8z_nqdc and schedule2 line17h at 20%", () => {
  const result = compute([minimalItem({ box15_nqdc: 50000 })]);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8z_nqdc, 50000);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17h_nqdc_tax, 10000);
});

// Box 15 — zero value produces no outputs
Deno.test("f1099m.compute: box15_nqdc = 0 produces no schedule1 or schedule2 outputs", () => {
  const result = compute([minimalItem({ box15_nqdc: 0 })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
  assertEquals(findOutput(result, "schedule2"), undefined);
});

// No boxes populated → no outputs
Deno.test("f1099m.compute: item with only required fields and no box values produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// Empty array → no outputs
Deno.test("f1099m.compute: empty m99s array produces no outputs", () => {
  const result = compute([]);
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 3. Aggregation — multiple items in one compute() call
// ---------------------------------------------------------------------------

Deno.test("f1099m.compute: box4_federal_withheld summed across multiple items", () => {
  const result = compute([
    minimalItem({ box4_federal_withheld: 1200, payer_name: "Payer A", payer_tin: "111111111" }),
    minimalItem({ box4_federal_withheld: 800, payer_name: "Payer B", payer_tin: "222222222" }),
    minimalItem({ box4_federal_withheld: 500, payer_name: "Payer C", payer_tin: "333333333" }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, f1040)!.line25b_withheld_1099, 2500);
});

Deno.test("f1099m.compute: box1_rents summed across multiple schedule_e items", () => {
  const result = compute([
    minimalItem({ box1_rents: 6000, payer_name: "Tenant A", payer_tin: "111111111" }),
    minimalItem({ box1_rents: 4000, payer_name: "Tenant B", payer_tin: "222222222" }),
  ]);
  const out = findOutput(result, "schedule_e");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).rental_income, 10000);
});

Deno.test("f1099m.compute: box15_nqdc 20% excise computed correctly for aggregated amount", () => {
  const result = compute([
    minimalItem({ box15_nqdc: 20000, payer_name: "CorpA", payer_tin: "111111111" }),
    minimalItem({ box15_nqdc: 30000, payer_name: "CorpB", payer_tin: "222222222" }),
  ]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
  // 20% of 50,000 = 10,000
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17h_nqdc_tax, 10000);
});

Deno.test("f1099m.compute: box3_other_income summed across multiple items to prizes line", () => {
  const result = compute([
    minimalItem({ box3_other_income: 1000, payer_name: "Contest A", payer_tin: "111111111" }),
    minimalItem({ box3_other_income: 2000, payer_name: "Contest B", payer_tin: "222222222" }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8i_prizes_awards, 3000);
});

// ---------------------------------------------------------------------------
// 4. Thresholds — the thresholds are payer reporting thresholds, not
//    recipient computation gates; amounts of any positive value are processed.
//    These tests verify amounts at and above known thresholds still route.
// ---------------------------------------------------------------------------

Deno.test("f1099m.compute: box1_rents at $600 threshold routes to schedule_e", () => {
  const result = compute([minimalItem({ box1_rents: 600 })]);
  assertEquals((findOutput(result, "schedule_e")!.fields as Record<string, unknown>).rental_income, 600);
});

Deno.test("f1099m.compute: box1_rents just below $600 (positive amount) still routes to schedule_e", () => {
  const result = compute([minimalItem({ box1_rents: 599 })]);
  assertEquals((findOutput(result, "schedule_e")!.fields as Record<string, unknown>).rental_income, 599);
});

Deno.test("f1099m.compute: box2_royalties at $10 threshold routes to schedule_e", () => {
  const result = compute([minimalItem({ box2_royalties: 10 })]);
  assertEquals((findOutput(result, "schedule_e")!.fields as Record<string, unknown>).royalty_income, 10);
});

Deno.test("f1099m.compute: box8_substitute_payments at $10 threshold routes to schedule1", () => {
  const result = compute([minimalItem({ box8_substitute_payments: 10 })]);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8z_substitute_payments, 10);
});

Deno.test("f1099m.compute: box5_fishing_boat at $600 threshold routes to schedule_c", () => {
  const result = compute([minimalItem({ box5_fishing_boat: 600 })]);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.line1_gross_receipts, 600);
});

Deno.test("f1099m.compute: box9_crop_insurance at $600 threshold routes to schedule_f", () => {
  const result = compute([minimalItem({ box9_crop_insurance: 600 })]);
  assertEquals(fieldsOf(result.outputs, schedule_f)!.crop_insurance, 600);
});

Deno.test("f1099m.compute: box15_nqdc 20% excise equals exactly 20% of amount", () => {
  const result = compute([minimalItem({ box15_nqdc: 10000 })]);
  // 20% of 10,000 = 2,000 (§409A excise rate)
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17h_nqdc_tax, 2000);
});

Deno.test("f1099m.compute: multiple schedule_c sources aggregate to single line1_gross_receipts", () => {
  // fishing boat $3000 + medical payments $7000 + fish purchased $2000 = $12000 total
  const result = compute([minimalItem({
    box5_fishing_boat: 3000,
    box6_medical_payments: 7000,
    box11_fish_purchased: 2000,
  })]);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.line1_gross_receipts, 12000);
});

// ---------------------------------------------------------------------------
// 5. Hard validation rules — box14_reserved must not accept a non-zero amount
// ---------------------------------------------------------------------------

Deno.test("f1099m.inputSchema or compute: box14 reserved field with non-zero value throws/fails", () => {
  // Box 14 is "Reserved for future use" in TY2025; payer used outdated form
  // Implementation should either reject this in schema or throw in compute
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), box14_reserved: 5000 }],
  });
  // Either schema rejects it, or it passes but should not route anywhere
  // If schema accepts it, verify compute does not route it
  if (parsed.success) {
    const result = f1099m.compute({ taxYear: 2025, formType: "f1040" }, parsed.data as Parameters<typeof f1099m.compute>[1]);
    // box14_reserved must not produce any tax output
    const hasBox14Output = result.outputs.some(
      (o) => JSON.stringify(o.fields).includes("box14") || JSON.stringify(o.fields).includes("golden_parachute"),
    );
    assertEquals(hasBox14Output, false);
  } else {
    // Schema rejects it — that is also acceptable behavior
    assertEquals(parsed.success, false);
  }
});

// ---------------------------------------------------------------------------
// 6. Warning-only rules — these must NOT throw
// ---------------------------------------------------------------------------

Deno.test("f1099m.compute: box9_crop_insurance with deferral election does not throw", () => {
  const result = f1099m.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099ms: [{ ...minimalItem(), box9_crop_insurance: 5000, box9_crop_insurance_deferred: true }],
  });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099m.compute: box10_attorney_proceeds with physical injury exclusion does not throw", () => {
  const result = f1099m.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099ms: [{ ...minimalItem(), box10_attorney_proceeds: 20000, box10_attorney_taxable: false }],
  });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099m.compute: box3_other_income with physical injury classification does not throw", () => {
  const result = f1099m.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099ms: [{ ...minimalItem(), box3_other_income: 10000, box3_other_income_routing: "excluded" }],
  });
  assertEquals(Array.isArray(result.outputs), true);
});

// ---------------------------------------------------------------------------
// 7. Informational fields — must NOT produce tax routing outputs
// ---------------------------------------------------------------------------

Deno.test("f1099m.compute: box7_direct_sales = true is informational — no additional output beyond base", () => {
  const withFlag = compute([minimalItem({ box7_direct_sales: true })]);
  const withoutFlag = compute([minimalItem()]);
  assertEquals(withFlag.outputs.length, withoutFlag.outputs.length);
});

Deno.test("f1099m.compute: box12_section_409a_deferrals is informational — no income output", () => {
  const withDeferral = compute([minimalItem({ box12_section_409a_deferrals: 25000 })]);
  const withoutDeferral = compute([minimalItem()]);
  assertEquals(withDeferral.outputs.length, withoutDeferral.outputs.length);
});

Deno.test("f1099m.compute: box13_fatca = true is informational — no additional output", () => {
  const withFatca = compute([minimalItem({ box13_fatca: true })]);
  const withoutFatca = compute([minimalItem()]);
  assertEquals(withFatca.outputs.length, withoutFatca.outputs.length);
});

Deno.test("f1099m.compute: box16_state_tax_withheld is state-only — no federal output", () => {
  const withState = compute([minimalItem({ box16_state_tax_withheld: 1000 })]);
  const withoutState = compute([minimalItem()]);
  assertEquals(withState.outputs.length, withoutState.outputs.length);
});

Deno.test("f1099m.compute: box18_state_income is state-only — no federal output", () => {
  const withState = compute([minimalItem({ box18_state_income: 50000 })]);
  const withoutState = compute([minimalItem()]);
  assertEquals(withState.outputs.length, withoutState.outputs.length);
});

// ---------------------------------------------------------------------------
// 8. Edge cases
// ---------------------------------------------------------------------------

// Box 9 — Deferral election: does NOT route to schedule_f
Deno.test("f1099m.compute: box9_crop_insurance with deferral election does not route to schedule_f", () => {
  const result = compute([
    minimalItem({ box9_crop_insurance: 7500, box9_crop_insurance_deferred: true }),
  ]);
  const out = findOutput(result, "schedule_f");
  const cropInc = out ? (out.fields as Record<string, unknown>).crop_insurance : undefined;
  // When deferred, the amount should NOT appear on schedule_f
  assertEquals(!cropInc, true);
});

// Box 10 — Physical injury exclusion: does NOT route to schedule1
Deno.test("f1099m.compute: box10_attorney_proceeds with physical injury exclusion does not route to schedule1", () => {
  const result = compute([
    minimalItem({ box10_attorney_proceeds: 20000, box10_attorney_taxable: false }),
  ]);
  const out = findOutput(result, "schedule1");
  const atty = out ? (out.fields as Record<string, unknown>).line8z_attorney_proceeds : undefined;
  assertEquals(!atty, true);
});

// Box 3 — Physical injury exclusion does not route
Deno.test("f1099m.compute: box3_other_income excluded (physical injury IRC §104) does not route to schedule1", () => {
  const result = compute([
    minimalItem({ box3_other_income: 10000, box3_other_income_routing: "excluded" }),
  ]);
  const out = findOutput(result, "schedule1");
  const prizes = out ? (out.fields as Record<string, unknown>).line8i_prizes_awards : undefined;
  const other = out ? (out.fields as Record<string, unknown>).line8z_other : undefined;
  assertEquals(!prizes && !other, true);
});

// Box 15 — NQDC produces BOTH ordinary income and excise tax simultaneously
Deno.test("f1099m.compute: box15_nqdc produces both schedule1 and schedule2 outputs", () => {
  const result = compute([minimalItem({ box15_nqdc: 40000 })]);
  const s1 = findOutput(result, "schedule1");
  const s2 = findOutput(result, "schedule2");
  assertEquals(s1 !== undefined, true);
  assertEquals(s2 !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8z_nqdc, 40000);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17h_nqdc_tax, 8000); // 20% of 40,000
});

// Multiple 1099-MISC instances: box4 always aggregated regardless of MFC
Deno.test("f1099m.compute: box4_federal_withheld aggregated across all instances (MFC ignored for withholding)", () => {
  const result = compute([
    minimalItem({ box4_federal_withheld: 2400, payer_name: "A", payer_tin: "111111111", multi_form_code: 1 }),
    minimalItem({ box4_federal_withheld: 1200, payer_name: "B", payer_tin: "222222222", multi_form_code: 2 }),
    minimalItem({ box4_federal_withheld: 600, payer_name: "C", payer_tin: "333333333", multi_form_code: 3 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, f1040)!.line25b_withheld_1099, 4200);
});

// Box 1 rents: omitting routing defaults to schedule_e (typical rental)
Deno.test("f1099m.compute: omitting box1_rents_routing defaults to schedule_e (typical rental)", () => {
  const result = compute([minimalItem({ box1_rents: 9600 })]);
  const schedE = findOutput(result, "schedule_e");
  const schedC = findOutput(result, "schedule_c");
  assertEquals(schedE !== undefined, true);
  // Should not also route to schedule_c for rents without substantial services flag
  const schedCRentalIncome = schedC ? (schedC.fields as Record<string, unknown>).line1_gross_receipts : undefined;
  assertEquals((schedE!.fields as Record<string, unknown>).rental_income, 9600);
  assertEquals(!schedCRentalIncome, true);
});

// Box 2 royalties: omitting routing defaults to schedule_e
Deno.test("f1099m.compute: omitting box2_royalties_routing defaults to schedule_e", () => {
  const result = compute([minimalItem({ box2_royalties: 2500 })]);
  const schedE = findOutput(result, "schedule_e");
  assertEquals(schedE !== undefined, true);
  assertEquals((schedE!.fields as Record<string, unknown>).royalty_income, 2500);
});

// payer_name longer than 40 chars fails schema
Deno.test("f1099m.inputSchema: payer_name longer than 40 chars fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ ...minimalItem(), payer_name: "A".repeat(41) }],
  });
  assertEquals(parsed.success, false);
});

// payer_tin not 9 digits fails schema
Deno.test("f1099m.inputSchema: payer_tin with non-9-digit format fails validation", () => {
  const parsed = f1099m.inputSchema.safeParse({
    f1099ms: [{ payer_name: "Test", payer_tin: "12-3456789", recipient_tin: "987654321" }],
  });
  assertEquals(parsed.success, false);
});

// ---------------------------------------------------------------------------
// 9. Smoke test — all major boxes populated
// ---------------------------------------------------------------------------

Deno.test("f1099m.compute: smoke test — all major income boxes populate correct downstream nodes", () => {
  const result = compute([
    {
      payer_name: "Mega Payer Inc",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      account_number: "ACC-001",
      box1_rents: 18000,
      box2_royalties: 3600,
      box3_other_income: 750,
      box4_federal_withheld: 2400,
      box5_fishing_boat: 5000,
      box6_medical_payments: 12000,
      box7_direct_sales: true,
      box8_substitute_payments: 250,
      box9_crop_insurance: 8000,
      box10_attorney_proceeds: 6000,
      box11_fish_purchased: 4500,
      box12_section_409a_deferrals: 10000, // informational only
      box13_fatca: false,
      box15_nqdc: 25000,
      box16_state_tax_withheld: 500,
      box18_state_income: 18000,
    },
  ]);

  // box1_rents → schedule_e (default: typical rental)
  const schedE = findOutput(result, "schedule_e");
  assertEquals(schedE !== undefined, true);
  assertEquals((schedE!.fields as Record<string, unknown>).rental_income, 18000);

  // box2_royalties → schedule_e (default: investment)
  const schedERoyalty = (schedE!.fields as Record<string, unknown>).royalty_income;
  assertEquals(schedERoyalty, 3600);

  // box3_other_income → schedule1 line8i (default: prizes)
  const sched1 = findOutput(result, "schedule1");
  assertEquals(sched1 !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8i_prizes_awards, 750);

  // box4_federal_withheld → f1040 line25b
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, f1040)!.line25b_withheld_1099, 2400);

  // box5_fishing_boat + box6_medical_payments + box11_fish_purchased → schedule_c
  const schedC = findOutput(result, "schedule_c");
  assertEquals(schedC !== undefined, true);
  // All three flow to schedule_c line1_gross_receipts (sum: 5000+12000+4500 = 21500)
  assertEquals(fieldsOf(result.outputs, scheduleC)!.line1_gross_receipts, 21500);

  // box8_substitute_payments → schedule1 line8z_substitute_payments
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8z_substitute_payments, 250);

  // box9_crop_insurance → schedule_f
  const schedF = findOutput(result, "schedule_f");
  assertEquals(schedF !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule_f)!.crop_insurance, 8000);

  // box10_attorney_proceeds → schedule1 line8z_attorney_proceeds
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8z_attorney_proceeds, 6000);

  // box15_nqdc → schedule1 line8z_nqdc + schedule2 line17h_nqdc_tax
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8z_nqdc, 25000);
  const sched2 = findOutput(result, "schedule2");
  assertEquals(sched2 !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17h_nqdc_tax, 5000); // 20% of 25,000

  // box12, box13, box7 produce no additional outputs (informational)
  // box16/18 produce no federal outputs (state-only)
});
