import { assertEquals } from "@std/assert";
import { ForeignAssetType, f8938 } from "./index.ts";

function compute(input: Parameters<typeof f8938.compute>[1]) {
  return f8938.compute({ taxYear: 2025, formType: "f1040" }, input);
}

// =============================================================================
// 1. Schema Validation
// =============================================================================

Deno.test("f8938: empty object is valid — all fields optional", () => {
  const parsed = f8938.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8938: negative max_value_all_assets rejected", () => {
  const parsed = f8938.inputSchema.safeParse({ max_value_all_assets: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f8938: negative year_end_value_all_assets rejected", () => {
  const parsed = f8938.inputSchema.safeParse({ year_end_value_all_assets: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("f8938: negative asset max_value_during_year rejected", () => {
  const parsed = f8938.inputSchema.safeParse({
    assets: [{ max_value_during_year: -1_000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8938: valid asset_type accepted", () => {
  const parsed = f8938.inputSchema.safeParse({
    assets: [{ asset_type: "bank_account" }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8938: invalid asset_type rejected", () => {
  const parsed = f8938.inputSchema.safeParse({
    assets: [{ asset_type: "real_estate" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8938: all ForeignAssetType enum values accepted", () => {
  const types = Object.values(ForeignAssetType);
  for (const t of types) {
    const parsed = f8938.inputSchema.safeParse({ assets: [{ asset_type: t }] });
    assertEquals(parsed.success, true, `asset_type "${t}" should be valid`);
  }
});

// =============================================================================
// 2. Outputs — always empty (disclosure only)
// =============================================================================

Deno.test("f8938: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8938: single US filer above threshold produces no outputs", () => {
  const result = compute({
    lives_abroad: false,
    filing_status: "single",
    max_value_all_assets: 80_000,
    year_end_value_all_assets: 55_000,
    assets: [
      {
        asset_type: ForeignAssetType.BankAccount,
        country: "CH",
        max_value_during_year: 80_000,
        year_end_value: 55_000,
        income_reported: true,
        income_reported_on: "Schedule B",
      },
    ],
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8938: MFJ abroad with multiple assets produces no outputs", () => {
  const result = compute({
    lives_abroad: true,
    filing_status: "mfj",
    max_value_all_assets: 500_000,
    year_end_value_all_assets: 450_000,
    has_pfic: true,
    foreign_tax_credit_claimed: true,
    assets: [
      { asset_type: ForeignAssetType.ForeignStock, country: "DE", year_end_value: 200_000 },
      { asset_type: ForeignAssetType.ForeignBond, country: "JP", year_end_value: 250_000 },
    ],
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Threshold boundary — schema accepts values on both sides (no computation)
// =============================================================================

Deno.test("f8938: single US filer below $50k threshold — schema accepts", () => {
  // year_end $49,999 < $50k single threshold — still valid to submit (informational)
  const parsed = f8938.inputSchema.safeParse({
    lives_abroad: false,
    filing_status: "single",
    year_end_value_all_assets: 49_999,
    max_value_all_assets: 49_999,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8938: single US filer at $50k threshold — schema accepts", () => {
  const parsed = f8938.inputSchema.safeParse({
    lives_abroad: false,
    filing_status: "single",
    year_end_value_all_assets: 50_000,
    max_value_all_assets: 50_000,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8938: MFJ US filer below $100k threshold — schema accepts", () => {
  const parsed = f8938.inputSchema.safeParse({
    lives_abroad: false,
    filing_status: "mfj",
    year_end_value_all_assets: 99_999,
    max_value_all_assets: 99_999,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8938: MFJ US filer at $100k threshold — schema accepts", () => {
  const parsed = f8938.inputSchema.safeParse({
    lives_abroad: false,
    filing_status: "mfj",
    year_end_value_all_assets: 100_000,
    max_value_all_assets: 100_000,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8938: single abroad below $200k threshold — schema accepts", () => {
  const parsed = f8938.inputSchema.safeParse({
    lives_abroad: true,
    filing_status: "single",
    year_end_value_all_assets: 199_999,
    max_value_all_assets: 199_999,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8938: MFJ abroad at $400k threshold — schema accepts", () => {
  const parsed = f8938.inputSchema.safeParse({
    lives_abroad: true,
    filing_status: "mfj",
    year_end_value_all_assets: 400_000,
    max_value_all_assets: 400_000,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8938: threshold inputs produce no outputs (disclosure node)", () => {
  // Regardless of threshold crossing, no tax output is ever emitted
  const resultBelow = compute({
    lives_abroad: false,
    filing_status: "single",
    year_end_value_all_assets: 49_999,
  });
  const resultAbove = compute({
    lives_abroad: false,
    filing_status: "single",
    year_end_value_all_assets: 50_001,
  });
  assertEquals(resultBelow.outputs.length, 0);
  assertEquals(resultAbove.outputs.length, 0);
});

// =============================================================================
// 4. Enum completeness
// =============================================================================

Deno.test("f8938: ForeignAssetType enum has 8 values", () => {
  assertEquals(Object.values(ForeignAssetType).length, 8);
});
