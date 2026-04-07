import { assertEquals, assertAlmostEquals } from "@std/assert";
import { form8815 } from "./index.ts";
import { FilingStatus } from "../../../types.ts";

function compute(input: Record<string, unknown>) {
  return form8815.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Zero / no-op cases ───────────────────────────────────────────────────────

Deno.test("no bond interest — no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero bond interest — no exclusion", () => {
  const result = compute({
    ee_bond_interest: 0,
    qualified_expenses: 10_000,
    bond_proceeds: 15_000,
    modified_agi: 80_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("no qualified expenses — no exclusion", () => {
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 12_000,
    qualified_expenses: 0,
    modified_agi: 80_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Full exclusion (expenses >= proceeds) ────────────────────────────────────

Deno.test("full exclusion: expenses exceed proceeds — all interest excluded", () => {
  // $3k interest, proceeds $12k, expenses $15k → full exclusion = $3k
  const result = compute({
    ee_bond_interest: 3_000,
    bond_proceeds: 12_000,
    qualified_expenses: 15_000,
    modified_agi: 80_000,
    filing_status: FilingStatus.Single,
  });
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.ee_bond_exclusion, 3_000);
});

Deno.test("full exclusion: expenses exactly equal proceeds", () => {
  const result = compute({
    ee_bond_interest: 2_500,
    bond_proceeds: 10_000,
    qualified_expenses: 10_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  });
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.ee_bond_exclusion, 2_500);
});

// ─── Proportional exclusion (expenses < proceeds) ─────────────────────────────
// excluded = interest × (expenses / proceeds)

Deno.test("proportional exclusion: interest=$5k, edu_expenses=$4k, proceeds=$5k → excluded=$4k, taxable=$1k", () => {
  // interest=$5k, proceeds=$5k (all proceeds are interest, no principal)
  // expenses=$4k < proceeds=$5k → excluded = $5k × (4k/5k) = $4k
  const result = compute({
    ee_bond_interest: 5_000,
    bond_proceeds: 5_000,
    qualified_expenses: 4_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  });
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.ee_bond_exclusion, 4_000);
});

Deno.test("proportional exclusion: expenses 50% of proceeds → half interest excluded", () => {
  // Interest $2k, proceeds $10k, expenses $5k → excluded = $2k × (5k/10k) = $1k
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 10_000,
    qualified_expenses: 5_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  });
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.ee_bond_exclusion, 1_000);
});

Deno.test("proportional exclusion: expenses 75% of proceeds", () => {
  // Interest $4k, proceeds $20k, expenses $15k → excluded = $4k × (15k/20k) = $3k
  const result = compute({
    ee_bond_interest: 4_000,
    bond_proceeds: 20_000,
    qualified_expenses: 15_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.MFJ,
  });
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.ee_bond_exclusion, 3_000);
});

// ─── AGI phaseout — Single/HOH ($96,800–$111,800 TY2025) ─────────────────────

Deno.test("Single: below phaseout start ($96,800) — full exclusion", () => {
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 12_000,
    qualified_expenses: 15_000,
    modified_agi: 90_000,
    filing_status: FilingStatus.Single,
  });
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.ee_bond_exclusion, 2_000);
});

Deno.test("Single: exactly at phaseout start ($96,800) — full exclusion", () => {
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 12_000,
    qualified_expenses: 15_000,
    modified_agi: 96_800,
    filing_status: FilingStatus.Single,
  });
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.ee_bond_exclusion, 2_000);
});

Deno.test("Single: at phaseout midpoint ($104,300) — ~50% exclusion", () => {
  // Midpoint = (96,800 + 111,800) / 2 = 104,300 → ~50% of $2k = ~$1k
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 12_000,
    qualified_expenses: 15_000,
    modified_agi: 104_300,
    filing_status: FilingStatus.Single,
  });
  const sb = findOutput(result, "schedule_b");
  assertAlmostEquals(sb?.fields.ee_bond_exclusion as number, 1_000, 1);
});

Deno.test("Single: at phaseout end ($111,800) — zero exclusion", () => {
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 12_000,
    qualified_expenses: 15_000,
    modified_agi: 111_800,
    filing_status: FilingStatus.Single,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("Single: above phaseout end — zero exclusion", () => {
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 12_000,
    qualified_expenses: 15_000,
    modified_agi: 150_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── AGI phaseout — MFJ/QSS ($145,200–$175,200 TY2025) ──────────────────────

Deno.test("MFJ: below phaseout start ($145,200) — full exclusion", () => {
  const result = compute({
    ee_bond_interest: 3_000,
    bond_proceeds: 15_000,
    qualified_expenses: 20_000,
    modified_agi: 130_000,
    filing_status: FilingStatus.MFJ,
  });
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.ee_bond_exclusion, 3_000);
});

Deno.test("MFJ: at phaseout midpoint ($160,200) — ~50% exclusion", () => {
  // Midpoint = (145,200 + 175,200) / 2 = 160,200 → ~50% of $4k = ~$2k
  const result = compute({
    ee_bond_interest: 4_000,
    bond_proceeds: 20_000,
    qualified_expenses: 25_000,
    modified_agi: 160_200,
    filing_status: FilingStatus.MFJ,
  });
  const sb = findOutput(result, "schedule_b");
  assertAlmostEquals(sb?.fields.ee_bond_exclusion as number, 2_000, 1);
});

Deno.test("MFJ: above phaseout end ($175,200) — zero exclusion", () => {
  const result = compute({
    ee_bond_interest: 3_000,
    bond_proceeds: 15_000,
    qualified_expenses: 20_000,
    modified_agi: 180_000,
    filing_status: FilingStatus.MFJ,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── MFS ineligibility ────────────────────────────────────────────────────────

Deno.test("MFS: ineligible regardless of income or expenses", () => {
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 12_000,
    qualified_expenses: 15_000,
    modified_agi: 80_000,
    filing_status: FilingStatus.MFS,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Output routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule_b with exact ee_bond_exclusion field", () => {
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 12_000,
    qualified_expenses: 15_000,
    modified_agi: 80_000,
    filing_status: FilingStatus.Single,
  });
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.nodeType, "schedule_b");
  assertEquals(sb?.fields.ee_bond_exclusion, 2_000);
});
