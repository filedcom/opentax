import { assertEquals, assertThrows } from "@std/assert";
import { schedule_r } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { FilingStatus } from "../../types.ts";

function compute(input: Record<string, unknown>) {
  return schedule_r.compute({ taxYear: 2025 }, input as Parameters<typeof schedule_r.compute>[0]);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("schedule_r.inputSchema: valid single/age 65+ passes", () => {
  const parsed = schedule_r.inputSchema.safeParse({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
  });
  assertEquals(parsed.success, true);
});

Deno.test("schedule_r.inputSchema: negative agi fails", () => {
  const parsed = schedule_r.inputSchema.safeParse({
    filing_status: FilingStatus.Single,
    agi: -1,
  });
  assertEquals(parsed.success, false);
});

Deno.test("schedule_r.inputSchema: negative nontaxable_ssa fails", () => {
  const parsed = schedule_r.inputSchema.safeParse({
    filing_status: FilingStatus.Single,
    nontaxable_ssa: -500,
  });
  assertEquals(parsed.success, false);
});

Deno.test("schedule_r.inputSchema: negative disability_income fails", () => {
  const parsed = schedule_r.inputSchema.safeParse({
    filing_status: FilingStatus.Single,
    taxpayer_disability_income: -100,
  });
  assertEquals(parsed.success, false);
});

Deno.test("schedule_r.inputSchema: invalid filing_status fails", () => {
  const parsed = schedule_r.inputSchema.safeParse({
    filing_status: "invalid_status",
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Qualifying Determination
// =============================================================================

Deno.test("schedule_r.compute: no qualifying condition — no output", () => {
  const result = compute({ filing_status: FilingStatus.Single });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule_r.compute: single age 65+ qualifies — produces schedule3 output", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
  });
  assertEquals(findOutput(result, "schedule3") !== undefined, true);
});

Deno.test("schedule_r.compute: single disabled qualifies — produces schedule3 output", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_disabled: true,
    taxpayer_disability_income: 5000,
  });
  assertEquals(findOutput(result, "schedule3") !== undefined, true);
});

Deno.test("schedule_r.compute: MFJ neither spouse qualifies — no output", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule_r.compute: MFJ one spouse 65+ — produces output with $5000 base", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxpayer_age_65_or_older: true,
    agi: 0,
  });
  assertEquals(findOutput(result, "schedule3") !== undefined, true);
});

Deno.test("schedule_r.compute: MFJ both spouses 65+ — produces output with $7500 base", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxpayer_age_65_or_older: true,
    spouse_age_65_or_older: true,
    agi: 0,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  // 7500 * 15% = 1125
  assertEquals(fields.line6d_elderly_disabled_credit, 1125);
});

// =============================================================================
// 3. Base Amount by Filing Status
// =============================================================================

Deno.test("schedule_r.compute: single 65+ zero AGI — credit = 5000 * 15% = 750", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
    agi: 0,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6d_elderly_disabled_credit, 750);
});

Deno.test("schedule_r.compute: MFS disabled zero AGI — credit = 3750 * 15% = 562.5", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    taxpayer_disabled: true,
    taxpayer_disability_income: 5000,
    agi: 0,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6d_elderly_disabled_credit, 562.5);
});

// =============================================================================
// 4. AGI Phaseout
// =============================================================================

Deno.test("schedule_r.compute: single 65+ AGI below threshold — full amount", () => {
  // Single threshold $7,500. AGI $7,000. No reduction.
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
    agi: 7000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6d_elderly_disabled_credit, 750); // 5000 * 15%
});

Deno.test("schedule_r.compute: single 65+ AGI at threshold $7500 — no reduction", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
    agi: 7500,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6d_elderly_disabled_credit, 750);
});

Deno.test("schedule_r.compute: single 65+ AGI $9500 — AGI exceeds threshold by $2000, reduction $1000, amount = 4000", () => {
  // $9500 - $7500 = $2000 excess; $2000 * 0.5 = $1000 reduction; $5000 - $1000 = $4000 * 15% = $600
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
    agi: 9500,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6d_elderly_disabled_credit, 600);
});

Deno.test("schedule_r.compute: single 65+ AGI $17500 — AGI exceeds threshold by $10000, reduction $5000, credit = 0", () => {
  // $17500 - $7500 = $10000 excess; $10000 * 0.5 = $5000 reduction; $5000 - $5000 = $0
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
    agi: 17500,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule_r.compute: MFJ one 65+ AGI $12000 — reduction $1000, amount = $4000 * 15%", () => {
  // MFJ threshold $10000. $12000 - $10000 = $2000 excess; * 0.5 = $1000 reduction; $5000 - $1000 = $4000
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxpayer_age_65_or_older: true,
    agi: 12000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6d_elderly_disabled_credit, 600);
});

// =============================================================================
// 5. Nontaxable Benefits Reduction
// =============================================================================

Deno.test("schedule_r.compute: nontaxable SSA reduces initial amount", () => {
  // Single 65+: $5000 - $1000 SSA = $4000; no AGI excess; $4000 * 15% = $600
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
    agi: 0,
    nontaxable_ssa: 1000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6d_elderly_disabled_credit, 600);
});

Deno.test("schedule_r.compute: nontaxable_va reduces initial amount", () => {
  // Single 65+: $5000 - $2000 VA = $3000; $3000 * 15% = $450
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
    agi: 0,
    nontaxable_va: 2000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6d_elderly_disabled_credit, 450);
});

Deno.test("schedule_r.compute: nontaxable benefits exceed initial amount — no credit", () => {
  // Single 65+: $5000 - $6000 SSA = $0
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
    agi: 0,
    nontaxable_ssa: 6000,
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Disability Income Cap (Part II of Schedule R)
// =============================================================================

Deno.test("schedule_r.compute: disabled under 65 — initial amount capped by disability income", () => {
  // Single disabled: base $5000, disability income $3000 → capped at $3000; $3000 * 15% = $450
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_disabled: true,
    taxpayer_disability_income: 3000,
    agi: 0,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6d_elderly_disabled_credit, 450);
});

Deno.test("schedule_r.compute: disabled under 65 — disability income exceeds base, no cap", () => {
  // disability income $6000 > base $5000 → not capped
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_disabled: true,
    taxpayer_disability_income: 6000,
    agi: 0,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6d_elderly_disabled_credit, 750); // 5000 * 15%
});

Deno.test("schedule_r.compute: age 65+ with disability income — no cap applied (age 65+ not disability-capped)", () => {
  // Age 65+ is NOT subject to disability income cap — uses full $5000 base
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
    taxpayer_disabled: true,
    taxpayer_disability_income: 1000,
    agi: 0,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6d_elderly_disabled_credit, 750); // 5000 * 15%
});

// =============================================================================
// 7. Zero Credit Edge Cases
// =============================================================================

Deno.test("schedule_r.compute: credit of exactly zero — no output", () => {
  // Single 65+, AGI $17500 → $5000 - $5000 phaseout = $0
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
    agi: 17500,
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("schedule_r.compute: smoke test — MFJ both 65+ with SSA and AGI phaseout", () => {
  // MFJ both 65+: base $7500
  // SSA: -$2000 → $5500
  // AGI: $12000 - $10000 threshold = $2000 excess → -$1000 → $4500
  // Credit: $4500 * 15% = $675
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxpayer_age_65_or_older: true,
    spouse_age_65_or_older: true,
    agi: 12000,
    nontaxable_ssa: 2000,
  });

  assertEquals(findOutput(result, "schedule3") !== undefined, true);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6d_elderly_disabled_credit, 675);
});
