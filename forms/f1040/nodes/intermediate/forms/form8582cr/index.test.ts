import { assertEquals } from "@std/assert";
import { form8582cr, inputSchema } from "./index.ts";
import { FilingStatus } from "../../../types.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";

function compute(input: Record<string, unknown>) {
  return form8582cr.compute({ taxYear: 2025, formType: "f1040" }, inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Validation
// =============================================================================

Deno.test("form8582cr: valid minimal input passes", () => {
  compute({
    total_passive_credits: 1_000,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 8_000,
  });
});

Deno.test("form8582cr: negative total_passive_credits fails schema", () => {
  const parsed = inputSchema.safeParse({
    total_passive_credits: -500,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 8_000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("form8582cr: negative regular_tax_all_income fails schema", () => {
  const parsed = inputSchema.safeParse({
    total_passive_credits: 1_000,
    regular_tax_all_income: -1,
    regular_tax_without_passive: 0,
  });
  assertEquals(parsed.success, false);
});

Deno.test("form8582cr: negative regular_tax_without_passive fails schema", () => {
  const parsed = inputSchema.safeParse({
    total_passive_credits: 1_000,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: -1,
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Zero Inputs — No Output
// =============================================================================

Deno.test("form8582cr: zero passive credits → no output", () => {
  const result = compute({
    total_passive_credits: 0,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 8_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form8582cr: zero prior_unallowed and zero total_passive_credits → no output", () => {
  const result = compute({
    total_passive_credits: 0,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    prior_unallowed_credits: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Base Credit Calculation (Tax Attributable to Passive Income)
// =============================================================================

Deno.test("form8582cr: allowed credit = min(credits, tax_attributable_to_passive)", () => {
  // tax_attributable = 10000 - 7000 = 3000; credits = 2000; allowed = 2000
  const result = compute({
    total_passive_credits: 2_000,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 7_000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 2_000);
});

Deno.test("form8582cr: credits capped by tax attributable to passive", () => {
  // tax_attributable = 10000 - 9000 = 1000; credits = 5000; allowed = 1000
  const result = compute({
    total_passive_credits: 5_000,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1_000);
});

Deno.test("form8582cr: zero tax attributable → no base credit allowed", () => {
  // tax_attributable = 10000 - 10000 = 0; no special allowance → no output
  const result = compute({
    total_passive_credits: 3_000,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Prior Year Carryforward Credits
// =============================================================================

Deno.test("form8582cr: prior_unallowed_credits added to total available", () => {
  // credits_available = 1000 + 500 = 1500; tax_attributable = 2000; allowed = 1500
  const result = compute({
    total_passive_credits: 1_000,
    prior_unallowed_credits: 500,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 8_000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1_500);
});

// =============================================================================
// 5. Special Allowance — Rental Real Estate (Part II)
// =============================================================================

Deno.test("form8582cr: rental RE special allowance — MAGI below threshold → full allowance available", () => {
  // tax_attributable = 0 (no passive income), but special allowance applies
  // MAGI=80000 < 100000, active participation=true, rental_credits=3000
  // special_allowance = min(rental_credits, 25000) = 3000
  const result = compute({
    total_passive_credits: 3_000,
    rental_real_estate_credits: 3_000,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 80_000,
    has_active_rental_participation: true,
    filing_status: FilingStatus.Single,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 3_000);
});

Deno.test("form8582cr: rental RE special allowance — MAGI above upper threshold → no special allowance", () => {
  // MAGI=160000 > 150000, no special allowance
  const result = compute({
    total_passive_credits: 3_000,
    rental_real_estate_credits: 3_000,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 160_000,
    has_active_rental_participation: true,
    filing_status: FilingStatus.Single,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form8582cr: rental RE special allowance — MAGI in phase-out range", () => {
  // MAGI=120000; phase-out = 50% * (120000-100000) = 10000; allowance = 25000-10000 = 15000
  // rental_credits=3000 < 15000 → all 3000 allowed
  const result = compute({
    total_passive_credits: 3_000,
    rental_real_estate_credits: 3_000,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 120_000,
    has_active_rental_participation: true,
    filing_status: FilingStatus.Single,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 3_000);
});

Deno.test("form8582cr: rental RE special allowance — MAGI at lower threshold → full max", () => {
  // MAGI=100000, allowance = 25000; rental_credits=5000 < 25000 → 5000 allowed
  const result = compute({
    total_passive_credits: 5_000,
    rental_real_estate_credits: 5_000,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 100_000,
    has_active_rental_participation: true,
    filing_status: FilingStatus.Single,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 5_000);
});

// =============================================================================
// 6. MFS Ineligibility for Special Allowance
// =============================================================================

Deno.test("form8582cr: MFS filing status → no special allowance", () => {
  // MFS → ineligible for special allowance; tax_attributable = 0 → no output
  const result = compute({
    total_passive_credits: 3_000,
    rental_real_estate_credits: 3_000,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 50_000,
    has_active_rental_participation: true,
    filing_status: FilingStatus.MFS,
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 7. Real Estate Professional Bypass
// =============================================================================

Deno.test("form8582cr: real estate professional → credits not limited by passive rules (flow through)", () => {
  // RE professional: nonpassive, allowed = total_passive_credits directly
  const result = compute({
    total_passive_credits: 4_000,
    regular_tax_all_income: 20_000,
    regular_tax_without_passive: 15_000,
    is_real_estate_professional: true,
    filing_status: FilingStatus.Single,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 4_000);
});

// =============================================================================
// 8. Output Routing
// =============================================================================

Deno.test("form8582cr: allowed credit routes to schedule3.line6z_general_business_credit", () => {
  // tax_attributable = 15000 - 12000 = 3000; credits = 2000; allowed = 2000
  const result = compute({
    total_passive_credits: 2_000,
    regular_tax_all_income: 15_000,
    regular_tax_without_passive: 12_000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 2_000);
});

Deno.test("form8582cr: no credit allowed → no schedule3 output", () => {
  const result = compute({
    total_passive_credits: 2_000,
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
  });
  const out = findOutput(result, "schedule3");
  assertEquals(out, undefined);
});

// =============================================================================
// 9. Smoke Test
// =============================================================================

Deno.test("form8582cr: smoke test — active rental participation, MAGI at 125000", () => {
  // tax_attributable = 12000-10000 = 2000
  // MAGI=125000: special_allowance = 25000 - 50%*(125000-100000) = 25000-12500 = 12500
  // rental_credits=5000 < 12500 → special allowance for 5000
  // non-rental credits also limited by tax_attributable=2000 already counted
  // total_passive_credits=7000, base=min(7000,2000)=2000
  // special allowance brings additional 5000 (rental credits)
  // But since base already covers some credits, total allowed = min(7000, 2000+5000) = 7000
  const result = compute({
    total_passive_credits: 7_000,
    rental_real_estate_credits: 5_000,
    prior_unallowed_credits: 0,
    regular_tax_all_income: 12_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 125_000,
    has_active_rental_participation: true,
    filing_status: FilingStatus.MFJ,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 7_000);
});
