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
// New Vehicle Credit — up to $7,500 (IRC §30D)
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

Deno.test("f8936: new vehicle — partial $3,750 credit honored exactly", () => {
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

Deno.test("f8936: new vehicle — credit_amount above $7,500 capped at $7,500", () => {
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
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 7_500);
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

Deno.test("f8936: HOH at exactly $225k → credit allowed", () => {
  const s3 = findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 225_000,
    filing_status: FilingStatus.HOH,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 7_500);
});

// =============================================================================
// MSRP Caps
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

Deno.test("f8936: other type at exactly $55k MSRP → credit allowed", () => {
  const s3 = findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 55_000,
    vehicle_type: "other",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 7_500);
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

Deno.test("f8936: 50% business use reduces credit by 50%", () => {
  // $7,500 × 50% personal = $3,750
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

Deno.test("f8936: 100% business use → no personal credit (zero output)", () => {
  assertEquals(findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    business_use_pct: 1.0,
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3"), undefined);
});

Deno.test("f8936: 25% business use → 75% personal credit", () => {
  // $7,500 × 75% = $5,625
  const s3 = findOutput(compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 45_000,
    vehicle_type: "other",
    business_use_pct: 0.25,
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 5_625);
});

// =============================================================================
// Used Vehicle Credit — 30% of sale price, max $4,000 (IRC §25E)
// =============================================================================

Deno.test("f8936: used vehicle — 30% of price, capped at $4,000", () => {
  // $15,000 × 30% = $4,500 → capped at $4,000
  const s3 = findOutput(compute([{
    is_new_vehicle: false,
    sale_price: 15_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 4_000);
});

Deno.test("f8936: used vehicle — $10,000 price × 30% = $3,000 (under cap)", () => {
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

Deno.test("f8936: used vehicle — price at exactly $25,000 → credit allowed", () => {
  // $25,000 × 30% = $7,500 → capped at $4,000
  const s3 = findOutput(compute([{
    is_new_vehicle: false,
    sale_price: 25_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 4_000);
});

Deno.test("f8936: used vehicle — single exceeds $150k income → no credit", () => {
  assertEquals(findOutput(compute([{
    is_new_vehicle: false,
    sale_price: 20_000,
    modified_agi: 151_000,
    filing_status: FilingStatus.Single,
  }]), "schedule3"), undefined);
});

Deno.test("f8936: used vehicle — business use reduces personal credit", () => {
  // $15,000 × 30% = $4,500 → capped at $4,000 × 75% personal = $3,000
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
// Routing
// =============================================================================

Deno.test("f8936: credit routes to schedule3 line6d_clean_vehicle_credit", () => {
  const result = compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 45_000,
    vehicle_type: "other",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]);
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
  assertEquals(result.outputs[0]?.fields.line6d_clean_vehicle_credit, 7_500);
});

// =============================================================================
// Multiple Vehicles
// =============================================================================

Deno.test("f8936: two qualifying vehicles each produce a schedule3 output", () => {
  const result = compute([
    { is_new_vehicle: true, credit_amount: 7_500, msrp: 45_000, vehicle_type: "other", modified_agi: 100_000, filing_status: FilingStatus.Single },
    { is_new_vehicle: false, sale_price: 20_000, modified_agi: 50_000, filing_status: FilingStatus.Single },
  ]);
  assertEquals(result.outputs.length, 2);
  assertEquals(result.outputs[0].fields.line6d_clean_vehicle_credit, 7_500);
  assertEquals(result.outputs[1].fields.line6d_clean_vehicle_credit, 4_000);
});

Deno.test("f8936: vehicle over income limit excluded, qualifying vehicle retained", () => {
  const result = compute([
    { is_new_vehicle: true, credit_amount: 7_500, modified_agi: 200_000, filing_status: FilingStatus.Single },
    { is_new_vehicle: true, credit_amount: 7_500, msrp: 45_000, vehicle_type: "other", modified_agi: 100_000, filing_status: FilingStatus.Single },
  ]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].fields.line6d_clean_vehicle_credit, 7_500);
});
