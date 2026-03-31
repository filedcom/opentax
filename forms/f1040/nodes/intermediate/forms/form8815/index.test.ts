import { assertEquals, assertAlmostEquals } from "@std/assert";
import { form8815 } from "./index.ts";
import { FilingStatus } from "../../types.ts";

function compute(input: Record<string, unknown>) {
  return form8815.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("no bond interest — no outputs", () => {
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

// ─── Full Exclusion (expenses >= proceeds) ────────────────────────────────────

Deno.test("full exclusion — expenses exceed proceeds", () => {
  // $3k interest, proceeds $12k, expenses $15k (expenses > proceeds → full exclusion)
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

Deno.test("full exclusion — expenses exactly equal proceeds", () => {
  // Expenses = proceeds → full exclusion
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

// ─── Proportional Exclusion (expenses < proceeds) ─────────────────────────────

Deno.test("proportional exclusion — expenses 50% of proceeds", () => {
  // Interest $2k, proceeds $10k, expenses $5k → exclude 50% = $1k
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

Deno.test("proportional exclusion — expenses 75% of proceeds", () => {
  // Interest $4k, proceeds $20k, expenses $15k → exclude 75% = $3k
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

// ─── AGI Phaseout — Single/HOH ($96,800–$111,800) ─────────────────────────────

Deno.test("Single — below phaseout start: full exclusion", () => {
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

Deno.test("Single — at phaseout start: full exclusion", () => {
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

Deno.test("Single — at phaseout midpoint (50%): half exclusion", () => {
  // Midpoint = ($96,800 + $111,800) / 2 = $104,300
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

Deno.test("Single — at phaseout end: zero exclusion", () => {
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 12_000,
    qualified_expenses: 15_000,
    modified_agi: 111_800,
    filing_status: FilingStatus.Single,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("Single — above phaseout end: zero exclusion", () => {
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 12_000,
    qualified_expenses: 15_000,
    modified_agi: 150_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── AGI Phaseout — MFJ ($145,200–$175,200) ──────────────────────────────────

Deno.test("MFJ — below phaseout: full exclusion", () => {
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

Deno.test("MFJ — above phaseout end: zero exclusion", () => {
  const result = compute({
    ee_bond_interest: 3_000,
    bond_proceeds: 15_000,
    qualified_expenses: 20_000,
    modified_agi: 180_000,
    filing_status: FilingStatus.MFJ,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── MFS Ineligibility ────────────────────────────────────────────────────────

Deno.test("MFS filing status — ineligible for exclusion", () => {
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 12_000,
    qualified_expenses: 15_000,
    modified_agi: 80_000,
    filing_status: FilingStatus.MFS,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule_b ee_bond_exclusion", () => {
  const result = compute({
    ee_bond_interest: 2_000,
    bond_proceeds: 12_000,
    qualified_expenses: 15_000,
    modified_agi: 80_000,
    filing_status: FilingStatus.Single,
  });
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.nodeType, "schedule_b");
  assertEquals("ee_bond_exclusion" in (sb?.fields ?? {}), true);
});
