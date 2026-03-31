import { assertEquals } from "@std/assert";
import { f8936 } from "./index.ts";
import { FilingStatus } from "../../types.ts";

function compute(items: Parameters<typeof f8936.compute>[1]["f8936s"]) {
  return f8936.compute({ taxYear: 2025 }, { f8936s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// Schema Validation
// =============================================================================

Deno.test("f8936: empty array produces no outputs", () => {
  assertEquals(compute([]).outputs.length, 0);
});

Deno.test("f8936: negative credit_amount rejected", () => {
  const parsed = f8936.inputSchema.safeParse({ f8936s: [{ credit_amount: -1 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f8936: business_use_pct > 1 rejected", () => {
  const parsed = f8936.inputSchema.safeParse({ f8936s: [{ business_use_pct: 1.5 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f8936: business_use_pct < 0 rejected", () => {
  const parsed = f8936.inputSchema.safeParse({ f8936s: [{ business_use_pct: -0.1 }] });
  assertEquals(parsed.success, false);
});

// =============================================================================
// New Vehicle Credit
// =============================================================================

Deno.test("f8936: new vehicle — full $7,500 credit", () => {
  const s3 = findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 45_000,
    vehicle_type: "other",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 7_500);
});

Deno.test("f8936: new vehicle — partial $3,750 credit", () => {
  const s3 = findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 3_750,
    msrp: 45_000,
    vehicle_type: "other",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 3_750);
});

Deno.test("f8936: new vehicle — credit capped at $7,500", () => {
  const s3 = findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 10_000,
    msrp: 45_000,
    vehicle_type: "other",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 7_500);
});

// =============================================================================
// Income Limits
// =============================================================================

Deno.test("f8936: single exceeds $150k → no credit", () => {
  assertEquals(findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 150_001,
    filing_status: FilingStatus.Single,
  }]), "schedule3"), undefined);
});

Deno.test("f8936: single at exactly $150k → credit allowed", () => {
  const s3 = findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 150_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3 !== undefined, true);
});

Deno.test("f8936: MFJ exceeds $300k → no credit", () => {
  assertEquals(findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 300_001,
    filing_status: FilingStatus.MFJ,
  }]), "schedule3"), undefined);
});

Deno.test("f8936: MFJ within $300k → credit allowed", () => {
  const s3 = findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 250_000,
    filing_status: FilingStatus.MFJ,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 7_500);
});

Deno.test("f8936: HOH exceeds $225k → no credit", () => {
  assertEquals(findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 225_001,
    filing_status: FilingStatus.HOH,
  }]), "schedule3"), undefined);
});

// =============================================================================
// MSRP Cap
// =============================================================================

Deno.test("f8936: other type exceeds $55k MSRP → no credit", () => {
  assertEquals(findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 55_001,
    vehicle_type: "other",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3"), undefined);
});

Deno.test("f8936: SUV/van/truck allows up to $80k MSRP", () => {
  const s3 = findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 75_000,
    vehicle_type: "suv_van_truck",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 7_500);
});

Deno.test("f8936: SUV exceeds $80k MSRP → no credit", () => {
  assertEquals(findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 80_001,
    vehicle_type: "suv_van_truck",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3"), undefined);
});

// =============================================================================
// Business Use Reduction
// =============================================================================

Deno.test("f8936: 50% business use → credit reduced by 50%", () => {
  const s3 = findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 45_000,
    vehicle_type: "other",
    business_use_pct: 0.5,
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 3_750);
});

Deno.test("f8936: 100% business use → no personal credit", () => {
  assertEquals(findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    business_use_pct: 1.0,
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3"), undefined);
});

// =============================================================================
// Used Vehicle Credit
// =============================================================================

Deno.test("f8936: used vehicle — 30% of price, max $4,000", () => {
  // $15,000 × 30% = $4,500, capped at $4,000
  const s3 = findOutput(compute([{
    is_new_vehicle: false,
    sale_price: 15_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 4_000);
});

Deno.test("f8936: used vehicle — price below $13,333: 30% is less than $4,000", () => {
  // $10,000 × 30% = $3,000
  const s3 = findOutput(compute([{
    is_new_vehicle: false,
    sale_price: 10_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 3_000);
});

Deno.test("f8936: used vehicle — price exceeds $25,000 → no credit", () => {
  assertEquals(findOutput(compute([{
    is_new_vehicle: false,
    sale_price: 25_001,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3"), undefined);
});

Deno.test("f8936: used vehicle — single exceeds $150k → no credit", () => {
  assertEquals(findOutput(compute([{
    is_new_vehicle: false,
    sale_price: 20_000,
    modified_agi: 151_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3"), undefined);
});

Deno.test("f8936: used vehicle — business use reduces credit", () => {
  // $15,000 × 30% = $4,500 → capped $4,000 × 75% personal = $3,000
  const s3 = findOutput(compute([{
    is_new_vehicle: false,
    sale_price: 15_000,
    business_use_pct: 0.25,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 3_000);
});

// =============================================================================
// Multiple Vehicles
// =============================================================================

Deno.test("f8936: two vehicles each produce a schedule3 output", () => {
  const result = compute([
    { is_new_vehicle: true, credit_amount: 7_500, msrp: 45_000, vehicle_type: "other", modified_agi: 100_000, filing_status: FilingStatus.Single },
    { is_new_vehicle: false, sale_price: 20_000, modified_agi: 50_000, filing_status: FilingStatus.Single },
  ]);
  assertEquals(result.outputs.length, 2);
  assertEquals(result.outputs[0].nodeType, "schedule3");
  assertEquals(result.outputs[1].nodeType, "schedule3");
});

Deno.test("f8936: vehicle over income limit produces no output", () => {
  const result = compute([
    { is_new_vehicle: true, credit_amount: 7_500, modified_agi: 200_000, filing_status: FilingStatus.Single },
  ]);
  assertEquals(result.outputs.length, 0);
});
