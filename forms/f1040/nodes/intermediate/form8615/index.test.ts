import { assertEquals, assertAlmostEquals } from "@std/assert";
import { form8615 } from "./index.ts";
import { FilingStatus } from "../../types.ts";

function compute(input: Record<string, unknown>) {
  return form8615.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("no unearned income — no outputs", () => {
  const result = compute({
    net_unearned_income: 0,
    parent_taxable_income: 80_000,
    parent_filing_status: FilingStatus.MFJ,
    parent_tax: 9_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Threshold Tests ─────────────────────────────────────────────────────────

Deno.test("NUI at threshold ($2,600) — no taxable NUI, no outputs", () => {
  const result = compute({
    net_unearned_income: 2_600,
    parent_taxable_income: 80_000,
    parent_filing_status: FilingStatus.MFJ,
    parent_tax: 9_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("NUI below threshold ($2,599) — no outputs", () => {
  const result = compute({
    net_unearned_income: 2_599,
    parent_taxable_income: 80_000,
    parent_filing_status: FilingStatus.MFJ,
    parent_tax: 9_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("NUI just above threshold ($2,601) — kiddie tax applies", () => {
  const result = compute({
    net_unearned_income: 2_601,
    parent_taxable_income: 80_000,
    parent_filing_status: FilingStatus.MFJ,
    parent_tax: 9_000,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2 !== undefined, true);
  // Very small amount — just $1 above threshold × parent marginal rate
  const kiddieTax = s2?.fields.line17d_kiddie_tax as number;
  assertEquals(kiddieTax > 0, true);
});

// ─── Kiddie Tax Computation ───────────────────────────────────────────────────

Deno.test("kiddie tax — MFJ parent, $5k NUI", () => {
  // Taxable NUI = $5,000 - $2,600 = $2,400
  // Parent income $80,000 (MFJ, 12% bracket)
  // Tax on $82,400 = $2,385 + ($82,400 - $23,850) × 12% = $2,385 + $7,026 = $9,411
  // Parent tax on $80,000 = $2,385 + ($80,000 - $23,850) × 12% = $2,385 + $6,738 = $9,123
  // Kiddie tax = $9,411 - $9,123 = $288
  const result = compute({
    net_unearned_income: 5_000,
    parent_taxable_income: 80_000,
    parent_filing_status: FilingStatus.MFJ,
    parent_tax: 9_123,
  });
  const s2 = findOutput(result, "schedule2");
  assertAlmostEquals(s2?.fields.line17d_kiddie_tax as number, 288, 1);
});

Deno.test("kiddie tax — Single parent, $10k NUI", () => {
  // Taxable NUI = $10,000 - $2,600 = $7,400
  // Parent income $60,000 (Single, 22% bracket)
  // Combined = $67,400; tax = $5,578.50 + ($67,400 - $48,475) × 22% = $5,578.50 + $4,163.50 = $9,742
  // Parent tax on $60,000 = $5,578.50 + ($60,000 - $48,475) × 22% = $5,578.50 + $2,535.50 = $8,114
  // Kiddie tax ≈ $9,742 - $8,114 = $1,628
  const result = compute({
    net_unearned_income: 10_000,
    parent_taxable_income: 60_000,
    parent_filing_status: FilingStatus.Single,
    parent_tax: 8_114,
  });
  const s2 = findOutput(result, "schedule2");
  assertAlmostEquals(s2?.fields.line17d_kiddie_tax as number, 1_628, 1);
});

Deno.test("kiddie tax — MFS parent", () => {
  // MFS brackets same as single for lower income
  const result = compute({
    net_unearned_income: 5_000,
    parent_taxable_income: 40_000,
    parent_filing_status: FilingStatus.MFS,
    parent_tax: 4_500,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2 !== undefined, true);
  const kTax = s2?.fields.line17d_kiddie_tax as number;
  assertEquals(kTax > 0, true);
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

Deno.test("zero parent income — tax computed from zero base", () => {
  // Parent income = 0; taxable NUI = $5,000 - $2,600 = $2,400
  // Tax on $2,400 (MFJ, 10% bracket) = $240
  // Parent tax = $0
  // Kiddie tax = $240
  const result = compute({
    net_unearned_income: 5_000,
    parent_taxable_income: 0,
    parent_filing_status: FilingStatus.MFJ,
    parent_tax: 0,
  });
  const s2 = findOutput(result, "schedule2");
  assertAlmostEquals(s2?.fields.line17d_kiddie_tax as number, 240, 1);
});

Deno.test("very large NUI — kiddie tax computed at high bracket", () => {
  const result = compute({
    net_unearned_income: 200_000,
    parent_taxable_income: 400_000,
    parent_filing_status: FilingStatus.MFJ,
    parent_tax: 90_000,
  });
  const s2 = findOutput(result, "schedule2");
  const kTax = s2?.fields.line17d_kiddie_tax as number;
  assertEquals(kTax > 0, true);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule2 line17d_kiddie_tax", () => {
  const result = compute({
    net_unearned_income: 5_000,
    parent_taxable_income: 80_000,
    parent_filing_status: FilingStatus.MFJ,
    parent_tax: 9_123,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.nodeType, "schedule2");
  assertEquals("line17d_kiddie_tax" in (s2?.fields ?? {}), true);
});
