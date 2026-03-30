import { assertEquals } from "@std/assert";
import { form8936 } from "./index.ts";
import { FilingStatus } from "../../types.ts";

function compute(input: Record<string, unknown>) {
  return form8936.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ─── New Vehicle Credit ───────────────────────────────────────────────────────

Deno.test("new vehicle — full $7,500 credit", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 45_000,
    vehicle_type: "other",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 7_500);
});

Deno.test("new vehicle — partial $3,750 credit", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 3_750,
    msrp: 45_000,
    vehicle_type: "other",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 3_750);
});

Deno.test("new vehicle — credit capped at $7,500 maximum", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 10_000,  // over max — should cap at $7,500
    msrp: 45_000,
    vehicle_type: "other",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 7_500);
});

// ─── Income Limits (New Vehicle) ─────────────────────────────────────────────

Deno.test("new vehicle — single exceeds $150k income limit → no credit", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 150_001,
    filing_status: FilingStatus.Single,
  });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("new vehicle — single at exactly $150k → no credit (exceeds)", () => {
  // IRS: income must be "not more than" the limit → at limit passes, over fails
  // $150,001 fails, $150,000 passes
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 150_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3 !== undefined, true);
});

Deno.test("new vehicle — MFJ exceeds $300k income limit → no credit", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 300_001,
    filing_status: FilingStatus.MFJ,
  });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("new vehicle — MFJ within $300k limit → credit allowed", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 250_000,
    filing_status: FilingStatus.MFJ,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 7_500);
});

Deno.test("new vehicle — HOH exceeds $225k limit → no credit", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 225_001,
    filing_status: FilingStatus.HOH,
  });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ─── MSRP Cap (New Vehicle) ───────────────────────────────────────────────────

Deno.test("new vehicle — other type exceeds $55k MSRP cap → no credit", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 55_001,
    vehicle_type: "other",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("new vehicle — SUV/van/truck allows up to $80k MSRP", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 75_000,
    vehicle_type: "suv_van_truck",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 7_500);
});

Deno.test("new vehicle — SUV exceeds $80k MSRP cap → no credit", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 80_001,
    vehicle_type: "suv_van_truck",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ─── Business Use Reduction (New Vehicle) ────────────────────────────────────

Deno.test("new vehicle — 50% business use → credit reduced by 50%", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 45_000,
    vehicle_type: "other",
    business_use_pct: 0.5,
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 3_750);
});

Deno.test("new vehicle — 100% business use → no personal credit", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 7_500,
    business_use_pct: 1.0,
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ─── Used Vehicle Credit ─────────────────────────────────────────────────────

Deno.test("used vehicle — 30% of price, max $4,000", () => {
  // $15,000 × 30% = $4,500, capped at $4,000
  const result = compute({
    is_new_vehicle: false,
    sale_price: 15_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 4_000);
});

Deno.test("used vehicle — price below $13,333: 30% is less than $4,000", () => {
  // $10,000 × 30% = $3,000
  const result = compute({
    is_new_vehicle: false,
    sale_price: 10_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 3_000);
});

Deno.test("used vehicle — price exceeds $25,000 → no credit", () => {
  const result = compute({
    is_new_vehicle: false,
    sale_price: 25_001,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("used vehicle — single exceeds $150k income limit → no credit", () => {
  const result = compute({
    is_new_vehicle: false,
    sale_price: 20_000,
    modified_agi: 151_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("used vehicle — business use reduces credit", () => {
  // $15,000 × 30% = $4,500 → capped $4,000 × 75% personal = $3,000
  const result = compute({
    is_new_vehicle: false,
    sale_price: 15_000,
    business_use_pct: 0.25,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line6d_clean_vehicle_credit, 3_000);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule3 line6d_clean_vehicle_credit", () => {
  const result = compute({
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3 !== undefined, true);
  assertEquals("line6d_clean_vehicle_credit" in (s3?.fields ?? {}), true);
});
